import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Bus, HardDrive, Search, AlertTriangle, Loader2, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { invalidateFleetCache, normalizePpu, SIN_DISCO_MENSAJE, type FlotaRow } from "@/lib/fleet";

// ============================================================================
// Buses sin disco duro.
//
// Esta pantalla NO registra nada nuevo: muestra los buses del padrón que no
// tienen disco instalado. Antes cada solicitud insertaba una fila en
// `bus_failures`, de modo que un mismo bus aparecía tantas veces como casos
// tuviera. El inventario de discos es un atributo del bus, no un historial de
// eventos, así que vive en una sola fila del padrón.
// ============================================================================

export default function BusesSinDisco() {
    const queryClient = useQueryClient();
    const [searchTerm, setSearchTerm] = useState("");
    const [nuevaPpu, setNuevaPpu] = useState("");

    const { data: buses, isLoading, error } = useQuery({
        queryKey: ["padron_sin_disco"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("padron_flota")
                .select("*")
                .eq("tiene_disco", false)
                .order("interno", { ascending: true });
            if (error) throw error;
            return data as FlotaRow[];
        },
    });

    // Reportes antiguos de `bus_failures`. Siguen alertando aunque el padrón no
    // los refleje todavía, así que tienen que verse aquí: si no, la pantalla
    // mostraría menos buses de los que el sistema realmente considera sin disco.
    const { data: reportes } = useQuery({
        queryKey: ["reportes_sin_disco"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bus_failures")
                .select("ppu, notes, created_at")
                .eq("failure_type", "bus_sin_disco")
                .order("created_at", { ascending: false });
            if (error) throw error;

            // Un mismo bus puede tener varios reportes: interesa el bus, no
            // cada evento.
            const vistos = new Map<string, { ppu: string; notes: string | null; created_at: string }>();
            for (const r of data || []) {
                if (!vistos.has(r.ppu)) vistos.set(r.ppu, r);
            }
            return Array.from(vistos.values());
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

    const refrescar = () => {
        invalidateFleetCache();
        queryClient.invalidateQueries({ queryKey: ["padron_sin_disco"] });
        queryClient.invalidateQueries({ queryKey: ["padron_total"] });
        queryClient.invalidateQueries({ queryKey: ["reportes_sin_disco"] });
    };

    // Marcar o desmarcar es una actualización del bus, nunca una fila nueva.
    const marcarMutation = useMutation({
        mutationFn: async ({ ppu, tieneDisco }: { ppu: string; tieneDisco: boolean }) => {
            const normalizada = normalizePpu(ppu);
            const { data, error } = await supabase
                .from("padron_flota")
                .update({
                    tiene_disco: tieneDisco,
                    notas: tieneDisco ? null : "Sin disco duro instalado",
                    updated_at: new Date().toISOString(),
                })
                .eq("ppu", normalizada)
                .select();
            if (error) throw error;
            if (!data || data.length === 0) {
                throw new Error(`La PPU ${normalizada} no está en el padrón de flota.`);
            }
            return data[0] as FlotaRow;
        },
        onSuccess: (bus, vars) => {
            refrescar();
            setNuevaPpu("");
            toast.success(
                vars.tieneDisco
                    ? `${bus.ppu} marcado CON disco duro.`
                    : `${bus.ppu} marcado SIN disco duro. Sus solicitudes se responderán de inmediato.`
            );
        },
        onError: (err: Error) => toast.error(err.message),
    });

    // Reportes que aún no están reflejados en el padrón.
    const enPadron = new Set((buses || []).map((b) => b.ppu));
    const soloReporte = (reportes || []).filter((r) => !enPadron.has(normalizePpu(r.ppu)));

    const filtrados = buses?.filter((b) => {
        const q = searchTerm.toLowerCase();
        return (
            b.ppu.toLowerCase().includes(q) ||
            (b.interno || "").toLowerCase().includes(q) ||
            (b.terminal || "").toLowerCase().includes(q)
        );
    });

    const padronVacio = !isLoading && !error && (totalFlota ?? 0) === 0;

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Buses Sin Disco Duro</h1>
                    <p className="text-slate-500">
                        Buses del padrón que no tienen disco instalado. Sus solicitudes se
                        responden automáticamente con el aviso «{SIN_DISCO_MENSAJE}».
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
                    <p className="mt-1 text-3xl font-bold text-red-700">
                        {buses ? buses.length + soloReporte.length : "—"}
                    </p>
                    {soloReporte.length > 0 && (
                        <p className="mt-0.5 text-xs text-red-600">
                            {buses?.length ?? 0} en padrón + {soloReporte.length} por reporte
                        </p>
                    )}
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total en padrón</p>
                    <p className="mt-1 text-3xl font-bold text-slate-800">{totalFlota ?? "—"}</p>
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Con disco</p>
                    <p className="mt-1 text-3xl font-bold text-emerald-700">
                        {totalFlota != null && buses ? totalFlota - buses.length : "—"}
                    </p>
                </div>
            </div>

            {error && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-4 text-sm text-red-700">
                    No se pudo leer el padrón de flota. Verifica que la tabla{" "}
                    <code className="font-mono">padron_flota</code> exista (migración de flota).
                </div>
            )}

            {padronVacio && (
                <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <span>
                        El padrón de flota está vacío. Mientras no se cargue, la app no puede
                        distinguir un bus propio de uno ajeno y no bloquea ninguna solicitud.
                    </span>
                </div>
            )}

            {/* Marcar un bus del padrón */}
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h3 className="mb-1 font-semibold text-slate-800">Marcar un bus sin disco</h3>
                <p className="mb-3 text-xs text-slate-500">
                    Actualiza la ficha del bus en el padrón. El bus ya debe existir ahí; esto no
                    crea buses nuevos ni acumula registros repetidos.
                </p>
                <div className="flex flex-col gap-2 sm:flex-row">
                    <input
                        placeholder="PPU (ej: LXWP77 o LXWP-77)"
                        value={nuevaPpu}
                        onChange={(e) => setNuevaPpu(e.target.value)}
                        onKeyDown={(e) =>
                            e.key === "Enter" &&
                            nuevaPpu &&
                            marcarMutation.mutate({ ppu: nuevaPpu, tieneDisco: false })
                        }
                        className="flex-1 rounded-lg border border-slate-300 p-2 uppercase"
                        maxLength={10}
                    />
                    <button
                        onClick={() => marcarMutation.mutate({ ppu: nuevaPpu, tieneDisco: false })}
                        disabled={!nuevaPpu || marcarMutation.isPending}
                        className="flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700 disabled:opacity-50"
                    >
                        {marcarMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <HardDrive className="h-4 w-4" />
                        )}
                        Marcar sin disco
                    </button>
                </div>
            </div>

            {/* Reportes previos que el padrón todavía no refleja */}
            {soloReporte.length > 0 && (
                <div className="overflow-hidden rounded-xl border border-amber-300 bg-amber-50 shadow-sm">
                    <div className="border-b border-amber-200 p-4">
                        <h3 className="font-semibold text-amber-900">
                            Reportes previos sin reflejar en el padrón ({soloReporte.length})
                        </h3>
                        <p className="mt-1 text-xs text-amber-800">
                            Estos buses fueron marcados sin disco antes de existir el padrón. Ya
                            generan alerta, pero conviene registrarlos en la ficha del bus para que
                            el padrón sea la referencia única. «Pasar al padrón» actualiza el bus si
                            está en la flota.
                        </p>
                    </div>
                    <table className="w-full text-left text-sm">
                        <tbody className="divide-y divide-amber-200">
                            {soloReporte.map((r) => (
                                <tr key={r.ppu}>
                                    <td className="px-6 py-2 font-mono font-medium text-amber-900">{r.ppu}</td>
                                    <td className="px-6 py-2 text-xs text-amber-700">
                                        {r.notes || "Reporte de bus sin disco"}
                                    </td>
                                    <td className="px-6 py-2 text-xs text-amber-600">
                                        {format(new Date(r.created_at), "dd MMM yyyy", { locale: es })}
                                    </td>
                                    <td className="px-6 py-2 text-right">
                                        <button
                                            onClick={() => marcarMutation.mutate({ ppu: r.ppu, tieneDisco: false })}
                                            disabled={marcarMutation.isPending}
                                            className="rounded px-3 py-1.5 text-xs font-medium text-amber-800 underline hover:bg-amber-100 disabled:opacity-50"
                                        >
                                            Pasar al padrón
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Listado */}
            <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                <div className="flex gap-4 border-b border-slate-100 bg-slate-50/50 p-4">
                    <div className="relative max-w-sm flex-1">
                        <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                        <input
                            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-indigo-500"
                            placeholder="Buscar por PPU, interno o terminal..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
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
                                <th className="px-6 py-3">Estado</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">Cargando padrón...</td>
                                </tr>
                            ) : filtrados?.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-400">
                                        {searchTerm
                                            ? "Ningún bus sin disco coincide con la búsqueda."
                                            : "Ningún bus del padrón está marcado sin disco duro."}
                                    </td>
                                </tr>
                            ) : (
                                filtrados?.map((bus) => (
                                    <tr key={bus.id} className="transition-colors hover:bg-slate-50/50">
                                        <td className="px-6 py-3">
                                            <span className="flex items-center gap-2 font-mono font-medium text-slate-900">
                                                <Bus className="h-4 w-4 text-slate-400" />
                                                {bus.ppu}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-slate-600">{bus.interno || "—"}</td>
                                        <td className="px-6 py-3 text-slate-500">{bus.terminal || "—"}</td>
                                        <td className="px-6 py-3">
                                            <span className="flex w-fit items-center gap-1 rounded-full border border-red-300 bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
                                                <HardDrive className="h-3 w-3" />
                                                Sin disco
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button
                                                onClick={() => {
                                                    if (confirm(`¿Marcar ${bus.ppu} como CON disco duro?`)) {
                                                        marcarMutation.mutate({ ppu: bus.ppu, tieneDisco: true });
                                                    }
                                                }}
                                                className="rounded px-3 py-1.5 text-xs font-medium text-emerald-600 transition hover:bg-emerald-50"
                                            >
                                                Tiene disco
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
