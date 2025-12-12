export interface ParsedEml {
    case_number?: string;
    incident_at?: string;
    ingress_at?: string;
    ppu?: string;
    incident_point?: string;
    reason?: string;
    detail?: string;
}

export async function parseEmlFile(file: File): Promise<ParsedEml> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const decoder = new TextDecoder("iso-8859-1"); // Common for EML
            const content = decoder.decode(arrayBuffer);

            const result: ParsedEml = {};

            // Regex Patterns
            const patterns = {
                case_number: /Case number #(\d+)/i,  // Adjusted to better match typical subject or body
                case_number_alt: /#(\d{6,})/, // Fallback
                incident_at: /Fecha del incidente:\s*(.+)/i,
                ingress_at: /Fecha de ingreso:\s*(.+)/i,
                ppu: /PPU:\s*([A-Z0-9]+)/i,
                incident_point: /Punto del incidente:\s*(.+)/i,
                reason: /Motivo del descargo:\s*(.+)/i,
                detail: /Detalle:\s*([\s\S]+?)(?:\n\s*\n|$)/i,
            };

            // Extract values
            // Note: Parsing EML strictly is hard without a library, but regex on raw text works for specific formats

            const caseMatch = content.match(patterns.case_number) || content.match(patterns.case_number_alt);
            if (caseMatch) result.case_number = caseMatch[1];

            const incidentAtMatch = content.match(patterns.incident_at);
            if (incidentAtMatch) result.incident_at = incidentAtMatch[1].trim();

            const ingressAtMatch = content.match(patterns.ingress_at);
            if (ingressAtMatch) result.ingress_at = ingressAtMatch[1].trim();

            const ppuMatch = content.match(patterns.ppu);
            if (ppuMatch) result.ppu = ppuMatch[1].trim();

            const pointMatch = content.match(patterns.incident_point);
            if (pointMatch) result.incident_point = pointMatch[1].trim();

            const reasonMatch = content.match(patterns.reason);
            if (reasonMatch) result.reason = reasonMatch[1].trim();

            const detailMatch = content.match(patterns.detail);
            if (detailMatch) result.detail = detailMatch[1].trim();

            // Simple HTML tag cleanup if needed
            if (result.detail) {
                result.detail = result.detail.replace(/<[^>]*>/g, '').trim();
            }

            resolve(result);
        };

        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
}
