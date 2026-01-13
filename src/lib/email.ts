export const EMAIL_CONFIG = {
    to: ["cristian.luraschi@transdev.cl"],
    cc: [
        "isaac.avila@transdev.cl",
        "mario.millanao@transdev.cl"
    ]
};

export const generateEmailSubject = (case_number: string) => {
    return `Solicitud de Video - Caso ${case_number}`;
};

export const generateEmailBody = (request: any) => {
    const incidentDate = request.incident_at ? new Date(request.incident_at).toLocaleString('es-CL') : 'N/A';

    return `Estimados,

Junto con saludar, envío antecedentes para extracción de video:

Caso: ${request.case_number}
PPU: ${request.ppu}
Fecha Incidente: ${incidentDate}
Punto del Incidente: ${request.incident_point || 'N/A'}

Motivo: ${request.reason || 'N/A'}

Detalle:
${request.detail || 'N/A'}

Video URL: ${request.video_url || 'PENDIENTE'}

Saludos cordiales.
`;
};

// Generate HTML version for Resend - Enterprise Safe Design (Premium & Deliverable)
export const generateEmailHtml = (request: any) => {
    // Safe Date Parsing
    let incidentDate = 'N/A';
    try {
        if (request.incident_at) {
            incidentDate = new Date(request.incident_at).toLocaleString('es-CL');
        }
    } catch (e) {
        console.warn('[EMAIL] Date parsing failed', e);
        incidentDate = String(request.incident_at || 'N/A');
    }

    // Badge Logic (Table-based for compatibility)
    const getStatusContent = () => {
        try {
            if (request.video_url) {
                return `
                <table border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td style="background-color: #d1fae5; color: #065f46; border: 1px solid #34d399; padding: 6px 12px; border-radius: 16px; font-size: 11px; font-weight: bold; text-transform: uppercase; font-family: Helvetica, Arial, sans-serif;">
                            ✓ Video Disponible
                        </td>
                    </tr>
                </table>`;
            }

            const status = request.status || 'pendiente';
            const failure = request.failure_type;

            if (failure || (!request.video_url && ["enviado", "revisado"].includes(status))) {
                return `
                <table border="0" cellspacing="0" cellpadding="0">
                    <tr>
                        <td style="background-color: #fee2e2; color: #991b1b; border: 1px solid #f87171; padding: 6px 12px; border-radius: 16px; font-size: 11px; font-weight: bold; text-transform: uppercase; font-family: Helvetica, Arial, sans-serif;">
                            ✕ No Disponible
                        </td>
                    </tr>
                </table>`;
            }
            return `
            <table border="0" cellspacing="0" cellpadding="0">
                <tr>
                    <td style="background-color: #f1f5f9; color: #475569; border: 1px solid #cbd5e1; padding: 6px 12px; border-radius: 16px; font-size: 11px; font-weight: bold; text-transform: uppercase; font-family: Helvetica, Arial, sans-serif;">
                        Pendiente
                    </td>
                </tr>
            </table>`;
        } catch (error) {
            return '<span style="color: #64748b; font-weight: bold;"> ESTADO </span>';
        }
    };

    return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Reporte de Extracción</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f3f4f6; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif;">
    
    <!-- Outer Container -->
    <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #f3f4f6; padding: 40px 0;">
        <tr>
            <td align="center">
                <!-- Main Card -->
                <table border="0" cellpadding="0" cellspacing="0" width="600" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border: 1px solid #e5e7eb;">
                    
                    <!-- Header (Solid Blue - Safe) -->
                    <tr>
                        <td style="background-color: #1e3a8a; padding: 32px 40px; text-align: center;">
                            <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; text-transform: uppercase;">US El Roble</h1>
                            <p style="margin: 8px 0 0 0; color: #bfdbfe; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">Gestión de Evidencia Digital</p>
                        </td>
                    </tr>

                    <!-- Intro Section -->
                    <tr>
                        <td style="padding: 32px 40px 20px 40px; background-color: #ffffff;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td>
                                        <h2 style="margin: 0; color: #111827; font-size: 20px; font-weight: 700; margin-bottom: 4px;">Solicitud de Video</h2>
                                        <p style="margin: 0; color: #6b7280; font-size: 15px;">Caso Investigativo <strong>#${request.case_number || 'S/N'}</strong></p>
                                    </td>
                                    <td align="right" style="vertical-align: top;">
                                        ${getStatusContent()}
                                    </td>
                                </tr>
                            </table>
                            
                            <p style="margin-top: 24px; color: #374151; font-size: 15px; line-height: 1.6;">
                                Estimados, se adjuntan los antecedentes actualizados de la solicitud de video.
                            </p>
                        </td>
                    </tr>

                    <!-- Data Grid (Clean Table) -->
                    <tr>
                        <td style="padding: 0 40px 30px 40px;">
                            <table border="0" cellpadding="0" cellspacing="0" width="100%" style="border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden;">
                                <tr>
                                    <td width="30%" style="background-color: #f9fafb; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; color: #4b5563; font-size: 12px; font-weight: 700; text-transform: uppercase;">N° Caso</td>
                                    <td width="70%" style="background-color: #ffffff; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px; font-weight: 600;">#${request.case_number || '—'}</td>
                                </tr>
                                <tr>
                                    <td style="background-color: #f9fafb; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; color: #4b5563; font-size: 12px; font-weight: 700; text-transform: uppercase;">Fecha Incidente</td>
                                    <td style="background-color: #ffffff; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${incidentDate}</td>
                                </tr>
                                <tr>
                                    <td style="background-color: #f9fafb; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; color: #4b5563; font-size: 12px; font-weight: 700; text-transform: uppercase;">Patente (PPU)</td>
                                    <td style="background-color: #ffffff; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #1e40af; font-size: 15px; font-weight: 700;">${request.ppu || '—'}</td>
                                </tr>
                                <tr>
                                    <td style="background-color: #f9fafb; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; border-right: 1px solid #e5e7eb; color: #4b5563; font-size: 12px; font-weight: 700; text-transform: uppercase;">Ubicación</td>
                                    <td style="background-color: #ffffff; padding: 12px 16px; border-bottom: 1px solid #e5e7eb; color: #111827; font-size: 14px;">${request.incident_point || 'No registrada'}</td>
                                </tr>
                                <tr>
                                    <td style="background-color: #f9fafb; padding: 12px 16px; border-right: 1px solid #e5e7eb; color: #4b5563; font-size: 12px; font-weight: 700; text-transform: uppercase;">Motivo</td>
                                    <td style="background-color: #ffffff; padding: 12px 16px; color: #111827; font-size: 14px;">${request.reason || 'No registrado'}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- Details Section -->
                    <tr>
                        <td style="padding: 0 40px 30px 40px;">
                             <table border="0" cellpadding="0" cellspacing="0" width="100%">
                                <tr>
                                    <td style="padding-bottom: 8px; color: #374151; font-size: 13px; font-weight: 700; text-transform: uppercase;">Detalle Reportado</td>
                                </tr>
                                <tr>
                                    <td style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 16px; color: #475569; font-size: 14px; line-height: 1.6; font-style: italic;">
                                        "${(request.detail || 'Sin detalles adicionales.').replace(/\n/g, '<br>')}"
                                    </td>
                                </tr>
                             </table>
                        </td>
                    </tr>

                    <!-- Action Area -->
                    <tr>
                        <td style="padding: 0 40px 40px 40px; text-align: center;">
                            ${request.video_url ?
            `<!-- Download Button -->
                            <table border="0" cellpadding="0" cellspacing="0" align="center">
                                <tr>
                                    <td bgcolor="#1e40af" style="border-radius: 8px;">
                                        <a href="${request.video_url}" target="_blank" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: bold; border-radius: 8px; font-family: Helvetica, Arial, sans-serif;">
                                            📥 Descargar Evidencia
                                        </a>
                                    </td>
                                </tr>
                            </table>
                            <p style="margin: 12px 0 0 0; color: #94a3b8; font-size: 12px;">Enlace directo al servidor seguro</p>`
            :
            `<!-- Unavailable Warning -->
                             <table border="0" cellpadding="0" cellspacing="0" width="100%" style="background-color: #fef2f2; border: 1px solid #fecaca; border-radius: 8px;">
                                <tr>
                                    <td style="padding: 20px; text-align: center;">
                                        <p style="margin: 0 0 4px 0; color: #991b1b; font-size: 15px; font-weight: 700;">Evidencia No Disponible</p>
                                        <p style="margin: 0; color: #b91c1c; font-size: 13px;">
                                             ${(() => {
                const failureLabel = request.failure_type
                    ? (request.failure_type === 'disco_danado' ? 'Disco Dañado' :
                        request.failure_type === 'bus_sin_disco' ? 'Bus Sin Disco' :
                            request.failure_type === 'video_sobreescrito' ? 'Video Sobreescrito' :
                                request.failure_type === 'error_lectura' ? 'Error de Lectura' :
                                    request.failure_type === 'no_disponible' ? 'No Disponible' :
                                        request.failure_type)
                    : 'Motivo no especificado';
                return `Causa: ${failureLabel} ${request.obs ? `<br>Observación: ${request.obs}` : ''}`;
            })()}
                                        </p>
                                    </td>
                                </tr>
                             </table>`
        }
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background-color: #f8fafc; border-top: 1px solid #e5e7eb; padding: 24px 40px; text-align: center;">
                            <p style="margin: 0 0 8px 0; color: #64748b; font-size: 12px; font-weight: 600;">US EL ROBLE</p>
                            <p style="margin: 0; color: #94a3b8; font-size: 11px; line-height: 1.5;">
                                Este mensaje es confidencial y generado automáticamente.<br>
                                Favor no responder a este correo.
                            </p>
                            <p style="margin: 16px 0 0 0; color: #cbd5e1; font-size: 11px;">
                                © ${new Date().getFullYear()} Sistema de Gestión de Evidencia
                            </p>
                        </td>
                    </tr>

                </table>
                <!-- End Main Card -->
            </td>
        </tr>
    </table>
</body>
</html>
    `;
};

export const getMailtoUrl = (request: any) => {
    const subject = encodeURIComponent(generateEmailSubject(request?.case_number || ''));
    const rawBody = generateEmailBody(request || {});
    const bodyCRLF = rawBody.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
    const body = encodeURIComponent(bodyCRLF);
    const to = EMAIL_CONFIG.to.join(',');
    const cc = EMAIL_CONFIG.cc.join(',');
    return `mailto:${to}?cc=${cc}&subject=${subject}&body=${body}`;
};

// Generates full email text for clipboard copy
export const generateFullEmailText = (request: any) => {
    const subject = generateEmailSubject(request?.case_number || '');
    const body = generateEmailBody(request || {});
    const to = EMAIL_CONFIG.to.join('; ');
    const cc = EMAIL_CONFIG.cc.join('; ');

    return `PARA: ${to}

CC: ${cc}

ASUNTO: ${subject}

${body}`;
};

// Multi-method email opener with fallbacks (NO location.href to avoid blank page!)
export const openMailClient = (request: any): boolean => {
    const mailtoUrl = getMailtoUrl(request);

    console.log('[EMAIL] Attempting to open mail client...');
    console.log('[EMAIL] URL length:', mailtoUrl.length);

    // Method 1: Create and click anchor (safest - doesn't navigate away)
    try {
        console.log('[EMAIL] Method 1 (anchor click) triggered');
        const link = document.createElement('a');
        link.href = mailtoUrl;
        link.target = '_self';
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => {
            if (link.parentNode) {
                document.body.removeChild(link);
            }
        }, 100);
        return true;
    } catch (e) {
        console.warn('[EMAIL] Method 1 failed:', e);
    }

    // Method 2: Try window.open with _self (fallback)
    try {
        const newWindow = window.open(mailtoUrl, '_self');
        if (newWindow !== null) {
            console.log('[EMAIL] Method 2 (window.open) succeeded');
            return true;
        }
    } catch (e) {
        console.warn('[EMAIL] Method 2 failed:', e);
    }

    // NOTE: We intentionally DO NOT use window.location.href as it causes blank page in SPAs

    console.error('[EMAIL] All methods failed');
    return false;
};

// Copy all email data to clipboard
export const copyEmailToClipboard = async (request: any): Promise<boolean> => {
    try {
        const fullText = generateFullEmailText(request);
        await navigator.clipboard.writeText(fullText);
        console.log('[EMAIL] Copied to clipboard successfully');
        return true;
    } catch (e) {
        console.error('[EMAIL] Clipboard copy failed:', e);
        return false;
    }
};

// ============================================================================
// RESEND API INTEGRATION
// ============================================================================

// Get Supabase URL from environment
const getSupabaseUrl = (): string => {
    const url = import.meta.env.VITE_SUPABASE_URL;
    if (!url) {
        throw new Error('VITE_SUPABASE_URL not configured');
    }
    return url;
};

// Get Supabase anon key for authorization
const getSupabaseAnonKey = (): string => {
    const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!key) {
        throw new Error('VITE_SUPABASE_ANON_KEY not configured');
    }
    return key;
};

export interface SendEmailResult {
    success: boolean;
    message: string;
    data?: any;
}

// Send email via Resend through Supabase Edge Function
export const sendEmailViaResend = async (
    request: any,
    customConfig?: { to?: string[]; cc?: string[] }
): Promise<SendEmailResult> => {
    console.log('[RESEND] Starting email send...');

    try {
        const supabaseUrl = getSupabaseUrl();
        const supabaseKey = getSupabaseAnonKey();

        const subject = generateEmailSubject(request.case_number);
        const html = generateEmailHtml(request);
        const text = generateEmailBody(request);

        // Use custom recipients if provided, otherwise use defaults
        const toRecipients = customConfig?.to || EMAIL_CONFIG.to;
        const ccRecipients = customConfig?.cc || EMAIL_CONFIG.cc;

        const emailPayload = {
            to: toRecipients,
            cc: ccRecipients,
            subject,
            html,
            text,
        };

        console.log('[RESEND] Sending to:', toRecipients);
        console.log('[RESEND] CC:', ccRecipients);
        console.log('[RESEND] Subject:', subject);

        const response = await fetch(`${supabaseUrl}/functions/v1/send-email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${supabaseKey}`,
            },
            body: JSON.stringify(emailPayload),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
            console.error('[RESEND] Error:', result);
            return {
                success: false,
                message: result.error || 'Error al enviar el correo',
            };
        }

        console.log('[RESEND] Email sent successfully:', result);
        return {
            success: true,
            message: '¡Correo enviado exitosamente!',
            data: result.data,
        };
    } catch (error: any) {
        console.error('[RESEND] Exception:', error);
        return {
            success: false,
            message: error.message || 'Error de conexión al enviar el correo',
        };
    }
};
