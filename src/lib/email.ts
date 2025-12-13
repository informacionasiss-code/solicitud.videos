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

// Generate HTML version for Resend
export const generateEmailHtml = (request: any) => {
    const incidentDate = request.incident_at ? new Date(request.incident_at).toLocaleString('es-CL') : 'N/A';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #2563eb, #4f46e5); color: white; padding: 20px; border-radius: 8px 8px 0 0; }
        .content { background: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-top: none; }
        .field { margin-bottom: 12px; }
        .label { font-weight: bold; color: #1e40af; }
        .value { margin-left: 8px; }
        .detail-box { background: white; padding: 15px; border-radius: 6px; border: 1px solid #cbd5e1; margin: 10px 0; }
        .footer { background: #1e293b; color: #94a3b8; padding: 15px; text-align: center; border-radius: 0 0 8px 8px; font-size: 12px; }
        .video-link { color: #3b82f6; text-decoration: underline; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h2 style="margin: 0;">🎥 Solicitud de Extracción de Video</h2>
            <p style="margin: 10px 0 0 0; opacity: 0.9;">Caso #${request.case_number || 'N/A'}</p>
        </div>
        <div class="content">
            <p>Estimados,</p>
            <p>Junto con saludar, envío antecedentes para extracción de video:</p>
            
            <div class="field">
                <span class="label">📋 Caso:</span>
                <span class="value">${request.case_number || 'N/A'}</span>
            </div>
            
            <div class="field">
                <span class="label">🚌 PPU:</span>
                <span class="value"><strong>${request.ppu || 'N/A'}</strong></span>
            </div>
            
            <div class="field">
                <span class="label">📅 Fecha Incidente:</span>
                <span class="value">${incidentDate}</span>
            </div>
            
            <div class="field">
                <span class="label">📍 Punto del Incidente:</span>
                <span class="value">${request.incident_point || 'N/A'}</span>
            </div>
            
            <div class="field">
                <span class="label">📝 Motivo:</span>
                <span class="value">${request.reason || 'N/A'}</span>
            </div>
            
            <div class="detail-box">
                <strong>Detalle:</strong><br>
                ${(request.detail || 'N/A').replace(/\n/g, '<br>')}
            </div>
            
            <div class="field">
                <span class="label">🔗 Video URL:</span>
                <span class="value">
                    ${request.video_url
            ? `<a href="${request.video_url}" class="video-link">${request.video_url}</a>`
            : '<em>PENDIENTE</em>'}
                </span>
            </div>
            
            <p style="margin-top: 20px;">Saludos cordiales.</p>
        </div>
        <div class="footer">
            Enviado automáticamente desde el Sistema de Gestión de Videos
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
