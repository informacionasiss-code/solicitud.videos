import { parse } from "date-fns";
import { es } from "date-fns/locale";

export interface ParsedEml {
    case_number?: string;
    incident_at?: string; // ISO string
    ingress_at?: string; // ISO string
    ppu?: string;
    incident_point?: string;
    reason?: string;
    detail?: string;
    operator_name?: string;
    operator_rut?: string;
}

function decodeQuotedPrintable(input: string): string {
    return input
        .replace(/=\r?\n/g, "") // Soft line breaks
        .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}



function parseSpanishDate(dateStr: string): string | undefined {
    if (!dateStr) return undefined;

    const cleanStr = dateStr.trim().replace(/\s+/g, ' ');

    const formats = [
        "dd/MM/yyyy HH:mm:ss", // Added seconds support
        "dd/MM/yyyy HH:mm",
        "dd/MM/yyyy",
        "dd-MM-yyyy HH:mm:ss",
        "dd-MM-yyyy HH:mm",
        "dd-MM-yyyy",
        "yyyy-MM-dd HH:mm:ss",
        "yyyy-MM-dd HH:mm",
        "yyyy-MM-dd",
        "EEEE d 'de' MMMM 'de' yyyy",
        "d 'de' MMMM 'de' yyyy",
        "d/MM/yyyy", // Single digit day support
        "dd/M/yyyy", // Single digit month support
        "d/M/yyyy",
    ];

    for (const fmt of formats) {
        try {
            const parsed = parse(cleanStr, fmt, new Date(), { locale: es });
            if (!isNaN(parsed.getTime())) {
                const pad = (n: number) => n.toString().padStart(2, '0');
                return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
            }
        } catch (e) {
            // continue
        }
    }
    return undefined;
}

// Parse operator info from email content
// Format: "DATOS OB:" on one line, then "NAME RUT" on next line


export async function parseEmlFile(file: File): Promise<ParsedEml> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const decoder = new TextDecoder("iso-8859-1");
            let content = decoder.decode(arrayBuffer);

            if (content.match(/=[0-9A-F]{2}/i)) {
                content = decodeQuotedPrintable(content);
            }

            const result: ParsedEml = {};

            // Enhanced HTML stripping
            const stripHtml = (html: string) => {
                let text = html || "";
                // Replace standard breaks and block elements with spaces
                text = text.replace(/<br\s*\/?>/gi, " ");
                text = text.replace(/<\/(p|div|tr|td|th|li|h\d|ul|ol|table|blockquote)>/gi, " ");
                // Remove all other tags
                text = text.replace(/<[^>]*>/g, "");
                // Decode common entities
                text = text.replace(/&nbsp;/g, " ");
                text = text.replace(/&lt;/g, "<");
                text = text.replace(/&gt;/g, ">");
                text = text.replace(/&amp;/g, "&");
                // Normalize whitespace
                return text.replace(/\s+/g, " ").trim();
            };

            const cleanContent = stripHtml(content);

            const patterns = {
                // Case number
                case_number: /#\s*(\d{6,})/i,

                // Dates
                ingress_at: /Fecha\s*de\s*ingreso\s*:\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4}(?:\s+\d{1,2}:\d{2})?)/i,
                incident_at: /Fecha\s*(?:del?)?\s*incidente\s*:\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4}(?:\s+\d{1,2}:\d{2})?)/i,

                // PPU
                ppu: /PPU\s*:\s*([A-Z0-9]{4,8})/i,

                // Location
                incident_point: /Punto\s*del\s*incidente\s*:\s*(.+?)(?=\s*(?:Motivo|Submotivo|Detalle|$))/i,

                // Reason
                reason: /Motivo\s*del\s*descargo\s*:\s*(.+?)(?=\s*(?:Submotivo|Detalle|DATOS|$))/i,

                // Detail - stops at DATOS OB or End of String
                detail: /Detalle\s*:\s*([\s\S]+?)(?=\s*(?:DATOS\s*OB|$))/i,
            };

            // Case Number
            const caseMatch = cleanContent.match(patterns.case_number);
            if (caseMatch) result.case_number = caseMatch[1];

            // Fecha Incidente
            const incidentAtMatch = cleanContent.match(patterns.incident_at);
            if (incidentAtMatch) {
                result.incident_at = parseSpanishDate(incidentAtMatch[1]);
            }

            // Fecha Ingreso
            const ingressAtMatch = cleanContent.match(patterns.ingress_at);
            if (ingressAtMatch) {
                result.ingress_at = parseSpanishDate(ingressAtMatch[1]);
            }

            // Fallback: If no ingress date found, use today's date
            if (!result.ingress_at) {
                const today = new Date();
                const pad = (n: number) => n.toString().padStart(2, '0');
                result.ingress_at = `${today.getFullYear()}-${pad(today.getMonth() + 1)}-${pad(today.getDate())}T00:00`;
            }

            // PPU
            const ppuMatch = cleanContent.match(patterns.ppu);
            if (ppuMatch) result.ppu = ppuMatch[1].trim().toUpperCase();

            // Location
            const pointMatch = cleanContent.match(patterns.incident_point);
            if (pointMatch) result.incident_point = pointMatch[1].trim();

            // Reason
            const reasonMatch = cleanContent.match(patterns.reason);
            if (reasonMatch) result.reason = reasonMatch[1].trim();

            // Detail
            const detailMatch = cleanContent.match(patterns.detail);
            if (detailMatch) result.detail = detailMatch[1].trim();

            // Extract operator info
            // Parses "DATOS OB: NAME RUT" from clean content
            const operatorPattern = /DATOS\s*OB\s*[:\s]*([A-ZÁÉÍÓÚÑ\s,]+?)\s+(\d{7,8}-[\dkK])/i;
            const operatorMatch = cleanContent.match(operatorPattern);

            if (operatorMatch) {
                result.operator_name = operatorMatch[1].trim().replace(/,\s*$/, '');
                result.operator_rut = operatorMatch[2].trim().toUpperCase();
            } else {
                // Fallback for "Chofer: ..."
                const altOpPattern = /(?:Conductor|Chofer)\s*[:\s]+([A-ZÁÉÍÓÚÑ\s,]+?)\s+(\d{7,8}-[\dkK])/i;
                const altMatch = cleanContent.match(altOpPattern);
                if (altMatch) {
                    result.operator_name = altMatch[1].trim().replace(/,\s*$/, '');
                    result.operator_rut = altMatch[2].trim().toUpperCase();
                }
            }

            resolve(result);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
}

