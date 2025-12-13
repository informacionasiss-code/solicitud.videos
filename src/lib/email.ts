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
    // Format dates
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
    
    // Ensure CRLF for line breaks for maximum compatibility (e.g., Outlook)
    const rawBody = generateEmailBody(request || {});
    const bodyCRLF = rawBody.replace(/\r\n/g, '\n').replace(/\n/g, '\r\n');
    const body = encodeURIComponent(bodyCRLF);

    const to = EMAIL_CONFIG.to.join(',');
    const cc = EMAIL_CONFIG.cc.join(',');
    
    return `mailto:${to}?cc=${cc}&subject=${subject}&body=${body}`;
};

export const openMailClient = (request: any) => {
    const mailtoUrl = getMailtoUrl(request);
    
    // Try window.location.href first as it's often more reliable for mailto
    window.location.href = mailtoUrl;

    // Fallback: Create anchor element and click it
    // const link = document.createElement('a');
    // link.href = mailtoUrl;
    // link.style.display = 'none';
    // document.body.appendChild(link);
    // link.click();
    // setTimeout(() => document.body.removeChild(link), 100);
};
