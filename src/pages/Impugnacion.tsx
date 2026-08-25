import { useCallback, useMemo, useState } from "react";
import { useDropzone } from "react-dropzone";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
    UploadCloud, FileSpreadsheet, Download, Loader2, HardDrive, Ban,
    CheckCircle2, Video, Search, Trash2, ExternalLink, Save, X,
} from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { parseImpugnacionFile } from "@/lib/impugnacionParser";
import {
    cargarLote, exportarImpugnacionExcel, normalizarVideoUrl,
    ESTADO_LABELS, type ImpugnacionRow, type EstadoImpugnacion, type Lote,
} from "@/lib/impugnacion";
import { SIN_DISCO_MENSAJE } from "@/lib/fleet";

const ESTADO_COLORES: Record<EstadoImpugnacion, string> = {
    pendiente: "bg-slate-100 text-slate-700 border-slate-300",
    en_revision: "bg-blue-100 text-blue-700 border-blue-300",
    con_video: "bg-emerald-100 text-emerald-700 border-emerald-300",
    sin_disco: "bg-red-100 text-red-700 border-red-300",
    sin_video: "bg-amber-100 text-amber-700 border-amber-300",
    no_aplica: "bg-slate-100 text-slate-500 border-slate-300",
};

export default function Impugnacion() {
    const queryClient = useQueryClient();
    const [procesando, setProcesando] = useState(false);
    const [loteActivo, setLoteActivo] = useState<string | null>(null);
    const [busqueda, setBusqueda] = useState("");
    const [filtro, setFiltro] = useState<"todos" | "flota" | "fuera" | "sin_disco" | "con_video">("todos");
    const [editandoUrl, setEditandoUrl] = useState<string | null>(null);
    const [urlBorrador, setUrlBorrador] = useState("");

    // ---------------------------------------------------------------- lotes
    const { data: lotes } = useQuery({
        queryKey: ["impugnacion_lotes"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("impugnaciones")
                .select("lote_id, archivo, created_at")
                .order("created_at", { ascending: false });
            if (error) throw error;

            const mapa = new Map<string, Lote>();
            for (const r of data || []) {
                const prev = mapa.get(r.lote_id);
                if (prev) prev.filas++;
                else mapa.set(r.lote_id, { lote_id: r.lote_id, archivo: r.archivo, filas: 1, created_at: r.created_at });
            }
            return Array.from(mapa.values());
        },
    });

    const loteSeleccionado = loteActivo ?? lotes?.[0]?.lote_id ?? null;

    // ---------------------------------------------------------------- filas
    const { data: filas, isLoading } = useQuery({
        queryKey: ["impugnaciones", loteSeleccionado],
        enabled: Boolean(loteSeleccionado),
        queryFn: async () => {
            const { data, error } = await supabase
                .from("impugnaciones")
                .select("*")
                .eq("lote_id", loteSeleccionado)
                .order("orden", { ascending: true });
            if (error) throw error;
            return data as ImpugnacionRow[];
        },
    });

    // Estable, porque onDrop la captura en su useCallback.
    const refrescar = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["impugnaciones"] });
        queryClient.invalidateQueries({ queryKey: ["impugnacion_lotes"] });
    }, [queryClient]);

    // ---------------------------------------------------------------- carga
    const onDrop = useCallback(async (files: File[]) => {
        const file = files[0];
        if (!file) return;

        setProcesando(true);
        try {
            const parseo = await parseImpugnacionFile(file);
            parseo.advertencias.forEach((a) => toast.warning(a, { duration: 8000 }));

            const { loteId, resumen } = await cargarLote(parseo.filas, file.name);

            setLoteActivo(loteId);
            refrescar();

            toast.success(
                `${resumen.total} requerimientos cargados · ${resumen.enFlota} de nuestra flota · ${resumen.sinDisco} sin disco`,
                { duration: 9000 }
            );
            if (resumen.fueraDeFlota > 0) {
                toast.warning(`${resumen.fueraDeFlota} patente(s) no pertenecen a nuestra flota.`, { duration: 9000 });
            }
        } catch (e) {
            console.error(e);
            toast.error(e instanceof Error ? e.message : "No se pudo procesar el archivo.", { duration: 12000 });
        } finally {
            setProcesando(false);
        }
    }, [refrescar]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
            "application/vnd.ms-excel": [".xls"],
            "text/csv": [".csv"],
        },
        multiple: false,
    });

    // ------------------------------------------------------------ mutaciones
    const actualizar = useMutation({
        mutationFn: async ({ id, cambios }: { id: string; cambios: Partial<ImpugnacionRow> }) => {
            const { error } = await supabase
                .from("impugnaciones")
                .update({ ...cambios, updated_at: new Date().toISOString() })
                .eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => refrescar(),
        onError: (e: Error) => toast.error("No se pudo guardar: " + e.message),
    });

    const borrarLote = useMutation({
        mutationFn: async (loteId: string) => {
            const { error } = await supabase.from("impugnaciones").delete().eq("lote_id", loteId);
            if (error) throw error;
        },
        onSuccess: () => {
            setLoteActivo(null);
            refrescar();
            toast.success("Lote eliminado");
        },
    });

    const guardarUrl = (fila: ImpugnacionRow) => {
        const { url, error } = normalizarVideoUrl(urlBorrador);
        if (error) {
            toast.error(error);
            return;
        }
        // El video es el desenlace de la revisión: al haberlo, el estado sigue.
        // Un bus sin disco conserva su estado, que no depende de la revisión.
        const nuevoEstado: EstadoImpugnacion = fila.sin_disco
            ? "sin_disco"
            : url
                ? "con_video"
                : fila.estado === "con_video"
                    ? "pendiente"
                    : fila.estado;

        actualizar.mutate({ id: fila.id, cambios: { video_url: url, estado: nuevoEstado } });
        setEditandoUrl(null);
        setUrlBorrador("");
    };

    // ------------------------------------------------------------- filtrado
    const visibles = useMemo(() => {
        if (!filas) return [];
        const q = busqueda.trim().toLowerCase();
        return filas.filter((f) => {
            if (filtro === "flota" && !f.en_flota) return false;
            if (filtro === "fuera" && f.en_flota) return false;
            if (filtro === "sin_disco" && !f.sin_disco) return false;
            if (filtro === "con_video" && !f.video_url) return false;
            if (!q) return true;
            return (
                f.ppu.toLowerCase().includes(q) ||
                (f.ppu_original || "").toLowerCase().includes(q) ||
                (f.interno || "").toLowerCase().includes(q) ||
                (f.servicio || "").toLowerCase().includes(q) ||
                (f.zona || "").toLowerCase().includes(q)
            );
        });
    }, [filas, busqueda, filtro]);

    const stats = useMemo(() => ({
        total: filas?.length ?? 0,
        enFlota: filas?.filter((f) => f.en_flota).length ?? 0,
        fuera: filas?.filter((f) => !f.en_flota).length ?? 0,
        sinDisco: filas?.filter((f) => f.sin_disco).length ?? 0,
        conVideo: filas?.filter((f) => f.video_url).length ?? 0,
    }), [filas]);

    const loteInfo = lotes?.find((l) => l.lote_id === loteSeleccionado);

    return (
        <div className="space-y-6 animate-fade-in">
            <div>
                <h1 className="text-2xl font-bold text-slate-900">Impugnación</h1>
                <p className="text-slate-500">
                    Sube el archivo de requerimientos: se ordena, se cruza contra el padrón de
                    flota, se marcan los buses sin disco y se exporta a Excel. No envía correos.
                </p>
            </div>

            {/* Carga */}
            <div
                {...getRootProps()}
                className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-8 transition ${
                    isDragActive ? "border-indigo-500 bg-indigo-50" : "border-slate-300 bg-slate-50 hover:bg-slate-100"
                }`}
            >
                <input {...getInputProps()} />
                {procesando ? (
                    <>
                        <Loader2 className="mb-3 h-10 w-10 animate-spin text-indigo-600" />
                        <p className="font-semibold text-slate-700">Procesando y cruzando con el padrón...</p>
                    </>
                ) : (
                    <>
                        <UploadCloud className="mb-3 h-10 w-10 text-slate-500" />
                        <p className="font-semibold text-slate-800">
                            {isDragActive ? "Suelta el archivo aquí" : "Arrastra el archivo de requerimientos"}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">Excel (.xlsx, .xls) o CSV · o haz click para elegirlo</p>
                        <p className="mt-3 rounded-full border border-slate-200 bg-white px-4 py-1 text-xs text-slate-500">
                            Columnas: fecha · unidad · servicio · sentido · patente · hora · zona
                        </p>
                    </>
                )}
            </div>

            {/* Selector de lote */}
            {lotes && lotes.length > 0 && (
                <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white p-4">
                    <FileSpreadsheet className="h-4 w-4 shrink-0 text-slate-400" />
                    <select
                        value={loteSeleccionado ?? ""}
                        onChange={(e) => setLoteActivo(e.target.value)}
                        className="flex-1 rounded-lg border border-slate-300 p-2 text-sm"
                    >
                        {lotes.map((l) => (
                            <option key={l.lote_id} value={l.lote_id}>
                                {l.archivo || "Sin nombre"} · {l.filas} filas ·{" "}
                                {format(new Date(l.created_at), "dd/MM/yyyy HH:mm")}
                            </option>
                        ))}
                    </select>
                    <button
                        onClick={() => {
                            if (!filas?.length) return toast.error("No hay filas para exportar.");
                            try {
                                const nombre = exportarImpugnacionExcel(filas, loteInfo?.archivo || "impugnacion");
                                toast.success(`Excel descargado: ${nombre}`);
                            } catch (e) {
                                toast.error(e instanceof Error ? e.message : "Error al exportar");
                            }
                        }}
                        className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-emerald-700"
                    >
                        <Download className="h-4 w-4" />
                        Descargar Excel
                    </button>
                    <button
                        onClick={() => {
                            if (loteSeleccionado && confirm("¿Eliminar este lote completo?")) {
                                borrarLote.mutate(loteSeleccionado);
                            }
                        }}
                        className="rounded-lg p-2 text-red-400 transition hover:bg-red-50 hover:text-red-600"
                        title="Eliminar lote"
                    >
                        <Trash2 className="h-4 w-4" />
                    </button>
                </div>
            )}

            {/* Resumen */}
            {filas && filas.length > 0 && (
                <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
                    {([
                        { k: "todos", label: "Total", valor: stats.total, clase: "border-slate-200 bg-white text-slate-800" },
                        { k: "flota", label: "De la flota", valor: stats.enFlota, clase: "border-emerald-200 bg-emerald-50 text-emerald-700" },
                        { k: "fuera", label: "Fuera de flota", valor: stats.fuera, clase: "border-orange-200 bg-orange-50 text-orange-700" },
                        { k: "sin_disco", label: "Sin disco", valor: stats.sinDisco, clase: "border-red-200 bg-red-50 text-red-700" },
                        { k: "con_video", label: "Con video", valor: stats.conVideo, clase: "border-blue-200 bg-blue-50 text-blue-700" },
                    ] as const).map((c) => (
                        <button
                            key={c.k}
                            onClick={() => setFiltro(c.k)}
                            className={`rounded-xl border p-3 text-left transition ${c.clase} ${
                                filtro === c.k ? "ring-2 ring-indigo-500 ring-offset-1" : "hover:opacity-80"
                            }`}
                        >
                            <p className="text-xs font-semibold uppercase tracking-wide opacity-75">{c.label}</p>
                            <p className="mt-0.5 text-2xl font-bold">{c.valor}</p>
                        </button>
                    ))}
                </div>
            )}

            {/* Tabla */}
            {loteSeleccionado && (
                <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
                    <div className="border-b border-slate-100 bg-slate-50/50 p-4">
                        <div className="relative max-w-sm">
                            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                            <input
                                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-4 text-sm focus:ring-1 focus:ring-indigo-500"
                                placeholder="Buscar patente, interno, servicio o zona..."
                                value={busqueda}
                                onChange={(e) => setBusqueda(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm">
                            <thead className="bg-slate-50 text-xs font-semibold uppercase text-slate-500">
                                <tr>
                                    <th className="px-3 py-3">N°</th>
                                    <th className="px-3 py-3">Fecha</th>
                                    <th className="px-3 py-3">Hora</th>
                                    <th className="px-3 py-3">Unidad</th>
                                    <th className="px-3 py-3">Servicio</th>
                                    <th className="px-3 py-3">Sent.</th>
                                    <th className="px-3 py-3">Patente</th>
                                    <th className="px-3 py-3">Interno</th>
                                    <th className="px-3 py-3">Zona</th>
                                    <th className="px-3 py-3">Flota</th>
                                    <th className="px-3 py-3">Estado</th>
                                    <th className="px-3 py-3 min-w-[220px]">Video</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {isLoading ? (
                                    <tr><td colSpan={12} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                                ) : visibles.length === 0 ? (
                                    <tr><td colSpan={12} className="p-8 text-center text-slate-400">Sin resultados.</td></tr>
                                ) : (
                                    visibles.map((f) => (
                                        <tr
                                            key={f.id}
                                            className={`transition-colors hover:bg-slate-50/60 ${
                                                f.sin_disco ? "bg-red-50/50" : !f.en_flota ? "bg-orange-50/40" : ""
                                            }`}
                                        >
                                            <td className="px-3 py-2 text-slate-400">{f.orden}</td>
                                            <td className="px-3 py-2 whitespace-nowrap">
                                                {f.fecha ? format(new Date(`${f.fecha}T00:00:00`), "dd-MM-yyyy") : "—"}
                                            </td>
                                            <td className="px-3 py-2 whitespace-nowrap text-slate-600">{f.hora || "—"}</td>
                                            <td className="px-3 py-2">{f.unidad || "—"}</td>
                                            <td className="px-3 py-2">{f.servicio || "—"}</td>
                                            <td className="px-3 py-2">{f.sentido || "—"}</td>
                                            <td className="px-3 py-2 font-mono font-medium text-slate-900">
                                                {f.ppu_original || f.ppu}
                                            </td>
                                            <td className="px-3 py-2 text-slate-600">{f.interno || "—"}</td>
                                            <td className="px-3 py-2 text-slate-500">{f.zona || "—"}</td>
                                            <td className="px-3 py-2">
                                                {f.en_flota ? (
                                                    <span className="flex w-fit items-center gap-1 text-xs font-medium text-emerald-700">
                                                        <CheckCircle2 className="h-3 w-3" /> Sí
                                                    </span>
                                                ) : (
                                                    <span
                                                        className="flex w-fit items-center gap-1 text-xs font-semibold text-orange-700"
                                                        title="Esta patente no pertenece a nuestra flota"
                                                    >
                                                        <Ban className="h-3 w-3" /> No
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                {f.sin_disco ? (
                                                    <span
                                                        className="flex w-fit items-center gap-1 rounded-full border border-red-300 bg-red-100 px-2 py-0.5 text-xs font-bold text-red-700"
                                                        title={SIN_DISCO_MENSAJE}
                                                    >
                                                        <HardDrive className="h-3 w-3" /> SIN DISCO
                                                    </span>
                                                ) : (
                                                    <select
                                                        value={f.estado}
                                                        onChange={(e) =>
                                                            actualizar.mutate({
                                                                id: f.id,
                                                                cambios: { estado: e.target.value as EstadoImpugnacion },
                                                            })
                                                        }
                                                        className={`rounded-full border px-2 py-0.5 text-xs font-medium ${ESTADO_COLORES[f.estado]}`}
                                                    >
                                                        {Object.entries(ESTADO_LABELS)
                                                            .filter(([k]) => k !== "sin_disco")
                                                            .map(([k, v]) => (
                                                                <option key={k} value={k}>{v}</option>
                                                            ))}
                                                    </select>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                {editandoUrl === f.id ? (
                                                    <div className="flex items-center gap-1">
                                                        <input
                                                            autoFocus
                                                            value={urlBorrador}
                                                            onChange={(e) => setUrlBorrador(e.target.value)}
                                                            onKeyDown={(e) => {
                                                                if (e.key === "Enter") guardarUrl(f);
                                                                if (e.key === "Escape") setEditandoUrl(null);
                                                            }}
                                                            placeholder="https://..."
                                                            className="w-full rounded border border-slate-300 px-2 py-1 text-xs"
                                                        />
                                                        <button
                                                            onClick={() => guardarUrl(f)}
                                                            className="rounded p-1 text-emerald-600 hover:bg-emerald-50"
                                                            title="Guardar"
                                                        >
                                                            <Save className="h-4 w-4" />
                                                        </button>
                                                        <button
                                                            onClick={() => setEditandoUrl(null)}
                                                            className="rounded p-1 text-slate-400 hover:bg-slate-100"
                                                            title="Cancelar"
                                                        >
                                                            <X className="h-4 w-4" />
                                                        </button>
                                                    </div>
                                                ) : f.video_url ? (
                                                    <div className="flex items-center gap-2">
                                                        <a
                                                            href={f.video_url}
                                                            target="_blank"
                                                            rel="noreferrer"
                                                            className="flex items-center gap-1 text-xs font-medium text-blue-600 hover:underline"
                                                        >
                                                            <Video className="h-3.5 w-3.5" />
                                                            Ver video
                                                            <ExternalLink className="h-3 w-3" />
                                                        </a>
                                                        <button
                                                            onClick={() => { setEditandoUrl(f.id); setUrlBorrador(f.video_url || ""); }}
                                                            className="text-xs text-slate-400 hover:text-slate-600"
                                                        >
                                                            editar
                                                        </button>
                                                    </div>
                                                ) : f.sin_disco ? (
                                                    <span className="text-xs italic text-red-400">No hay grabación</span>
                                                ) : (
                                                    <button
                                                        onClick={() => { setEditandoUrl(f.id); setUrlBorrador(""); }}
                                                        className="text-xs text-indigo-600 hover:underline"
                                                    >
                                                        + Agregar URL
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {(!lotes || lotes.length === 0) && !procesando && (
                <div className="rounded-xl border border-slate-200 bg-white p-10 text-center">
                    <FileSpreadsheet className="mx-auto mb-3 h-10 w-10 text-slate-300" />
                    <h3 className="font-semibold text-slate-800">Todavía no hay impugnaciones cargadas</h3>
                    <p className="mt-1 text-sm text-slate-500">
                        Sube un archivo de requerimientos para generar la tabla.
                    </p>
                </div>
            )}
        </div>
    );
}
