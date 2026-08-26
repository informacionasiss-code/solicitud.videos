// Volver a enviar un caso ya enviado.
//
// El estado 'enviado' saca la solicitud de la bandeja de envíos, así que un
// correo despachado con datos mal configurados quedaba cerrado sin vuelta atrás.
import { supabase } from "@/lib/supabase";
import { esCorreoDeReenvio, generateEmailBody, generateEmailHtml, subjectForRequest } from "@/lib/email";
import { ok, fin } from "./_ayuda";

interface Fila { id: string; case_number: string; status: string; sent_at: string | null; reopened_at: string | null; send_count: number }
let FILAS: Fila[] = [];
let fallaUpdate = false;

// El código encadena de dos formas: `update().eq()` -que se espera
// directamente- y `update().eq().select()`. El doble devuelve un objeto que es
// a la vez esperable y encadenable, para cubrir ambas sin suponer un orden.
(supabase as { from: unknown }).from = () => {
    let cambios: Record<string, unknown> = {};

    const aplicar = (id: string) => {
        if (fallaUpdate) return { data: null, error: { message: "sin permisos" } };
        const fila = FILAS.find(f => f.id === id);
        if (!fila) return { data: [], error: null };
        Object.assign(fila, cambios);
        return { data: [{ case_number: fila.case_number }], error: null };
    };

    const q: Record<string, unknown> = {
        update: (c: Record<string, unknown>) => { cambios = c; return q; },
        select: () => q,
        eq: (_c: string, id: string) => {
            const resultado = aplicar(id);
            const esperable: Record<string, unknown> = {
                select: () => Promise.resolve(resultado),
                then: (res: (v: unknown) => unknown) => Promise.resolve(resultado).then(res),
            };
            return esperable;
        },
    };
    return q;
};

const { reabrirParaEnvio, registrarEnvio, esReenvio } = await import("@/lib/envioAutomatico");

// --- Reabrir ---
FILAS = [{ id: "1", case_number: "C-100", status: "enviado", sent_at: "2026-08-01T10:00:00Z", reopened_at: null, send_count: 1 }];
let r = await reabrirParaEnvio("1");
ok("reabrir devuelve ok", r.ok === true, r);
ok("el mensaje nombra el caso", r.mensaje.includes("C-100"), r.mensaje);
ok("el estado vuelve a Pendiente de Envío", FILAS[0].status === "pendiente_envio", FILAS[0]);
ok("NO se borra la constancia del envío previo", FILAS[0].sent_at === "2026-08-01T10:00:00Z", FILAS[0].sent_at);
ok("se registra cuándo se reabrió", Boolean(FILAS[0].reopened_at), FILAS[0].reopened_at);
ok("no se altera el contador de envíos", FILAS[0].send_count === 1, FILAS[0].send_count);

r = await reabrirParaEnvio("999");
ok("reabrir algo inexistente avisa", r.ok === false, r);
r = await reabrirParaEnvio("");
ok("reabrir sin identificador avisa", r.ok === false, r);

fallaUpdate = true;
r = await reabrirParaEnvio("1");
ok("un fallo de base se informa, no se oculta", r.ok === false && r.mensaje.includes("sin permisos"), r);
fallaUpdate = false;

// --- Registrar el envío ---
FILAS = [{ id: "2", case_number: "C-200", status: "pendiente_envio", sent_at: null, reopened_at: "2026-08-02T09:00:00Z", send_count: 1 }];
let e = await registrarEnvio("2", FILAS[0].send_count);
ok("registrar envío devuelve ok", e.ok === true, e);
ok("el estado pasa a enviado", FILAS[0].status === "enviado", FILAS[0]);
ok("el contador sube a 2", FILAS[0].send_count === 2, FILAS[0].send_count);
ok("deja de estar reabierto", FILAS[0].reopened_at === null, FILAS[0].reopened_at);
ok("se sella la fecha de envío", Boolean(FILAS[0].sent_at), FILAS[0].sent_at);

FILAS = [{ id: "3", case_number: "C-300", status: "pendiente_envio", sent_at: null, reopened_at: null, send_count: 0 }];
await registrarEnvio("3", undefined);
ok("un primer envío deja el contador en 1", FILAS[0].send_count === 1, FILAS[0].send_count);
await registrarEnvio("3", FILAS[0].send_count);
ok("un segundo envío lo deja en 2", FILAS[0].send_count === 2, FILAS[0].send_count);

// --- Detección de reenvío ---
ok("send_count 0 no es reenvío", esReenvio({ send_count: 0 }) === false);
ok("send_count 1 sí es reenvío", esReenvio({ send_count: 1 }) === true);
ok("sin dato no es reenvío", esReenvio({}) === false && esReenvio(null) === false);

// --- Lo que ve el destinatario ---
const base = { case_number: "C-100", ppu: "SKPK27", incident_at: "2026-07-08T10:00", incident_point: "Av. X", reason: "M", detail: "D", video_url: "https://v/1" };
const primero = { ...base, send_count: 0 };
const segundo = { ...base, send_count: 1 };

ok("un primer envío no se marca como reenvío", esCorreoDeReenvio(primero) === false);
ok("un segundo envío sí", esCorreoDeReenvio(segundo) === true);
ok("el cuerpo del primer envío no menciona reenvío", !generateEmailBody(primero).includes("REENVIO"));
ok("el cuerpo del reenvío lo advierte", generateEmailBody(segundo).includes("REENVIO"), generateEmailBody(segundo).slice(0, 120));
ok("el reenvío dice que descarten la versión previa", generateEmailBody(segundo).includes("descartar la previa"));
ok("el HTML del reenvío lo advierte", generateEmailHtml(segundo).includes("REENVÍO"));
ok("el HTML del primer envío no", !generateEmailHtml(primero).includes("REENVÍO"));
ok("el asunto NO cambia entre envíos", subjectForRequest(primero) === subjectForRequest(segundo), [subjectForRequest(primero), subjectForRequest(segundo)]);
ok("el reenvío conserva el resto del contenido", generateEmailBody(segundo).includes("https://v/1"));

fin();
