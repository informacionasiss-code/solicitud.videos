// Comportamiento ante los cinco tipos de falla.
//
// Cualquiera de ellos significa lo mismo para el trámite: no habrá grabación.
// Antes sólo la falta de disco cerraba el caso; los otros cuatro dejaban el
// campo de URL pidiendo un enlace que no existe y el caso sin avanzar.
import { esFallaRegistrada, etiquetaFalla, FAILURE_TYPES } from "@/lib/schemas";
import {
    esBusSinDisco, tieneFallaRegistrada, motivoSinVideo,
    generateEmailBody, generateEmailHtml,
} from "@/lib/email";
import { ok, fin } from "./_ayuda";

const TIPOS = Object.keys(FAILURE_TYPES) as (keyof typeof FAILURE_TYPES)[];
ok("hay cinco tipos de falla", TIPOS.length === 5, TIPOS);

for (const t of TIPOS) {
    ok(`'${t}' se reconoce como falla`, esFallaRegistrada(t) === true);
    ok(`'${t}' tiene etiqueta legible`, Boolean(etiquetaFalla(t)), etiquetaFalla(t));
}

ok("una cadena vacía no es falla", esFallaRegistrada("") === false);
ok("null no es falla", esFallaRegistrada(null) === false);
ok("undefined no es falla", esFallaRegistrada(undefined) === false);
ok("un valor inventado no es falla", esFallaRegistrada("cualquier_cosa") === false);
ok("etiquetaFalla de algo inválido devuelve null", etiquetaFalla("xx") === null);

const base = {
    case_number: "C-1", ppu: "SKPK27", incident_at: "2026-07-08T10:00",
    incident_point: "Av. X", reason: "Motivo", detail: "Detalle",
};

// --- Todos los tipos cierran el caso ---
for (const t of TIPOS) {
    const req = { ...base, failure_type: t, video_url: null, sin_disco: t === "bus_sin_disco" };
    ok(`'${t}' cuenta como falla registrada`, tieneFallaRegistrada(req) === true, req.failure_type);
    ok(`'${t}' aporta un motivo para el correo`, Boolean(motivoSinVideo(req)), motivoSinVideo(req));

    const txt = generateEmailBody(req);
    ok(`'${t}': el correo NO promete un enlace pendiente`, !txt.includes("Video URL: PENDIENTE"), txt.match(/Video URL:.*/)?.[0]);
    ok(`'${t}': el correo dice que no aplica`, txt.includes("Video URL: NO APLICA"), txt.match(/Video URL:.*/)?.[0]);

    const html = generateEmailHtml(req);
    ok(`'${t}': el HTML no ofrece descarga`, !html.includes("Descargar Evidencia"));
}

// --- 'sobreescrito' en concreto, que es el caso reportado ---
const sobre = { ...base, failure_type: "video_sobreescrito", video_url: null, sin_disco: false };
ok("sobreescrito NO se confunde con bus sin disco", esBusSinDisco(sobre) === false);
ok("sobreescrito trae su propio motivo", motivoSinVideo(sobre) === "Video Sobreescrito", motivoSinVideo(sobre));
const txtSobre = generateEmailBody(sobre);
ok("el correo nombra el motivo real", txtSobre.includes("VIDEO SOBREESCRITO"), txtSobre.match(/Video URL:.*/)?.[0]);
ok("el correo no menciona falta de disco", !txtSobre.includes("NO TIENE DISCO"));
ok("el HTML nombra el motivo", generateEmailHtml(sobre).includes("Video Sobreescrito"));

// --- Con URL pero también con falla: manda la falla ---
const conflicto = { ...base, failure_type: "video_sobreescrito", video_url: "https://v/1", sin_disco: false };
ok("una falla registrada anula una URL residual",
   !generateEmailHtml(conflicto).includes("Descargar Evidencia"));

// --- Caso normal: nada cambia ---
const normal = { ...base, failure_type: null, video_url: "https://v/1", sin_disco: false };
ok("un caso con video no tiene falla", tieneFallaRegistrada(normal) === false);
ok("un caso con video no tiene motivo", motivoSinVideo(normal) === null);
ok("un caso con video sí ofrece descarga", generateEmailHtml(normal).includes("Descargar Evidencia"));
ok("un caso con video conserva la URL", generateEmailBody(normal).includes("https://v/1"));

const pendiente = { ...base, failure_type: null, video_url: null, sin_disco: false };
ok("un caso aún sin resolver sigue diciendo PENDIENTE",
   generateEmailBody(pendiente).includes("Video URL: PENDIENTE"));

fin();
