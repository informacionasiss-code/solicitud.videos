// Quitar un bus de la lista de "sin disco".
//
// La marca vive en dos sitios y el cruce consulta los dos. Corregir sólo uno
// dejaba el bus marcado igualmente, que es lo que hacía que un bus con disco
// siguiera apareciendo después de corregir su ficha.
import { supabase } from "@/lib/supabase";
import { ok, fin } from "./_ayuda";

interface Registro { ppu: string; failure_type: string; id: string }

let PADRON: { ppu: string; tiene_disco: boolean }[] = [];
let REPORTES: Registro[] = [];
let fallaPadron = false;
let fallaBorrado = false;

const llamadas: { tabla: string; op: string; filtros: Record<string, unknown> }[] = [];

(supabase as { from: unknown }).from = (tabla: string) => {
    let op = "select";
    let cambios: Record<string, unknown> | null = null;
    const filtros: Record<string, unknown> = {};

    const q: Record<string, unknown> = {
        update: (c: Record<string, unknown>) => { op = "update"; cambios = c; return q; },
        delete: () => { op = "delete"; return q; },
        select: () => q,
        eq: (col: string, val: unknown) => { filtros[col] = val; return q; },
        then: (res: (v: unknown) => unknown) => {
            llamadas.push({ tabla, op, filtros: { ...filtros } });

            if (tabla === "padron_flota" && op === "update") {
                if (fallaPadron) return Promise.resolve({ data: null, error: { message: "sin permisos" } }).then(res);
                const tocados = PADRON.filter(b => b.ppu === filtros.ppu);
                for (const b of tocados) b.tiene_disco = (cambios as { tiene_disco?: boolean })?.tiene_disco ?? true;
                return Promise.resolve({ data: tocados.map(() => ({ id: "x" })), error: null }).then(res);
            }
            if (tabla === "bus_failures" && op === "delete") {
                if (fallaBorrado) return Promise.resolve({ data: null, error: { message: "sin permisos" } }).then(res);
                const borrados = REPORTES.filter(r => r.ppu === filtros.ppu && r.failure_type === filtros.failure_type);
                REPORTES = REPORTES.filter(r => !borrados.includes(r));
                return Promise.resolve({ data: borrados.map(r => ({ id: r.id })), error: null }).then(res);
            }
            return Promise.resolve({ data: [], error: null }).then(res);
        },
    };
    return q;
};

const { quitarDeSinDisco, marcarSinDisco } = await import("@/lib/fleet");

// --- Marcado en las DOS fuentes ---
PADRON = [{ ppu: "LXWP77", tiene_disco: false }];
REPORTES = [{ id: "r1", ppu: "LXWP77", failure_type: "bus_sin_disco" }];
let r = await quitarDeSinDisco("LXWP77");
ok("corrige la ficha del padrón", r.padronActualizado === true, r);
ok("elimina el reporte", r.reportesEliminados === 1, r);
ok("no reporta errores", r.errores.length === 0, r.errores);
ok("la ficha queda con disco", PADRON[0].tiene_disco === true, PADRON);
ok("no queda ningún reporte", REPORTES.length === 0, REPORTES);

// --- Sólo por reporte: la ficha decía que sí tenía disco ---
PADRON = [{ ppu: "SKPL36", tiene_disco: true }];
REPORTES = [{ id: "r2", ppu: "SKPL36", failure_type: "bus_sin_disco" }];
r = await quitarDeSinDisco("SKPL36");
ok("elimina el reporte aunque la ficha ya estuviera bien", r.reportesEliminados === 1, r);
ok("el bus deja de estar marcado", REPORTES.length === 0, REPORTES);

// --- Varios reportes del mismo bus ---
PADRON = [{ ppu: "AAAA11", tiene_disco: false }];
REPORTES = [
    { id: "a", ppu: "AAAA11", failure_type: "bus_sin_disco" },
    { id: "b", ppu: "AAAA11", failure_type: "bus_sin_disco" },
    { id: "c", ppu: "AAAA11", failure_type: "disco_danado" },
    { id: "d", ppu: "BBBB22", failure_type: "bus_sin_disco" },
];
r = await quitarDeSinDisco("AAAA11");
ok("elimina todos los reportes de ese bus", r.reportesEliminados === 2, r);
ok("respeta otras fallas del mismo bus", REPORTES.some(x => x.id === "c"), REPORTES);
ok("no toca los reportes de otros buses", REPORTES.some(x => x.id === "d"), REPORTES);

// --- Normalización ---
PADRON = [{ ppu: "LXWP77", tiene_disco: false }];
REPORTES = [{ id: "r3", ppu: "LXWP77", failure_type: "bus_sin_disco" }];
r = await quitarDeSinDisco("lxwp-77");
ok("acepta la patente con guion y minúsculas", r.ppu === "LXWP77" && r.reportesEliminados === 1, r);

// --- Errores: se informan, no se ocultan ---
PADRON = [{ ppu: "LXWP77", tiene_disco: false }];
REPORTES = [{ id: "r4", ppu: "LXWP77", failure_type: "bus_sin_disco" }];
fallaBorrado = true;
r = await quitarDeSinDisco("LXWP77");
ok("si el borrado falla, se informa", r.errores.length === 1, r.errores);
ok("  y no se dice que se eliminó nada", r.reportesEliminados === 0, r);
fallaBorrado = false;

fallaPadron = true;
r = await quitarDeSinDisco("LXWP77");
ok("si el padrón falla, se informa", r.errores.some(e => e.startsWith("Padrón")), r.errores);
fallaPadron = false;

// --- Un bus que no está marcado en ninguna parte ---
PADRON = [{ ppu: "SKPK27", tiene_disco: true }];
REPORTES = [];
r = await quitarDeSinDisco("SKPK27");
ok("un bus ya correcto no rompe nada", r.errores.length === 0 && r.reportesEliminados === 0, r);

// --- PPU vacía ---
r = await quitarDeSinDisco("");
ok("una PPU vacía se rechaza", r.errores.length === 1, r.errores);

// --- Marcar ---
PADRON = [{ ppu: "SKPK27", tiene_disco: true }];
llamadas.length = 0;
try {
    await marcarSinDisco("skpk-27");
    ok("marcar normaliza la patente", llamadas.some(l => l.filtros.ppu === "SKPK27"), llamadas);
    ok("marcar deja la ficha sin disco", PADRON[0].tiene_disco === false, PADRON);
} catch (e) {
    ok("marcar no debería fallar", false, String(e));
}

PADRON = [];
let fallo = false;
try { await marcarSinDisco("ZZZZ99"); } catch { fallo = true; }
ok("marcar una PPU ausente del padrón falla con aviso", fallo === true);

fin();
