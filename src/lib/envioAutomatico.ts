import { supabase } from "@/lib/supabase";
import { sendEmailViaResend } from "@/lib/email";
import { SIN_DISCO_MENSAJE } from "@/lib/fleet";

// ============================================================================
// Envío inmediato para buses sin disco duro.
//
// Un bus sin disco no tiene nada que revisar: esperar no cambia el resultado.
// En cuanto se registra la solicitud se despacha el correo informando que no
// hay grabación y el caso queda cerrado como enviado, sin pasar por la cola de
// revisión ni por la bandeja de envíos.
// ============================================================================

export interface EnvioAutomaticoResult {
    enviado: boolean;
    mensaje: string;
}

/**
 * Despacha el correo de "bus sin disco" y cierra la solicitud.
 *
 * El estado sólo pasa a 'enviado' si el correo salió de verdad. Si el envío
 * falla, la solicitud queda en 'pendiente_envio' y aparece en la bandeja de
 * Envíos para reintentarla a mano: marcarla como enviada sin haber enviado
 * nada sería peor que no intentarlo.
 */
export async function enviarSolicitudSinDisco(
    solicitud: Record<string, unknown> & { id?: string }
): Promise<EnvioAutomaticoResult> {
    if (!solicitud?.id) {
        return { enviado: false, mensaje: "La solicitud no tiene id; no se puede cerrar el envío." };
    }

    try {
        const resultado = await sendEmailViaResend(solicitud);

        if (!resultado.success) {
            console.error("[ENVIO-AUTO] El correo no salió:", resultado.message);
            return {
                enviado: false,
                mensaje: `No se pudo enviar el correo (${resultado.message}). La solicitud quedó pendiente de envío.`,
            };
        }

        const { error } = await supabase
            .from("solicitudes")
            .update({
                status: "enviado",
                sent_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            })
            .eq("id", solicitud.id);

        if (error) {
            // El correo ya salió: avisar de la discrepancia en vez de callarla,
            // porque reintentar el envío duplicaría el mensaje al destinatario.
            console.error("[ENVIO-AUTO] Correo enviado pero no se pudo marcar:", error);
            return {
                enviado: true,
                mensaje: "El correo se envió, pero no se pudo marcar la solicitud como enviada. Márcala a mano.",
            };
        }

        return {
            enviado: true,
            mensaje: `Correo enviado y caso cerrado — ${SIN_DISCO_MENSAJE}`,
        };
    } catch (e) {
        console.error("[ENVIO-AUTO] Excepción:", e);
        return {
            enviado: false,
            mensaje: "Error inesperado al enviar el correo. La solicitud quedó pendiente de envío.",
        };
    }
}
