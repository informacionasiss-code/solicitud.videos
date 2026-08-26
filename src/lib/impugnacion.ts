import * as XLSX from "xlsx";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { normalizePpu, SIN_DISCO_MENSAJE, type FlotaRow } from "@/lib/fleet";
import type { FilaImpugnacion } from "@/lib/impugnacionParser";

// ============================================================================
// Impugnaciones: cruce con el padrón, persistencia y exportación a Excel.
// ============================================================================

export type EstadoImpugnacion =
    | "pendiente"
    | "en_revision"
    | "con_video"
    | "sin_disco"
    | "sin_video"
    | "no_aplica";

export const ESTADO_LABELS: Record<EstadoImpugnacion, string> = {
    pendiente: "Pendiente",
    en_revision: "En revisión",
    con_video: "Con video",
    sin_disco: "Sin disco",
    sin_video: "Sin video",
    no_aplica: "No aplica",
};

export interface ImpugnacionRow {
    id: string;
    lote_id: string;
    archivo: string | null;
    orden: number | null;
    fecha: string | null;
    unidad: string | null;
    servicio: string | null;
    sentido: string | null;
    hora: string | null;
    zona: string | null;
    ppu: string;
    ppu_original: string | null;
    en_flota: boolean;
    sin_disco: boolean;
    interno: string | null;
    video_url: string | null;
    estado: EstadoImpugnacion;
    obs: string | null;
    created_at: string;
    updated_at: string;
}

/**
 * Texto que se deja en observaciones cuando el bus no tiene disco.
 *
 * El estado ya lo indica con una etiqueta, pero el Excel que se entrega se lee
 * fuera de la aplicación: ahí hace falta que el motivo esté escrito en la fila,
 * no codificado en un color o en una columna aparte.
 */
export const OBS_SIN_DISCO = SIN_DISCO_MENSAJE;

/** ¿La observación es la puesta automáticamente, y no algo escrito a mano? */
const esObsAutomatica = (obs: string | null | undefined): boolean =>
    !obs || obs.trim() === "" || obs.trim().toUpperCase() === OBS_SIN_DISCO;

export interface Lote {
    lote_id: string;
    archivo: string | null;
    filas: number;
    created_at: string;
}

/**
 * Trae del padrón sólo las PPU que aparecen en el archivo.
 *
 * Se consulta por lotes: un `in` con miles de valores hace que PostgREST
 * rechace la petición por largo de URL.
 */
async function traerPadron(ppus: string[]): Promise<Map<string, FlotaRow>> {
    const unicas = Array.from(new Set(ppus.filter(Boolean)));
    const mapa = new Map<string, FlotaRow>();
    const TAMANO = 200;

    for (let i = 0; i < unicas.length; i += TAMANO) {
        const tanda = unicas.slice(i, i + TAMANO);
        const { data, error } = await supabase
            .from("padron_flota")
            .select("*")
            .in("ppu", tanda);

        if (error) {
            console.error("[IMPUGNACION] Error consultando el padrón:", error);
            throw new Error(
                "No se pudo consultar el padrón de flota. Verifica que la tabla `padron_flota` exista."
            );
        }
        for (const bus of (data || []) as FlotaRow[]) mapa.set(bus.ppu, bus);
    }

    return mapa;
}

/**
 * Trae de `bus_failures` las PPU con un reporte de "bus sin disco".
 *
 * Es la sección de Buses Sin Disco de la aplicación: ahí se registran los buses
 * que no tienen disco instalado, y ese registro es anterior al padrón. Cruzar
 * sólo contra `padron_flota` ignoraba toda esa información y dejaba sin marcar
 * buses que el sistema ya sabía que no tienen disco.
 *
 * No lanza: si la tabla no se puede leer, se sigue con lo que diga el padrón.
 */
async function traerReportesSinDisco(ppus: string[]): Promise<Set<string>> {
    const unicas = Array.from(new Set(ppus.filter(Boolean)));
    const reportadas = new Set<string>();
    const TAMANO = 200;

    for (let i = 0; i < unicas.length; i += TAMANO) {
        const tanda = unicas.slice(i, i + TAMANO);
        const { data, error } = await supabase
            .from("bus_failures")
            .select("ppu")
            .eq("failure_type", "bus_sin_disco")
            .in("ppu", tanda);

        if (error) {
            console.error("[IMPUGNACION] Error consultando los reportes sin disco:", error);
            continue;
        }
        for (const fila of (data || []) as { ppu: string }[]) {
            reportadas.add(normalizePpu(fila.ppu));
        }
    }

    return reportadas;
}

/**
 * Decide si un bus tiene disco, con la MISMA regla que usa el registro de
 * solicitudes: el padrón manda cuando afirma que no lo tiene, y un reporte
 * previo sigue valiendo en los demás casos.
 *
 * Tenerla en una sola función evita que las dos pantallas contesten distinto
 * sobre el mismo bus, que es exactamente lo que había pasado.
 */
function evaluarDisco(bus: FlotaRow | undefined, tieneReporte: boolean): boolean {
    if (!bus) return false;                    // no es nuestro: no aplica
    if (bus.tiene_disco === false) return true; // el padrón lo afirma
    return tieneReporte;                        // respaldo del historial
}

export interface ResumenCruce {
    total: number;
    enFlota: number;
    fueraDeFlota: number;
    sinDisco: number;
}

/**
 * Cruza las filas del archivo con el padrón y las guarda como un lote nuevo.
 *
 * El resultado del cruce se congela en la fila: refleja lo que el padrón decía
 * al momento de cargar el archivo, que es lo que se informó en la impugnación.
 */
export async function cargarLote(
    filas: FilaImpugnacion[],
    nombreArchivo: string
): Promise<{ loteId: string; resumen: ResumenCruce }> {
    if (filas.length === 0) throw new Error("El archivo no contiene filas utilizables.");

    const ppus = filas.map((f) => f.ppu);
    const [padron, reportadas] = await Promise.all([
        traerPadron(ppus),
        traerReportesSinDisco(ppus),
    ]);
    const loteId = crypto.randomUUID();

    const registros = filas.map((f, i) => {
        const normalizada = normalizePpu(f.ppu);
        const bus = padron.get(normalizada);
        const enFlota = Boolean(bus);
        const sinDisco = evaluarDisco(bus, reportadas.has(normalizada));

        return {
            lote_id: loteId,
            archivo: nombreArchivo,
            orden: i + 1,
            fecha: f.fecha,
            unidad: f.unidad || null,
            servicio: f.servicio || null,
            sentido: f.sentido || null,
            hora: f.hora || null,
            zona: f.zona || null,
            ppu: f.ppu,
            ppu_original: f.ppuOriginal || null,
            en_flota: enFlota,
            sin_disco: sinDisco,
            interno: bus?.interno || null,
            // Un bus sin disco ya tiene desenlace: no hay revisión que hacer.
            estado: (sinDisco ? "sin_disco" : "pendiente") as EstadoImpugnacion,
            obs: sinDisco ? OBS_SIN_DISCO : null,
        };
    });

    // Insertar por tandas: un insert con miles de filas se corta.
    const TAMANO = 500;
    for (let i = 0; i < registros.length; i += TAMANO) {
        const { error } = await supabase
            .from("impugnaciones")
            .insert(registros.slice(i, i + TAMANO));
        if (error) {
            console.error("[IMPUGNACION] Error insertando:", error);
            throw new Error(`No se pudo guardar el lote: ${error.message}`);
        }
    }

    return {
        loteId,
        resumen: {
            total: registros.length,
            enFlota: registros.filter((r) => r.en_flota).length,
            fueraDeFlota: registros.filter((r) => !r.en_flota).length,
            sinDisco: registros.filter((r) => r.sin_disco).length,
        },
    };
}

/**
 * Vuelve a cruzar un lote ya cargado contra el padrón actual.
 *
 * El cruce se congela al cargar el archivo, que es lo correcto para dejar
 * constancia de lo informado. Pero si el padrón estaba incompleto -buses que
 * sí son nuestros figurando como ajenos- hace falta poder corregirlo sin
 * volver a subir el archivo y perder el trabajo de revisión ya hecho.
 *
 * Respeta lo que se completó a mano: la URL del video y las observaciones no
 * se tocan nunca.
 */
export async function recruzarLote(
    loteId: string
): Promise<ResumenCruce & { cambiados: number }> {
    const { data, error } = await supabase
        .from("impugnaciones")
        .select("*")
        .eq("lote_id", loteId);

    if (error) throw new Error(`No se pudo leer el lote: ${error.message}`);
    const filas = (data || []) as ImpugnacionRow[];
    if (filas.length === 0) throw new Error("El lote no tiene filas.");

    const ppusLote = filas.map((f) => f.ppu);
    const [padron, reportadas] = await Promise.all([
        traerPadron(ppusLote),
        traerReportesSinDisco(ppusLote),
    ]);
    let cambiados = 0;

    for (const fila of filas) {
        const normalizada = normalizePpu(fila.ppu);
        const bus = padron.get(normalizada);
        const enFlota = Boolean(bus);
        const sinDisco = evaluarDisco(bus, reportadas.has(normalizada));
        const interno = bus?.interno || null;

        const obsEsperada = esObsAutomatica(fila.obs)
            ? (sinDisco ? OBS_SIN_DISCO : null)
            : fila.obs;

        if (
            fila.en_flota === enFlota &&
            fila.sin_disco === sinDisco &&
            (fila.interno || null) === interno &&
            (fila.obs || null) === (obsEsperada || null)
        ) {
            continue; // nada que corregir en esta fila
        }

        // El estado sólo se recalcula cuando el cruce lo determina. Si la fila
        // ya tenía video, ese avance manda sobre cualquier otra cosa.
        let estado: EstadoImpugnacion = fila.estado;
        if (sinDisco) estado = "sin_disco";
        else if (fila.estado === "sin_disco") estado = fila.video_url ? "con_video" : "pendiente";

        // La observación se sincroniza sólo si nadie escribió nada propio: una
        // nota puesta a mano vale más que el texto automático.
        let obs = fila.obs;
        if (esObsAutomatica(fila.obs)) {
            obs = sinDisco ? OBS_SIN_DISCO : null;
        }

        const { error: errUpd } = await supabase
            .from("impugnaciones")
            .update({
                en_flota: enFlota,
                sin_disco: sinDisco,
                interno,
                estado,
                obs,
                updated_at: new Date().toISOString(),
            })
            .eq("id", fila.id);

        if (errUpd) {
            console.error("[IMPUGNACION] Error recruzando fila:", errUpd);
            continue;
        }
        cambiados++;
    }

    // Recuento sobre el estado nuevo, no sobre el que traían las filas.
    const recalculadas = filas.map((f) => {
        const normalizada = normalizePpu(f.ppu);
        const bus = padron.get(normalizada);
        return { enFlota: Boolean(bus), sinDisco: evaluarDisco(bus, reportadas.has(normalizada)) };
    });

    return {
        total: filas.length,
        enFlota: recalculadas.filter((r) => r.enFlota).length,
        fueraDeFlota: recalculadas.filter((r) => !r.enFlota).length,
        sinDisco: recalculadas.filter((r) => r.sinDisco).length,
        cambiados,
    };
}

/** Normaliza y valida una URL de video antes de guardarla. */
export function normalizarVideoUrl(raw: string): { url: string | null; error: string | null } {
    const texto = (raw || "").trim();
    if (!texto) return { url: null, error: null };

    // Sin esquema el enlace no es pinchable: se asume https.
    const conEsquema = /^https?:\/\//i.test(texto) ? texto : `https://${texto}`;

    try {
        const u = new URL(conEsquema);
        if (!u.hostname.includes(".")) {
            return { url: null, error: "La URL no parece válida." };
        }
        return { url: u.toString(), error: null };
    } catch {
        return { url: null, error: "La URL no parece válida." };
    }
}

// ---------------------------------------------------------------------------
// Exportación a Excel
// ---------------------------------------------------------------------------

/**
 * Genera el Excel de un lote.
 *
 * La URL del video se escribe como hipervínculo real de Excel, no como texto:
 * así se puede pinchar desde la planilla para ir a ver la grabación.
 */
export function exportarImpugnacionExcel(filas: ImpugnacionRow[], nombreArchivo?: string): string {
    if (filas.length === 0) throw new Error("No hay filas para exportar.");

    const datos = filas.map((f) => ({
        "N°": f.orden ?? "",
        Fecha: f.fecha ? format(new Date(`${f.fecha}T00:00:00`), "dd-MM-yyyy") : "",
        Hora: f.hora || "",
        Unidad: f.unidad || "",
        Servicio: f.servicio || "",
        Sentido: f.sentido || "",
        // Se exporta la patente tal como venía en el archivo de origen, para
        // que el destinatario reconozca sus propios datos.
        Patente: f.ppu_original || f.ppu,
        "PPU normalizada": f.ppu,
        Interno: f.interno || "",
        Zona: f.zona || "",
        "¿De nuestra flota?": f.en_flota ? "SI" : "NO",
        "Sin disco duro": f.sin_disco ? "SIN DISCO" : "",
        Estado: ESTADO_LABELS[f.estado] || f.estado,
        "URL Video": f.video_url || "",
        Observaciones: f.obs || (f.sin_disco ? OBS_SIN_DISCO : ""),
    }));

    const ws = XLSX.utils.json_to_sheet(datos);

    ws["!cols"] = [
        { wch: 5 },  // N°
        { wch: 12 }, // Fecha
        { wch: 10 }, // Hora
        { wch: 8 },  // Unidad
        { wch: 10 }, // Servicio
        { wch: 8 },  // Sentido
        { wch: 12 }, // Patente
        { wch: 14 }, // PPU normalizada
        { wch: 9 },  // Interno
        { wch: 14 }, // Zona
        { wch: 18 }, // De nuestra flota
        { wch: 15 }, // Sin disco
        { wch: 14 }, // Estado
        { wch: 55 }, // URL Video
        { wch: 35 }, // Observaciones
    ];

    // Hipervínculo en la columna de video (índice 13, base 0).
    const COL_VIDEO = 13;
    filas.forEach((f, i) => {
        if (!f.video_url) return;
        const ref = XLSX.utils.encode_cell({ r: i + 1, c: COL_VIDEO }); // +1 por el encabezado
        const celda = ws[ref];
        if (celda) {
            celda.l = { Target: f.video_url, Tooltip: "Abrir video" };
            celda.s = { font: { color: { rgb: "0563C1" }, underline: true } };
        }
    });

    ws["!autofilter"] = { ref: XLSX.utils.encode_range({
        s: { r: 0, c: 0 },
        e: { r: filas.length, c: 14 },
    }) };

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Impugnación");

    const base = (nombreArchivo || "impugnacion").replace(/\.[^.]+$/, "").replace(/[^\w-]+/g, "_");
    const nombre = `${base}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, nombre);
    return nombre;
}
