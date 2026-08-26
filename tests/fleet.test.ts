// Cruce de una PPU contra el padrón.
//
// La regresión que cubren estos casos dejó al sistema sin avisar de ningún bus
// sin disco: al derivar el dato sólo del padrón, y con el padrón aún sin migrar,
// todas las consultas caían en una salida temprana que devolvía "tiene disco".
import { supabase } from "@/lib/supabase";
import { normalizePpu, isPpuLookupable } from "@/lib/fleet";
import { ok, fin } from "./_ayuda";

ok("normaliza guiones y puntos", normalizePpu("bxgh-12") === "BXGH12" && normalizePpu(" BX.GH 12 ") === "BXGH12");
ok("tolera nulos", normalizePpu(null) === "" && normalizePpu(undefined) === "");
ok("una PPU corta no se consulta", isPpuLookupable("BX") === false);
ok("una PPU de 4+ sí se consulta", isPpuLookupable("BXGH12") === true);

interface Escenario { padronExiste: boolean; padronFilas: number; bus: unknown; reporte: unknown }
let esc: Escenario;

(supabase as { from: unknown }).from = (tabla: string) => {
    if (tabla === "bus_failures") {
        const q: Record<string, unknown> = {
            select: () => q, eq: () => q, order: () => q,
            limit: () => Promise.resolve({ data: esc.reporte ? [esc.reporte] : [], error: null }),
        };
        return q;
    }
    const err = { code: "42P01", message: "does not exist" };
    const q: Record<string, unknown> = {
        select: (_c?: string, o?: { head?: boolean }) =>
            o?.head
                ? Promise.resolve(esc.padronExiste ? { count: esc.padronFilas, error: null } : { count: null, error: err })
                : q,
        eq: () => q,
        maybeSingle: () => Promise.resolve(esc.padronExiste ? { data: esc.bus, error: null } : { data: null, error: err }),
    };
    return q;
};

const REPORTE = { id: "r1", ppu: "LXWP77", failure_type: "bus_sin_disco", created_at: "2026-01-01" };

const { checkPpu, invalidateFleetCache } = await import("@/lib/fleet");
const consultar = async (ppu: string) => { invalidateFleetCache(); return checkPpu(ppu); };

esc = { padronExiste: false, padronFilas: 0, bus: null, reporte: REPORTE };
let r = await consultar("LXWP77");
ok("sin padrón, un reporte previo sí alerta", r.sinDisco === true, r);
ok("  registra el origen del dato", r.sinDiscoSource === "bus_failures", r.sinDiscoSource);
ok("  no afirma que el bus sea ajeno", r.status === "desconocido", r.status);

esc = { padronExiste: true, padronFilas: 0, bus: null, reporte: REPORTE };
r = await consultar("LXWP77");
ok("con el padrón vacío, el reporte sigue alertando", r.sinDisco === true, r);

esc = { padronExiste: true, padronFilas: 215, bus: { id: "b", ppu: "LXWP77", tiene_disco: false, activo: true, interno: "1695" }, reporte: null };
r = await consultar("LXWP77");
ok("el padrón manda cuando dice que no hay disco", r.sinDisco === true && r.sinDiscoSource === "flota", r);
ok("  y el bus queda en flota", r.status === "en_flota", r.status);

esc = { padronExiste: true, padronFilas: 215, bus: { id: "b", ppu: "LXWP77", tiene_disco: true, activo: true }, reporte: REPORTE };
r = await consultar("LXWP77");
ok("con la ficha desactualizada, el reporte igual alerta", r.sinDisco === true, r);

esc = { padronExiste: true, padronFilas: 215, bus: { id: "b", ppu: "SKPK27", tiene_disco: true, activo: true }, reporte: null };
r = await consultar("SKPK27");
ok("un bus con disco no alerta", r.sinDisco === false, r);

esc = { padronExiste: true, padronFilas: 215, bus: { id: "b", ppu: "SKPK27", tiene_disco: true, activo: true }, reporte: { ...REPORTE, failure_type: "disco_danado" } };
r = await consultar("SKPK27");
ok("'disco_danado' no se confunde con falta de disco", r.sinDisco === false, r);

esc = { padronExiste: true, padronFilas: 215, bus: null, reporte: null };
r = await consultar("ZZZZ99");
ok("ausente de un padrón cargado = fuera de flota", r.status === "fuera_de_flota", r.status);

esc = { padronExiste: false, padronFilas: 0, bus: null, reporte: null };
r = await consultar("ZZZZ99");
ok("sin padrón NO se bloquea a nadie", r.status !== "fuera_de_flota", r.status);

r = await consultar("BX");
ok("una PPU incompleta no consulta nada", r.status === "desconocido" && r.unknownReason === "ppu_incompleta", r);

fin();
