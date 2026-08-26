// Cruce del archivo de impugnación contra el padrón y observación automática.
//
// El cruce se puso en duda cuando buses propios aparecían como ajenos; resultó
// ser el padrón, no el código. Estos casos lo fijan: patentes con guion,
// arrastre del número interno y marcado de los buses sin disco.
import * as XLSX from "xlsx";
import { supabase } from "@/lib/supabase";
import { ok, fin } from "./_ayuda";

const PADRON = [
    { id: "1", ppu: "SKPK27", interno: "1831", tiene_disco: true, activo: true },
    { id: "2", ppu: "SKPL36", interno: "1852", tiene_disco: true, activo: true },
    { id: "3", ppu: "LXWP77", interno: "1695", tiene_disco: false, activo: true },
];

const insertados: Record<string, unknown>[] = [];
const updates: Record<string, unknown>[] = [];
let filasLote: Record<string, unknown>[] = [];

(supabase as { from: unknown }).from = (tabla: string) => {
    if (tabla === "padron_flota") {
        const q: Record<string, unknown> = {
            select: () => q,
            in: (_c: string, v: string[]) =>
                Promise.resolve({ data: PADRON.filter(b => v.includes(b.ppu)), error: null }),
        };
        return q;
    }
    let pendiente: Record<string, unknown> | null = null;
    const q: Record<string, unknown> = {
        insert: (f: Record<string, unknown>[]) => { insertados.push(...f); return Promise.resolve({ error: null }); },
        select: () => q,
        update: (c: Record<string, unknown>) => { pendiente = c; return q; },
        eq: (_c: string, v: string) => {
            if (pendiente) { updates.push({ id: v, ...pendiente }); pendiente = null; return Promise.resolve({ error: null }); }
            return Promise.resolve({ data: filasLote, error: null });
        },
    };
    return q;
};
// No se sustituye globalThis.crypto: Node ya trae randomUUID y la propiedad es
// de sólo lectura. El identificador del lote se lee de lo que se insertó.

const { cargarLote, recruzarLote, exportarImpugnacionExcel, OBS_SIN_DISCO } = await import("@/lib/impugnacion");

const fila = (ppu: string, original: string, zona = "El Roble") => ({
    fecha: "2026-08-01", fechaOriginal: "", unidad: "U11", servicio: "1141",
    sentido: "I", ppu, ppuOriginal: original, hora: "08:00", zona,
});

const { resumen } = await cargarLote(
    [fila("SKPK27", "SKPK-27"), fila("SKPL36", "SKPL-36"), fila("LXWP77", "LXWP-77"), fila("SPCG80", "SPCG-80", "Colo Colo")] as never,
    "req.xlsx"
);
const porPpu = Object.fromEntries(insertados.map(r => [r.ppu as string, r]));

ok("la patente con guion cruza con el padrón", porPpu["SKPK27"].en_flota === true, porPpu["SKPK27"]);
ok("  arrastra el número interno", porPpu["SKPK27"].interno === "1831", porPpu["SKPK27"].interno);
ok("  conserva la patente original", porPpu["SKPK27"].ppu_original === "SKPK-27", porPpu["SKPK27"].ppu_original);
ok("el bus sin disco se marca sin disco", porPpu["LXWP77"].sin_disco === true, porPpu["LXWP77"]);
ok("  con estado sin_disco", porPpu["LXWP77"].estado === "sin_disco", porPpu["LXWP77"].estado);
ok("  y la observación puesta", porPpu["LXWP77"].obs === OBS_SIN_DISCO, porPpu["LXWP77"].obs);
ok("un bus con disco no recibe observación inventada", porPpu["SKPK27"].obs === null, porPpu["SKPK27"].obs);
ok("la patente ausente del padrón queda fuera de flota", porPpu["SPCG80"].en_flota === false, porPpu["SPCG80"]);
ok("el resumen cuenta 3 de nuestra flota", resumen.enFlota === 3, resumen);
ok("el resumen cuenta 1 fuera", resumen.fueraDeFlota === 1, resumen);
ok("el resumen cuenta 1 sin disco", resumen.sinDisco === 1, resumen);
ok("todas las filas comparten el identificador de lote",
   new Set(insertados.map(r => r.lote_id)).size === 1, insertados.map(r => r.lote_id));
ok("la observación es el aviso estándar", OBS_SIN_DISCO === "BUS NO TIENE DISCO PARA SU REVISION", OBS_SIN_DISCO);

// --- Excel ---
process.chdir(process.env.TMPDIR || "/tmp");
const base = (o: Record<string, unknown>) => ({
    id: "i", lote_id: "l", archivo: "req.xlsx", orden: 1, fecha: "2026-08-01",
    unidad: "U11", servicio: "1141", sentido: "I", hora: "08:00", zona: "El Roble",
    ppu: "X", ppu_original: "X", en_flota: true, sin_disco: false, interno: "1",
    video_url: null, estado: "pendiente", obs: null, created_at: "", updated_at: "", ...o,
});
const nombre = exportarImpugnacionExcel([
    base({ orden: 1, ppu: "LXWP77", sin_disco: true, estado: "sin_disco", obs: OBS_SIN_DISCO }),
    base({ orden: 2, ppu: "SKPK27" }),
    base({ orden: 3, ppu: "AAAA11", sin_disco: true, estado: "sin_disco", obs: null }),
    base({ orden: 4, ppu: "BBBB22", obs: "Revisado con supervisor" }),
] as never, "req.xlsx");
const hoja = XLSX.utils.sheet_to_json<Record<string, unknown>>(XLSX.readFile(nombre).Sheets["Impugnación"]);

ok("el Excel trae la columna Observaciones", "Observaciones" in hoja[0], Object.keys(hoja[0]));
ok("la fila sin disco detalla el motivo", hoja[0]["Observaciones"] === OBS_SIN_DISCO, hoja[0]["Observaciones"]);
ok("la fila normal no inventa observación", !hoja[1]["Observaciones"], hoja[1]["Observaciones"]);
ok("sin observación guardada, el Excel igual la detalla", hoja[2]["Observaciones"] === OBS_SIN_DISCO, hoja[2]["Observaciones"]);
ok("una nota escrita a mano se respeta", hoja[3]["Observaciones"] === "Revisado con supervisor", hoja[3]["Observaciones"]);
ok("se conserva la columna 'Sin disco duro'", hoja[0]["Sin disco duro"] === "SIN DISCO", hoja[0]["Sin disco duro"]);

// --- Recruce tras corregir el padrón ---
filasLote = [
    { id: "f1", ppu: "LXWP77", en_flota: false, sin_disco: false, interno: null, estado: "pendiente", obs: null, video_url: null },
    { id: "f2", ppu: "SKPK27", en_flota: false, sin_disco: false, interno: null, estado: "pendiente", obs: "Nota del supervisor", video_url: null },
];
updates.length = 0;
const loteId = insertados[0].lote_id as string;
await recruzarLote(loteId);
const u = Object.fromEntries(updates.map(x => [x.id as string, x]));
ok("al recruzar, el bus pasa a estar en flota", u["f1"]?.en_flota === true, u["f1"]);
ok("al recruzar, el bus sin disco recibe la observación", u["f1"]?.obs === OBS_SIN_DISCO, u["f1"]);
ok("al recruzar, la nota escrita a mano no se pisa", u["f2"]?.obs === "Nota del supervisor", u["f2"]);

fin();
