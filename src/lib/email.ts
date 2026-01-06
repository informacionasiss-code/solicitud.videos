export const EMAIL_CONFIG = {
    to: ["sebastian.nunez@transdev.cl", "cristian.luraschi@transdev.cl"],
    cc: [
        "christ.faus@transdev.cl",
        "operacioner@transdev.cl",
        "atencionusuarios@groups.transdev.com",
        "daniela.perez@transdev.cl",
        "isaac.avila@transdev.cl",
        "leonardo.victoriano@transdev.cl",
        "mario.millanao@transdev.cl",
        "cristian.luraschi@transdev.cl"
    ]
};

export const generateEmailSubject = (case_number: string) => {
    return `EXTRACCION DE VIDEO - Investigación Caso ${case_number}`;
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

// Generate HTML version for Resend - Professional Corporate Design
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

    // Status Logic for Badge (Robust)
    const getStatusBadge = () => {
        try {
            if (request.video_url) return '<span style="background-color: #ecfdf5; color: #047857; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; border: 1px solid #a7f3d0; letter-spacing: 0.5px; white-space: nowrap;">VIDEO DISPONIBLE</span>';
            const status = request.status || 'pendiente';
            const failure = request.failure_type;

            if (failure || (!request.video_url && ["enviado", "revisado"].includes(status))) {
                return '<span style="background-color: #fef2f2; color: #b91c1c; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; border: 1px solid #fecaca; letter-spacing: 0.5px; white-space: nowrap;">NO DISPONIBLE</span>';
            }
            return '<span style="background-color: #f1f5f9; color: #475569; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; border: 1px solid #e2e8f0; letter-spacing: 0.5px; white-space: nowrap;">PENDIENTE</span>';
        } catch (error) {
            return '<span style="background-color: #f1f5f9; color: #475569; padding: 4px 12px; border-radius: 9999px; font-size: 11px; font-weight: 700; border: 1px solid #e2e8f0; letter-spacing: 0.5px; white-space: nowrap;">ESTADO</span>';
        }
    };

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Reporte de Extracción</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
    <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05); margin-top: 40px; margin-bottom: 40px;">
        
        <!-- HEADER -->
        <div style="background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%); padding: 32px 40px; text-align: center; border-bottom: 1px solid #334155;">
            <div style="color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: 1px; margin-bottom: 6px;">US EL ROBLE</div>
            <div style="color: #94a3b8; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 2px;">Gestión de Evidencia Digital</div>
        </div>

        <!-- HERO SECTION -->
        <div style="padding: 32px 40px 24px 40px; border-bottom: 1px solid #f1f5f9;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
                <h1 style="margin: 0; color: #0f172a; font-size: 20px; font-weight: 700;">Reporte de Extracción</h1>
                ${getStatusBadge()}
            </div>
            <p style="margin: 0; color: #64748b; font-size: 15px; line-height: 1.6;">
                Se ha generado un nuevo reporte de extracción de video asociado al caso <strong>#${request.case_number || 'S/N'}</strong>.
            </p>
        </div>

        <!-- DATA GRID -->
        <div style="padding: 0 40px; background-color: #f8fafc;">
            <table style="width: 100%; border-collapse: separate; border-spacing: 0;">
                <tr>
                    <td style="padding: 20px 0; border-bottom: 1px solid #e2e8f0; width: 35%;">
                         <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px;">N° Caso</div>
                        <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 4px;">#${request.case_number || '—'}</div>
                    </td>
                    <td style="padding: 20px 0; border-bottom: 1px solid #e2e8f0;">
                         <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px;">Fecha Incidente</div>
                        <div style="font-size: 15px; font-weight: 600; color: #0f172a; margin-top: 4px;">${incidentDate}</div>
                    </td>
                </tr>
                <tr>
                    <td style="padding: 20px 0; border-bottom: 1px solid #e2e8f0;">
                         <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px;">Patente (PPU)</div>
                        <div style="font-size: 18px; font-weight: 800; color: #2563eb; margin-top: 4px;">${request.ppu || '—'}</div>
                    </td>
                    <td style="padding: 20px 0; border-bottom: 1px solid #e2e8f0;">
                         <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px;">Ubicación</div>
                        <div style="font-size: 14px; font-weight: 500; color: #334155; margin-top: 4px;">${request.incident_point || 'Sin ubicación registrada'}</div>
                    </td>
                </tr>
                 <tr>
                    <td colspan="2" style="padding: 20px 0;">
                         <div style="font-size: 11px; font-weight: 700; text-transform: uppercase; color: #94a3b8; letter-spacing: 0.5px;">Motivo</div>
                        <div style="font-size: 14px; font-weight: 500; color: #334155; margin-top: 4px;">${request.reason || 'Sin motivo registrado'}</div>
                    </td>
                </tr>
            </table>
        </div>

        <!-- DETAILS & ACTIONS -->
        <div style="padding: 32px 40px; background-color: #ffffff;">
            
            <div style="margin-bottom: 32px;">
                <div style="font-size: 12px; font-weight: 700; text-transform: uppercase; color: #0f172a; margin-bottom: 12px; border-left: 4px solid #2563eb; padding-left: 12px;">Detalle del Incidente</div>
                <div style="background-color: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0; font-size: 14px; color: #475569; line-height: 1.6;">
                    ${(request.detail || 'Sin detalles adicionales.').replace(/\n/g, '<br>')}
                </div>
            </div>

            ${request.video_url ?
            `<div style="text-align: center; margin-top: 40px;">
                <a href="${request.video_url}" target="_blank" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 16px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(15, 23, 42, 0.2); transition: all 0.2s;">
                    📥 Descargar Evidencia de Video
                </a>
                <p style="margin-top: 16px; font-size: 12px; color: #94a3b8;">Enlace seguro de descarga directa</p>
            </div>` :
            `<div style="background-color: #fff1f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; text-align: center;">
                 <div style="color: #be123c; font-weight: 700; font-size: 15px; margin-bottom: 4px;">Evidencia No Disponible</div>
                 <div style="color: #881337; font-size: 13px;">
                    ${(() => {
                const failureLabel = request.failure_type
                    ? (request.failure_type === 'disco_danado' ? 'Disco Dañado' :
                        request.failure_type === 'bus_sin_disco' ? 'Bus Sin Disco' :
                            request.failure_type === 'video_sobreescrito' ? 'Video Sobreescrito' :
                                request.failure_type === 'error_lectura' ? 'Error de Lectura' :
                                    request.failure_type === 'no_disponible' ? 'No Disponible' :
                                        request.failure_type)
                    : 'Motivo no especificado';
                return `Razón: ${failureLabel} ${request.obs ? `<br>Observación: ${request.obs}` : ''}`;
            })()}
                 </div>
            </div>`
        }

        </div>

        <!-- FOOTER -->
        <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 32px 40px; text-align: center;">
            <div style="margin-bottom: 12px;">
                <span style="font-weight: 700; color: #0f172a; font-size: 14px;">US EL ROBLE</span>
            </div>
            <p style="font-size: 11px; color: #94a3b8; line-height: 1.5; margin: 0;">
                Este correo electrónico es generado automáticamente. Por favor no responder a esta dirección.<br>
                La información contenida en este mensaje es confidencial y exclusiva para el destinatario.
            </p>
            <div style="margin-top: 24px; font-size: 11px; color: #cbd5e1;">
                © ${new Date().getFullYear()} Sistema de Gestión de Videos
            </div>
        </div>

    </div>
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
        console.log('[EMAIL] Method 1 (anchor click) triggered');
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
