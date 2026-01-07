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

// Generate HTML version for Resend - Corporate Safe Design (High Deliverability)
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

    // Simplified Status Badge (Text-based for safety)
    const getStatusBadge = () => {
        try {
            if (request.video_url) return '<strong style="color: #047857;">[VIDEO DISPONIBLE]</strong>';
            const status = request.status || 'pendiente';
            const failure = request.failure_type;

            if (failure || (!request.video_url && ["enviado", "revisado"].includes(status))) {
                return '<strong style="color: #b91c1c;">[NO DISPONIBLE]</strong>';
            }
            return '<strong style="color: #475569;">[PENDIENTE]</strong>';
        } catch (error) {
            return '<strong>[ESTADO]</strong>';
        }
    };

    return `
<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
    <title>Reporte de Extracción</title>
</head>
<body style="font-family: Arial, Helvetica, sans-serif; font-size: 14px; color: #333333; margin: 0; padding: 0;">
    <div style="padding: 20px; background-color: #ffffff; max-width: 600px; border: 1px solid #dddddd;">
        
        <!-- Header Simple -->
        <div style="border-bottom: 2px solid #000066; padding-bottom: 10px; margin-bottom: 20px;">
            <h2 style="margin: 0; color: #000066; font-size: 18px;">EXTRACCIÓN DE VIDEO - US EL ROBLE</h2>
            <p style="margin: 5px 0 0; font-size: 12px; color: #666666;">Sistema de Gestión de Evidencia Digital</p>
        </div>

        <p style="font-size: 14px; line-height: 1.5;">
            Estimados,<br><br>
            Se ha generado un nuevo reporte de extracción de video para el caso <strong>#${request.case_number || 'S/N'}</strong>.
            Estado actual: ${getStatusBadge()}
        </p>

        <!-- Tabla de Datos -->
        <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 14px;">
            <tr>
                <td style="padding: 8px; border: 1px solid #dddddd; background-color: #f9f9f9; width: 30%; font-weight: bold;">N° Caso:</td>
                <td style="padding: 8px; border: 1px solid #dddddd;">${request.case_number || '—'}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #dddddd; background-color: #f9f9f9; font-weight: bold;">Fecha Incidente:</td>
                <td style="padding: 8px; border: 1px solid #dddddd;">${incidentDate}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #dddddd; background-color: #f9f9f9; font-weight: bold;">Patente (PPU):</td>
                <td style="padding: 8px; border: 1px solid #dddddd;"><strong>${request.ppu || '—'}</strong></td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #dddddd; background-color: #f9f9f9; font-weight: bold;">Ubicación:</td>
                <td style="padding: 8px; border: 1px solid #dddddd;">${request.incident_point || 'No registrada'}</td>
            </tr>
            <tr>
                <td style="padding: 8px; border: 1px solid #dddddd; background-color: #f9f9f9; font-weight: bold;">Motivo:</td>
                <td style="padding: 8px; border: 1px solid #dddddd;">${request.reason || 'No registrado'}</td>
            </tr>
        </table>

        <!-- Detalle -->
        <div style="background-color: #f5f5f5; padding: 15px; border: 1px solid #cccccc; margin-bottom: 20px;">
            <p style="margin: 0 0 5px; font-weight: bold;">Detalle del Incidente:</p>
            <p style="margin: 0; font-style: italic;">${(request.detail || 'Sin detalles.').replace(/\n/g, '<br>')}</p>
        </div>

        <!-- Boton o Mensaje -->
        ${request.video_url ?
            `<div style="text-align: left; margin: 20px 0;">
            <a href="${request.video_url}" style="background-color: #0056b3; color: #ffffff; padding: 10px 20px; text-decoration: none; font-weight: bold; border-radius: 4px; display: inline-block;">Descargar Video</a>
            <p style="font-size: 11px; margin-top: 5px; color: #666666;">Enlace directo al servidor de evidencia.</p>
        </div>` :
            `<div style="border: 1px solid #cc0000; background-color: #fff0f0; padding: 10px; color: #cc0000;">
            <strong>Evidencia No Disponible</strong><br>
            Razón: ${request.failure_type || 'Motivo no especificado'} ${request.obs ? `(${request.obs})` : ''}
        </div>`
        }

        <!-- Footer -->
        <div style="margin-top: 30px; padding-top: 10px; border-top: 1px solid #dddddd; font-size: 11px; color: #999999;">
            <p style="margin: 0;">Mensaje generado automáticamente por Sistema de Gestión de Videos US El Roble.</p>
            <p style="margin: 0;">Favor no responder a este correo.</p>
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
