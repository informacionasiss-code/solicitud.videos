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

// Multi-method email opener with fallbacks
export const openMailClient = (request: any): boolean => {
    const mailtoUrl = getMailtoUrl(request);

    console.log('[EMAIL] Attempting to open mail client...');
    console.log('[EMAIL] URL length:', mailtoUrl.length);

    // Method 1: Try window.open (often works better for mailto)
    try {
        const newWindow = window.open(mailtoUrl, '_blank');
        if (newWindow) {
            console.log('[EMAIL] Method 1 (window.open) succeeded');
            return true;
        }
    } catch (e) {
        console.warn('[EMAIL] Method 1 failed:', e);
    }

    // Method 2: Try window.location.href
    try {
        window.location.href = mailtoUrl;
        console.log('[EMAIL] Method 2 (location.href) triggered');
        return true;
    } catch (e) {
        console.warn('[EMAIL] Method 2 failed:', e);
    }

    // Method 3: Create and click anchor
    try {
        const link = document.createElement('a');
        link.href = mailtoUrl;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        setTimeout(() => document.body.removeChild(link), 500);
        console.log('[EMAIL] Method 3 (anchor click) triggered');
        return true;
    } catch (e) {
        console.warn('[EMAIL] Method 3 failed:', e);
    }

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
