// Validación del formulario de solicitudes.
//
// Estos casos existen por un fallo real: Postgres devuelve null en las columnas
// vacías, y el esquema los rechazaba. El usuario no podía guardar ni cerrar un
// caso, y el error señalaba un campo que ni siquiera edita. Se cubren las tres
// formas de "sin valor" -null, cadena vacía y ausente- en todos los opcionales.
import { requestSchema, vacioANulo } from "@/lib/schemas";
import { ok, fin } from "./_ayuda";

const OPCIONALES = [
    "incident_at", "ingress_at", "incident_point", "reason", "detail",
    "video_url", "obs", "operator_name", "operator_rut", "failure_type",
    "fleet_status", "sin_disco", "sin_disco_source",
];

const base: Record<string, unknown> = {
    case_number: "723517-20260708-SU3025", ppu: "SHXF14", status: "pendiente_envio",
    incident_at: "2026-07-08T10:00", ingress_at: "2026-07-08T00:00",
    incident_point: "Av. X", reason: "Motivo", detail: "Detalle",
    video_url: "https://v/1", obs: "SIN DISCO", operator_name: "Juan",
    operator_rut: "1-9", failure_type: "bus_sin_disco",
    fleet_status: "en_flota", sin_disco: true, sin_disco_source: "flota",
};

const explica = (r: ReturnType<typeof requestSchema.safeParse>) =>
    r.success ? "" : r.error.issues.map(i => `${i.path.join(".")}: ${i.message}`).join(" | ");

let malos: string[] = [];
for (const campo of OPCIONALES) {
    for (const valor of [null, "", undefined]) {
        const r = requestSchema.safeParse({ ...base, [campo]: valor });
        if (!r.success) malos.push(`${campo}=${valor === null ? "null" : valor === "" ? '""' : "undefined"}`);
    }
}
ok(`los ${OPCIONALES.length} campos opcionales aceptan null, "" y undefined`, malos.length === 0, malos);

const todos = (v: unknown) => { const o = { ...base }; for (const c of OPCIONALES) o[c] = v; return o; };
ok("todos los opcionales en null", requestSchema.safeParse(todos(null)).success, explica(requestSchema.safeParse(todos(null))));
ok('todos los opcionales en ""', requestSchema.safeParse(todos("")).success, explica(requestSchema.safeParse(todos(""))));
ok("todos los opcionales ausentes", requestSchema.safeParse({ case_number: "X-1", ppu: "SHXF14", status: "pendiente" }).success);

ok('vacioANulo("") -> null', vacioANulo("") === null);
ok("vacioANulo(undefined) -> null", vacioANulo(undefined) === null);
ok("vacioANulo(null) -> null", vacioANulo(null) === null);
ok('vacioANulo("flota") no toca el valor', vacioANulo("flota") === "flota");
ok("vacioANulo(false) no lo convierte en null", vacioANulo(false) === false);

ok("case_number vacío sigue fallando", !requestSchema.safeParse({ ...base, case_number: "" }).success);
ok("ppu corta sigue fallando", !requestSchema.safeParse({ ...base, ppu: "AB" }).success);
ok("status inválido sigue fallando", !requestSchema.safeParse({ ...base, status: "xx" }).success);
ok("fleet_status inválido sigue fallando", !requestSchema.safeParse({ ...base, fleet_status: "xx" }).success);
ok("sin_disco_source inválido sigue fallando", !requestSchema.safeParse({ ...base, sin_disco_source: "xx" }).success);

// El registro exacto que bloqueaba el envío en producción.
const caso = {
    case_number: "723517-20260708-SU3025", ppu: "SHXF14", status: "pendiente_envio",
    incident_at: "2026-07-08T10:00", ingress_at: "2026-07-08T00:00",
    incident_point: "Av. X", reason: "Motivo", detail: "Detalle",
    video_url: null, obs: "SIN DISCO", operator_name: null, operator_rut: null,
    failure_type: "bus_sin_disco", fleet_status: "en_flota", sin_disco: true, sin_disco_source: null,
};
const r = requestSchema.safeParse(caso);
ok("el caso que bloqueaba el envío ahora valida", r.success, explica(r));

fin();
