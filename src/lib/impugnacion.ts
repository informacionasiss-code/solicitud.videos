import * as XLSX from "xlsx";
import { format } from "date-fns";
import { supabase } from "@/lib/supabase";
import { normalizePpu, type FlotaRow } from "@/lib/fleet";
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

    const padron = await traerPadron(filas.map((f) => f.ppu));
    const loteId = crypto.randomUUID();

    const registros = filas.map((f, i) => {
        const bus = padron.get(normalizePpu(f.ppu));
        const enFlota = Boolean(bus);
        const sinDisco = enFlota && bus!.tiene_disco === false;

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
        Observaciones: f.obs || "",
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

    const base = (nombreArchivo || "impugnacion").replace(/\.[^.]+$/, "").replace(/[^\w\-]+/g, "_");
    const nombre = `${base}_${format(new Date(), "yyyy-MM-dd")}.xlsx`;
    XLSX.writeFile(wb, nombre);
    return nombre;
}
