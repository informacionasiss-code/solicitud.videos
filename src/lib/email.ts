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
    const incidentDate = request.incident_at ? new Date(request.incident_at).toLocaleString('es-CL') : 'N/A';

    return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <style>
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.7; 
            color: #374151; 
            margin: 0;
            padding: 0;
            background-color: #f3f4f6;
        }
        .wrapper {
            background-color: #f3f4f6;
            padding: 40px 20px;
        }
        .container { 
            max-width: 640px; 
            margin: 0 auto; 
            background: #ffffff;
            border-radius: 12px;
            overflow: hidden;
            box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
        }
        .header { 
            background: linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #2563eb 100%); 
            color: white; 
            padding: 32px 40px;
            text-align: center;
        }
        .header-icon {
            width: 60px;
            height: 60px;
            background: rgba(255,255,255,0.15);
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin-bottom: 16px;
            font-size: 28px;
        }
        .header h1 {
            margin: 0;
            font-size: 22px;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }
        .header .case-number {
            margin: 12px 0 0 0;
            font-size: 15px;
            opacity: 0.9;
            font-weight: 500;
        }
        .content { 
            padding: 24px 40px;
        }
        .greeting {
            font-size: 16px;
            color: #374151;
            margin-bottom: 16px;
        }
        .info-grid {
            background: #f8fafc;
            border-radius: 10px;
            padding: 24px;
            margin: 24px 0;
            border: 1px solid #e2e8f0;
        }
        .info-row {
            display: flex;
            padding: 12px 0;
            border-bottom: 1px solid #e2e8f0;
        }
        .info-row:last-child {
            border-bottom: none;
        }
        .info-label {
            width: 160px;
            font-weight: 600;
            color: #1e40af;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
        }
        .info-value {
            flex: 1;
            color: #1f2937;
            font-size: 15px;
        }
        .info-value.highlight {
            font-weight: 700;
            font-size: 17px;
            color: #111827;
        }
        .detail-section {
            background: #ffffff;
            border: 2px solid #e5e7eb;
            border-radius: 10px;
            padding: 24px;
            margin: 24px 0;
        }
        .detail-title {
            font-weight: 700;
            color: #1e40af;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 12px;
            padding-bottom: 8px;
            border-bottom: 2px solid #dbeafe;
        }
        .detail-content {
            color: #4b5563;
            font-size: 14px;
            line-height: 1.8;
        }
        .video-section {
            background: linear-gradient(135deg, #dbeafe 0%, #e0e7ff 100%);
            border-radius: 10px;
            padding: 20px 24px;
            margin: 24px 0;
            border: 1px solid #bfdbfe;
        }
        .video-label {
            font-weight: 600;
            color: #1e40af;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 8px;
        }
        .video-link {
            color: #1d4ed8;
            text-decoration: none;
            font-weight: 500;
            word-break: break-all;
        }
        .video-link:hover {
            text-decoration: underline;
        }
        .closing {
            margin-top: 32px;
            color: #6b7280;
            font-size: 15px;
        }
        .footer { 
            background: #111827; 
            color: #9ca3af; 
            padding: 24px 40px;
            text-align: center;
        }
        .footer-brand {
            font-weight: 700;
            color: #ffffff;
            font-size: 14px;
            text-transform: uppercase;
            letter-spacing: 1px;
            margin-bottom: 8px;
        }
        .footer-text {
            font-size: 12px;
            color: #6b7280;
        }
    </style>
</head>
<body>
    <div class="wrapper">
        <div class="container">
            <div class="header">
                <div class="header-icon">▶</div>
                <h1>Extracción de Video</h1>
                <p class="case-number">Caso N° ${request.case_number || 'N/A'}</p>
            </div>
            <div class="content">
                <p class="greeting">Estimados,</p>
                <p>Junto con saludar, informo extracción de videos para el caso N° <strong>${request.case_number || 'N/A'}</strong>:</p>
                
                <div class="info-grid">
                    <div class="info-row">
                        <div class="info-label">N° Caso</div>
                        <div class="info-value">${request.case_number || 'N/A'}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Patente (PPU)</div>
                        <div class="info-value highlight">${request.ppu || 'N/A'}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Fecha Incidente</div>
                        <div class="info-value">${incidentDate}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Ubicación</div>
                        <div class="info-value">${request.incident_point || 'N/A'}</div>
                    </div>
                    <div class="info-row">
                        <div class="info-label">Motivo</div>
                        <div class="info-value">${request.reason || 'N/A'}</div>
                    </div>
                </div>
                
                <div class="detail-section">
                    <div class="detail-title">Detalle del Incidente</div>
                    <div class="detail-content">
                        ${(request.detail || 'Sin detalle disponible').replace(/\n/g, '<br>')}
                    </div>
                </div>
                
                <div class="video-section">
                    <div class="video-label">Enlace al Video</div>
                    ${request.video_url
            ? `<a href="${request.video_url}" class="video-link">${request.video_url}</a>`
            : `<div style="color: #991b1b; font-weight: 600;">
                ${request.failure_type
                ? `⚠️ VIDEO NO DISPONIBLE: ${request.failure_type === 'disco_danado' ? 'Disco Dañado' :
                    request.failure_type === 'bus_sin_disco' ? 'Bus Sin Disco' :
                        request.failure_type === 'video_sobreescrito' ? 'Video Sobreescrito' :
                            request.failure_type === 'error_lectura' ? 'Error de Lectura' :
                                request.failure_type === 'no_disponible' ? 'No Disponible' :
                                    request.failure_type
                }`
                : request.obs
                    ? `⚠️ OBSERVACIÓN: ${request.obs}`
                    : '<span style="color: #6b7280; font-style: italic;">Pendiente de extracción</span>'
            }
               </div>`}
                </div>
                
                <p class="closing">Saludos cordiales.</p>
            </div>
            <div class="footer">
                <div class="footer-brand">Extracción Videos El Roble</div>
                <div class="footer-text">Sistema de Gestión de Extracción de Videos</div>
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
