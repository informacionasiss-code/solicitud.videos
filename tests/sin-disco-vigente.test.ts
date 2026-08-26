// Conjunto vigente de buses sin disco, reuniendo las dos fuentes.
//
// Existe porque el mismo dato vive en dos sitios -la ficha del padrón y la
// sección Buses Sin Disco- y consultar sólo uno ya dejó al sistema sin avisar.
import { supabase } from "@/lib/supabase";
import { ok, fin } from "./_ayuda";

let PADRON_SIN_DISCO: { ppu: string }[] = [];
let REPORTES: { ppu: string }[] = [];
let fallaPadron = false;
let fallaReportes = false;

(supabase as { from: unknown }).from = (tabla: string) => {
    const esPadron = tabla === "padron_flota";
    const q: Record<string, unknown> = {
        select: () => q,
        eq: () =>
            Promise.resolve(
                esPadron
                    ? { data: fallaPadron ? null : PADRON_SIN_DISCO, error: fallaPadron ? { message: "boom" } : null }
                    : { data: fallaReportes ? null : REPORTES, error: fallaReportes ? { message: "boom" } : null }
            ),
    };
    return q;
};

const { traerPpusSinDisco } = await import("@/lib/fleet");

PADRON_SIN_DISCO = [{ ppu: "LXWP77" }];
REPORTES = [{ ppu: "SKPL36" }];
let r = await traerPpusSinDisco();
ok("incluye los del padrón", r.has("LXWP77"), [...r]);
ok("incluye los de Buses Sin Disco", r.has("SKPL36"), [...r]);
ok("no inventa otros", r.size === 2, [...r]);

PADRON_SIN_DISCO = [{ ppu: "LXWP77" }];
REPORTES = [{ ppu: "LXWP77" }];
r = await traerPpusSinDisco();
ok("un bus en ambas fuentes no se duplica", r.size === 1, [...r]);

PADRON_SIN_DISCO = [{ ppu: "lxwp-77" }];
REPORTES = [{ ppu: "SKPL 36" }];
r = await traerPpusSinDisco();
ok("normaliza las patentes de ambas fuentes", r.has("LXWP77") && r.has("SKPL36"), [...r]);

fallaPadron = true;
PADRON_SIN_DISCO = [{ ppu: "LXWP77" }];
REPORTES = [{ ppu: "SKPL36" }];
r = await traerPpusSinDisco();
ok("si falla el padrón, conserva los reportes", r.has("SKPL36") && !r.has("LXWP77"), [...r]);
fallaPadron = false;

fallaReportes = true;
r = await traerPpusSinDisco();
ok("si fallan los reportes, conserva el padrón", r.has("LXWP77") && !r.has("SKPL36"), [...r]);
fallaReportes = false;

PADRON_SIN_DISCO = [];
REPORTES = [];
r = await traerPpusSinDisco();
ok("sin buses sin disco devuelve un conjunto vacío", r.size === 0, [...r]);

fin();
