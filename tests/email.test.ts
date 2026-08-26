// El aviso de bus sin disco en el correo. Es lo que el destinatario lee para
// entender que no habrá grabación, así que la frase tiene que aparecer sí o sí.
import { generateEmailBody, generateEmailHtml, subjectForRequest, esBusSinDisco } from "@/lib/email";
import { SIN_DISCO_MENSAJE } from "@/lib/fleet";
import { ok, fin } from "./_ayuda";

ok("detecta por el campo sin_disco", esBusSinDisco({ sin_disco: true }) === true);
ok("detecta por failure_type", esBusSinDisco({ failure_type: "bus_sin_disco" }) === true);
ok("un caso normal no se marca", esBusSinDisco({ failure_type: null }) === false);
ok("otra falla no cuenta como falta de disco", esBusSinDisco({ failure_type: "disco_danado" }) === false);
ok("sin datos no revienta", esBusSinDisco(null) === false && esBusSinDisco(undefined) === false);

const sinDisco = {
    case_number: "608608-20260217-SU3025", ppu: "LXWP77",
    incident_at: "2026-02-17T10:30:00Z", incident_point: "Av. Pajaritos",
    reason: "Colisión", detail: "Detalle del caso",
    sin_disco: true, failure_type: "bus_sin_disco", video_url: null,
};
const normal = { ...sinDisco, sin_disco: false, failure_type: null, video_url: "https://video/1" };

const asunto = subjectForRequest(sinDisco);
ok("el asunto lleva la frase", asunto.includes(SIN_DISCO_MENSAJE), asunto);
ok("el asunto conserva el número de caso", asunto.includes("608608-20260217-SU3025"));
ok("un caso normal no lleva la frase en el asunto", !subjectForRequest(normal).includes(SIN_DISCO_MENSAJE));

const txt = generateEmailBody(sinDisco);
ok("el cuerpo de texto lleva la frase", txt.includes(SIN_DISCO_MENSAJE));
ok("el cuerpo dice que el video no aplica", txt.includes("Video URL: NO APLICA"));
ok("el cuerpo no promete un video pendiente", !txt.includes("Video URL: PENDIENTE"));
const txtN = generateEmailBody(normal);
ok("un caso normal no lleva la frase", !txtN.includes(SIN_DISCO_MENSAJE));
ok("un caso normal conserva la URL", txtN.includes("https://video/1"));

const html = generateEmailHtml(sinDisco);
ok("el HTML lleva la frase", html.includes(SIN_DISCO_MENSAJE));
ok("el HTML marca la patente", html.includes("SIN DISCO DURO"));
ok("el HTML no ofrece descargar algo inexistente", !html.includes("Descargar Evidencia"));
const htmlN = generateEmailHtml(normal);
ok("un caso normal no lleva la frase en el HTML", !htmlN.includes(SIN_DISCO_MENSAJE));
ok("un caso normal sí ofrece la descarga", htmlN.includes("Descargar Evidencia"));

// Marcado a mano por el operador, sin pasar por el padrón.
const manual = { ...normal, video_url: null, failure_type: "bus_sin_disco" };
ok("marcado manual dispara el asunto", subjectForRequest(manual).includes(SIN_DISCO_MENSAJE));
ok("marcado manual dispara el HTML", generateEmailHtml(manual).includes(SIN_DISCO_MENSAJE));

fin();
