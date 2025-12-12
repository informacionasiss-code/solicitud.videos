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

export const openMailClient = (request: any) => {
    const subject = encodeURIComponent(generateEmailSubject(request.case_number));
    const body = encodeURIComponent(generateEmailBody(request));
    const to = EMAIL_CONFIG.to.join(','); // mailto separates by comma usually
    const cc = EMAIL_CONFIG.cc.join(',');

    window.location.href = `mailto:${to}?cc=${cc}&subject=${subject}&body=${body}`;
};
