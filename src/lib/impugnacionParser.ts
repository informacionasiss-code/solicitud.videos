import * as XLSX from "xlsx";
import { normalizePpu } from "@/lib/fleet";

// ============================================================================
// Lectura del archivo de requerimientos de impugnación.
//
// Dos particularidades del archivo real condicionan todo este módulo:
//
//   1. Las columnas NO son contiguas: la planilla salta de F a J y de J a L
//      porque hay columnas ocultas en medio. Leer por posición fija daría
//      valores corridos, así que todo se resuelve por NOMBRE de encabezado.
//
//   2. Las patentes vienen con guion ("SPCG-80"). Se normalizan a "SPCG80"
//      para cruzar con el padrón, pero se conserva la forma original para que
//      el usuario reconozca sus propios datos en la tabla y en el Excel.
// ============================================================================

export interface FilaImpugnacion {
    fecha: string | null;      // ISO yyyy-MM-dd
    fechaOriginal: string;
    unidad: string;
    servicio: string;
    sentido: string;
    ppu: string;               // normalizada
    ppuOriginal: string;       // tal como venía, con guion
    hora: string;
    zona: string;
}

export interface ResultadoParseo {
    filas: FilaImpugnacion[];
    /** Encabezados encontrados y a qué columna del archivo corresponden. */
    columnasDetectadas: Record<string, number>;
    /** Encabezados esperados que no aparecieron. */
    columnasFaltantes: string[];
    totalFilasLeidas: number;
    filasDescartadas: number;
    advertencias: string[];
}

/** Quita acentos, espacios y signos para comparar encabezados. */
function clave(texto: unknown): string {
    return String(texto ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]/g, "");
}

// Sinónimos aceptados por campo. El archivo puede venir de distintas fuentes,
// así que cada campo reconoce varias formas de nombrarse.
const ALIAS: Record<keyof Omit<FilaImpugnacion, "ppuOriginal" | "fechaOriginal">, string[]> = {
    fecha: ["fecha", "dia", "fechaservicio", "fecharequerimiento"],
    unidad: ["unidad", "und", "u"],
    servicio: ["servicio", "serv", "recorrido"],
    sentido: ["sentido", "sent", "direccion"],
    ppu: ["patente", "ppu", "placa", "movil", "bus"],
    hora: ["hora", "horario", "hh", "horainicio"],
    zona: ["zona", "sector", "terminal"],
};

const CAMPOS_REQUERIDOS: (keyof typeof ALIAS)[] = ["ppu"];

/**
 * Convierte lo que venga en la celda de fecha a ISO.
 *
 * Excel entrega tres cosas distintas según cómo se guardó la celda: un número
 * de serie, un Date ya convertido, o texto tipo "01-08-26". Los tres casos se
 * dan en archivos reales del mismo origen.
 */
function normalizarFecha(valor: unknown): { iso: string | null; original: string } {
    if (valor == null || valor === "") return { iso: null, original: "" };

    const original = valor instanceof Date ? valor.toLocaleDateString("es-CL") : String(valor).trim();

    const aIso = (d: Date): string | null => {
        if (isNaN(d.getTime())) return null;
        const p = (n: number) => String(n).padStart(2, "0");
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
    };

    if (valor instanceof Date) return { iso: aIso(valor), original };

    // Número de serie de Excel
    if (typeof valor === "number" && isFinite(valor)) {
        const parsed = XLSX.SSF.parse_date_code(valor);
        if (parsed) {
            const d = new Date(parsed.y, parsed.m - 1, parsed.d);
            return { iso: aIso(d), original };
        }
    }

    const texto = original;

    // dd-mm-yy / dd/mm/yyyy. El año de dos dígitos se interpreta como 20xx:
    // los requerimientos son siempre recientes.
    const m = texto.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})$/);
    if (m) {
        const dia = parseInt(m[1], 10);
        const mes = parseInt(m[2], 10);
        let anio = parseInt(m[3], 10);
        if (anio < 100) anio += 2000;
        const d = new Date(anio, mes - 1, dia);
        return { iso: aIso(d), original };
    }

    // yyyy-mm-dd
    const m2 = texto.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (m2) {
        const d = new Date(parseInt(m2[1], 10), parseInt(m2[2], 10) - 1, parseInt(m2[3], 10));
        return { iso: aIso(d), original };
    }

    return { iso: null, original };
}

/** Deja la hora como HH:mm:ss legible, venga como número de Excel o texto. */
function normalizarHora(valor: unknown): string {
    if (valor == null || valor === "") return "";

    if (valor instanceof Date) {
        const p = (n: number) => String(n).padStart(2, "0");
        return `${p(valor.getHours())}:${p(valor.getMinutes())}:${p(valor.getSeconds())}`;
    }

    // Fracción de día de Excel (0.5 = 12:00:00)
    if (typeof valor === "number" && isFinite(valor)) {
        const frac = valor - Math.floor(valor);
        const totalSeg = Math.round(frac * 86400);
        const p = (n: number) => String(n).padStart(2, "0");
        return `${p(Math.floor(totalSeg / 3600))}:${p(Math.floor((totalSeg % 3600) / 60))}:${p(totalSeg % 60)}`;
    }

    return String(valor).trim();
}

/**
 * Localiza la fila de encabezados.
 *
 * No se asume que sea la primera: los archivos suelen traer títulos, logos o
 * filas en blanco arriba. Se elige la primera fila que contenga al menos dos
 * encabezados reconocibles, uno de ellos la patente.
 */
function ubicarEncabezado(filas: unknown[][]): { indice: number; mapa: Record<string, number> } | null {
    const limite = Math.min(filas.length, 30);

    for (let i = 0; i < limite; i++) {
        const fila = filas[i] || [];
        const mapa: Record<string, number> = {};

        fila.forEach((celda, col) => {
            const k = clave(celda);
            if (!k) return;
            for (const [campo, alias] of Object.entries(ALIAS)) {
                if (mapa[campo] === undefined && alias.includes(k)) mapa[campo] = col;
            }
        });

        if (mapa.ppu !== undefined && Object.keys(mapa).length >= 2) {
            return { indice: i, mapa };
        }
    }
    return null;
}

/** Patente plausible: 4 a 8 alfanuméricos con al menos una letra y un dígito. */
function esPpuPlausible(ppu: string): boolean {
    if (ppu.length < 4 || ppu.length > 8) return false;
    return /[A-Z]/.test(ppu) && /[0-9]/.test(ppu);
}

export async function parseImpugnacionFile(file: File): Promise<ResultadoParseo> {
    const buffer = await file.arrayBuffer();
    // cellDates deja que la librería resuelva fechas y horas cuando puede.
    const wb = XLSX.read(buffer, { type: "array", cellDates: true });

    const advertencias: string[] = [];
    const nombreHoja = wb.SheetNames[0];
    if (!nombreHoja) throw new Error("El archivo no contiene ninguna hoja.");
    if (wb.SheetNames.length > 1) {
        advertencias.push(
            `El archivo tiene ${wb.SheetNames.length} hojas; se leyó solo la primera ("${nombreHoja}").`
        );
    }

    const hoja = wb.Sheets[nombreHoja];
    // header:1 -> matriz cruda. defval mantiene la posición de las columnas
    // vacías, que es justamente lo que permite sobrevivir a las ocultas.
    const filas = XLSX.utils.sheet_to_json<unknown[]>(hoja, {
        header: 1,
        defval: "",
        blankrows: false,
        raw: false,
        dateNF: "yyyy-mm-dd",
    });

    if (filas.length === 0) throw new Error("La hoja está vacía.");

    const encabezado = ubicarEncabezado(filas);
    if (!encabezado) {
        throw new Error(
            "No se encontró una fila de encabezados con una columna de patente. " +
            "Se esperan columnas como: fecha, unidad, servicio, sentido, patente, hora, zona."
        );
    }

    const { indice, mapa } = encabezado;
    const faltantes = (Object.keys(ALIAS) as (keyof typeof ALIAS)[])
        .filter((c) => mapa[c] === undefined)
        .map(String);

    for (const req of CAMPOS_REQUERIDOS) {
        if (mapa[req] === undefined) {
            throw new Error(`Falta la columna obligatoria "${req}" en el archivo.`);
        }
    }
    if (faltantes.length > 0) {
        advertencias.push(`Columnas no encontradas (quedarán vacías): ${faltantes.join(", ")}.`);
    }

    const leer = (fila: unknown[], campo: keyof typeof ALIAS): unknown => {
        const col = mapa[campo];
        return col === undefined ? "" : fila[col];
    };

    const resultado: FilaImpugnacion[] = [];
    let descartadas = 0;
    let totalLeidas = 0;

    for (let i = indice + 1; i < filas.length; i++) {
        const fila = filas[i] || [];
        if (fila.every((c) => c === "" || c == null)) continue;

        totalLeidas++;

        const ppuOriginal = String(leer(fila, "ppu") ?? "").trim();
        const ppu = normalizePpu(ppuOriginal);

        // Sin patente utilizable no hay nada que cruzar contra el padrón.
        if (!esPpuPlausible(ppu)) {
            descartadas++;
            continue;
        }

        const { iso, original } = normalizarFecha(leer(fila, "fecha"));

        resultado.push({
            fecha: iso,
            fechaOriginal: original,
            unidad: String(leer(fila, "unidad") ?? "").trim(),
            servicio: String(leer(fila, "servicio") ?? "").trim(),
            sentido: String(leer(fila, "sentido") ?? "").trim(),
            ppu,
            ppuOriginal,
            hora: normalizarHora(leer(fila, "hora")),
            zona: String(leer(fila, "zona") ?? "").trim(),
        });
    }

    if (descartadas > 0) {
        advertencias.push(
            `${descartadas} fila(s) sin una patente reconocible fueron omitidas.`
        );
    }

    // Orden de los requerimientos: por fecha y hora, y a igualdad por patente.
    // Las filas sin fecha van al final para que no ensucien el inicio.
    resultado.sort((a, b) => {
        if (a.fecha && b.fecha && a.fecha !== b.fecha) return a.fecha < b.fecha ? -1 : 1;
        if (a.fecha && !b.fecha) return -1;
        if (!a.fecha && b.fecha) return 1;
        if (a.hora !== b.hora) return a.hora < b.hora ? -1 : 1;
        return a.ppu.localeCompare(b.ppu);
    });

    return {
        filas: resultado,
        columnasDetectadas: mapa,
        columnasFaltantes: faltantes,
        totalFilasLeidas: totalLeidas,
        filasDescartadas: descartadas,
        advertencias,
    };
}
