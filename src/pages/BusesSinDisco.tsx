import { useState, useMemo } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bus, HardDrive, Search, AlertTriangle, Loader2, RotateCcw, Check, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
    invalidateFleetCache, normalizePpu, quitarDeSinDisco, marcarSinDisco,
    SIN_DISCO_MENSAJE, type FlotaRow,
} from "@/lib/fleet";

// ============================================================================
// Buses sin disco duro.
//
// La marca vive en dos sitios: la ficha del padrón (`tiene_disco = false`) y
// los reportes históricos de `bus_failures`. El cruce considera ambos, así que
// la pantalla también: una sola lista con el origen de cada marca. Verlos por
// separado hacía imposible entender por qué un bus seguía apareciendo después
// de corregir su ficha.
// ============================================================================

interface BusSinDisco {
    ppu: string;
    interno: string | null;
    terminal: string | null;
    enPadron: boolean;
    marcadoEnPadron: boolean;
    marcadoPorReporte: boolean;
    notas: string | null;
}

export default function BusesSinDisco() {
    const queryClient = useQueryClient();
    const [busqueda, setBusqueda] = useState("");
    const [nuevaPpu, setNuevaPpu] = useState("");

    const { data: padron, isLoading: cargandoPadron, error: errorPadron } = useQuery({
        queryKey: ["padron_sin_disco"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("padron_flota")
                .select("*")
                .eq("tiene_disco", false);
            if (error) throw error;
            return data as FlotaRow[];
        },
    });

    const { data: reportes, isLoading: cargandoReportes } = useQuery({
        queryKey: ["reportes_sin_disco"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bus_failures")
                .select("ppu, notes, created_at")
                .eq("failure_type", "bus_sin_disco")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return (data || []) as { ppu: string; notes: string | null; created_at: string }[];
        },
    });

    const { data: fichas } = useQuery({
        queryKey: ["fichas_reportadas", (reportes || []).map((r) => r.ppu).join(",")],
        enabled: Boolean(reportes && reportes.length > 0),
        queryFn: async () => {
            const ppus = Array.from(new Set((reportes || []).map((r) => normalizePpu(r.ppu))));
            const { data, error } = await supabase
                .from("padron_flota")
                .select("*")
                .in("ppu", ppus);
            if (error) throw error;
            return data as FlotaRow[];
        },
    });

    const { data: totalFlota } = useQuery({
        queryKey: ["padron_total"],
        queryFn: async () => {
            const { count, error } = await supabase
                .from("padron_flota")
                .select("id", { count: "exact", head: true });
            if (error) throw error;
            return count ?? 0;
        },
    });

    // Una sola lista: el mismo bus puede estar marcado por las dos vías.
    const buses = useMemo<BusSinDisco[]>(() => {
        const mapa = new Map<string, BusSinDisco>();
        const fichaDe = new Map((fichas || []).map((f) => [f.ppu, f]));

        for (const bus of padron || []) {
            mapa.set(bus.ppu, {
                ppu: bus.ppu,
                interno: bus.interno ?? null,
                terminal: bus.terminal ?? null,
                enPadron: true,
                marcadoEnPadron: true,
                marcadoPorReporte: false,
                notas: bus.notas ?? null,
            });
        }

        for (const r of reportes || []) {
            const ppu = normalizePpu(r.ppu);
            const existente = mapa.get(ppu);
            if (existente) {
                existente.marcadoPorReporte = true;
                continue;
            }
            const ficha = fichaDe.get(ppu);
            mapa.set(ppu, {
                ppu,
                interno: ficha?.interno ?? null,
                terminal: ficha?.terminal ?? null,
                enPadron: Boolean(ficha),
                marcadoEnPadron: false,
                marcadoPorReporte: true,
                notas: r.notes ?? null,
            });
        }

        return Array.from(mapa.values()).sort((a, b) =>
            (a.interno || "zzz").localeCompare(b.interno || "zzz") || a.ppu.localeCompare(b.ppu)
        );
    }, [padron, reportes, fichas]);

    const refrescar = () => {
        invalidateFleetCache();
        for (const k of ["padron_sin_disco", "reportes_sin_disco", "fichas_reportadas", "padron_total"]) {
            queryClient.invalidateQueries({ queryKey: [k] });
        }
    };

    const quitar = useMutation({
        mutationFn: async (ppu: string) => quitarDeSinDisco(ppu),
        onSuccess: (r) => {
            refrescar();
            if (r.errores.length > 0) {
                toast.error(`${r.ppu}: ${r.errores.join(" · ")}`, { duration: 12000 });
                return;
            }
            const hechos: string[] = [];
            if (r.padronActualizado) hechos.push("ficha del padrón corregida");
            if (r.reportesEliminados > 0) hechos.push(`${r.reportesEliminados} reporte(s) eliminado(s)`);
            toast.success(
                hechos.length > 0
                    ? `${r.ppu} ya no figura sin disco: ${hechos.join(" y ")}.`
                    : `${r.ppu} no estaba marcado en ninguna fuente.`,
                { duration: 8000 }
            );
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const marcar = useMutation({
        mutationFn: async (ppu: string) => marcarSinDisco(ppu),
        onSuccess: (bus) => {
            refrescar();
            setNuevaPpu("");
            toast.success(`${bus.ppu} marcado sin disco. Sus solicitudes se responderán de inmediato.`);
        },
        onError: (e: Error) => toast.error(e.message),
    });

    const filtrados = buses.filter((b) => {
        const q = busqueda.trim().toLowerCase();
        if (!q) return true;
        return (
            b.ppu.toLowerCase().includes(q) ||
            (b.interno || "").toLowerCase().includes(q) ||
            (b.terminal || "").toLowerCase().includes(q)
        );
    });

    const cargando = cargandoPadron || cargandoReportes;
    const padronVacio = !cargando && !errorPadron && (totalFlota ?? 0) === 0;
    const conDudas = buses.filter((b) => !b.enPadron).length;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Buses Sin Disco Duro</h1>
                    <p className="text-slate-500">
                        Estos buses no tienen grabación posible. Sus solicitudes se responden
                        automáticamente con el aviso «{SIN_DISCO_MENSAJE}».
                    </p>
                </div>
                <button
                    onClick={refrescar}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
                >
                    <RotateCcw className="h-4 w-4" />
                    Refrescar
                </button>
            </div>

            {/* Resumen */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-red-600">Sin disco</p>
                    <p className="mt-1 text-3xl font-bold text-red-700">{cargando ? "—" : buses.length}</p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total en padrón</p>
                    <p className="mt-1 text-3xl font-bold text-slate-800">{totalFlota ?? "—"}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Con disco</p>
                    <p className="mt-1 text-3xl font-bold text-emerald-700">
                        {totalFlota != null && !cargando
                            ? totalFlota - buses.filter((b) => b.enPadron).length
                            : "—"}
                    </p>
                </div>
            </div>

            {errorPadron && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                    No se pudo leer el padrón de flota. Verifica que la tabla{" "}
                    <code className="font-mono">padron_flota</code> exista.
                </div>
            )}

            {padronVacio && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        El padrón de flota está vacío. Mientras no se cargue, la app no puede
                        distinguir un bus propio de uno ajeno.
                    </span>
                </div>
            )}

            {conDudas > 0 && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        <strong>{conDudas}</strong> bus(es) están marcados por un reporte pero no
                        figuran en el padrón. Conviene revisarlos: puede tratarse de patentes
                        antiguas o mal escritas.
                    </span>
                </div>
            )}

            {/* Marcar un bus */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-1 font-semibold text-slate-800">Marcar un bus sin disco</h3>
                <p className="mb-3 text-xs text-slate-500">
                    Actualiza la ficha del bus en el padrón. El bus ya debe existir ahí.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                        placeholder="PPU (ej: LXWP77 o LXWP-77)"
                        value={nuevaPpu}
                        onChange={(e) => setNuevaPpu(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && nuevaPpu && marcar.mutate(nuevaPpu)}
                        className="flex-1 rounded-lg border border-slate-300 p-2 uppercase"
                        maxLength={10}
                    />
                    <button
                        onClick={() => marcar.mutate(nuevaPpu)}
                        disabled={!nuevaPpu || marcar.isPending}
                        className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                        {marcar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <HardDrive className="h-4 w-4" />}
                        Marcar sin disco
                    </button>
                </div>
            </div>

            {/* Listado unificado */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex gap-4 border-b border-slate-100 bg-slate-50/50 p-4">
                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-indigo-500"
                            placeholder="Buscar por PPU, interno o terminal..."
                            value={busqueda}
                            onChange={(e) => setBusqueda(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 font-medium text-slate-500">
                            <tr>
                                <th className="px-6 py-3">PPU</th>
                                <th className="px-6 py-3">Interno</th>
                                <th className="px-6 py-3">Terminal</th>
                                <th className="px-6 py-3">Marcado por</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {cargando ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                            ) : filtrados.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                        {busqueda
                                            ? "Ningún bus coincide con la búsqueda."
                                            : "Ningún bus está marcado sin disco duro."}
                                    </td>
                                </tr>
                            ) : (
                                filtrados.map((bus) => (
                                    <tr key={bus.ppu} className="transition-colors hover:bg-slate-50/50">
                                        <td className="px-6 py-3">
                                            <span className="flex items-center gap-2 font-mono font-medium text-slate-900">
                                                <Bus className="h-4 w-4 text-slate-400" />
                                                {bus.ppu}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-slate-600">{bus.interno || "—"}</td>
                                        <td className="px-6 py-3 text-slate-500">{bus.terminal || "—"}</td>
                                        <td className="px-6 py-3">
                                            {/* Ver el origen es lo que permite entender por qué un
                                                bus sigue apareciendo tras corregir su ficha. */}
                                            <div className="flex flex-wrap gap-1">
                                                {bus.marcadoEnPadron && (
                                                    <span className="rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                                                        Padrón
                                                    </span>
                                                )}
                                                {bus.marcadoPorReporte && (
                                                    <span className="rounded-full border border-amber-300 bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-800">
                                                        Reporte
                                                    </span>
                                                )}
                                                {!bus.enPadron && (
                                                    <span
                                                        className="rounded-full border border-slate-300 bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                                                        title="Esta patente no está en el padrón de flota"
                                                    >
                                                        Fuera del padrón
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button
                                                onClick={() => {
                                                    const fuentes = [
                                                        bus.marcadoEnPadron && "la ficha del padrón",
                                                        bus.marcadoPorReporte && "los reportes registrados",
                                                    ].filter(Boolean).join(" y ");
                                                    if (
                                                        confirm(
                                                            `¿Quitar ${bus.ppu} de la lista de buses sin disco?\n\n` +
                                                            `Se corregirá ${fuentes}. A partir de ahora sus solicitudes ` +
                                                            `volverán a pedir la extracción del video normalmente.`
                                                        )
                                                    ) {
                                                        quitar.mutate(bus.ppu);
                                                    }
                                                }}
                                                disabled={quitar.isPending}
                                                className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 px-3 py-1.5 text-xs font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
                                                title="Este bus sí tiene disco: quitarlo de la lista"
                                            >
                                                {quitar.isPending && quitar.variables === bus.ppu ? (
                                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                                ) : (
                                                    <Check className="h-3.5 w-3.5" />
                                                )}
                                                Sí tiene disco
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {filtrados.length > 0 && (
                    <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50/50 px-6 py-3 text-xs text-slate-500">
                        <Trash2 className="h-3.5 w-3.5" />
                        «Sí tiene disco» corrige la ficha del padrón y elimina los reportes de esa
                        patente, que son las dos fuentes que consulta el sistema.
                    </div>
                )}
            </div>
        </div>
    );
}
