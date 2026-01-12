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
function parseOperator(content: string): { name?: string; rut?: string } {
    // Pattern for multiline: DATOS OB: followed by newline(s) then NAME RUT
    // Example: 
    // DATOS OB:
    // VIVANCO ZUÑIGA, VALESKA CORINA 15418817-7
    const multilinePattern = /DATOS\s*OB[:\s]*[\r\n]+\s*([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,]+?)\s+(\d{7,8}-[\dkK])/i;

    let match = content.match(multilinePattern);
    if (match) {
        const name = match[1]?.trim()
            .replace(/,\s*$/, '')
            .replace(/\s+/g, ' ')
            .trim();
        const rut = match[2]?.trim().toUpperCase();
        if (name && name.length > 2) {
            return { name, rut };
        }
    }

    // Fallback: same line format
    const sameLinePatterns = [
        /DATOS\s*OB[:\s]+([A-ZÁÉÍÓÚÑ\s,]+?)\s+(\d{7,8}-[\dkK])/i,
        /DATOS\s*OB[:\s]*([^0-9\n]+?)(\d{7,8}-[\dkK])/i,
    ];

    for (const pattern of sameLinePatterns) {
        match = content.match(pattern);
        if (match) {
            const name = match[1]?.trim()
                .replace(/,\s*$/, '')
                .replace(/\s+/g, ' ')
                .trim();
            const rut = match[2]?.trim().toUpperCase();
            if (name && name.length > 2) {
                return { name, rut };
            }
        }
    }

    // Last fallback: Conductor/Chofer patterns
    const fallbackPatterns = [
        /Conductor[:\s]+([A-ZÁÉÍÓÚÑ\s,]+?)\s+(\d{7,8}-[\dkK])/i,
        /Chofer[:\s]+([A-ZÁÉÍÓÚÑ\s,]+?)\s+(\d{7,8}-[\dkK])/i,
    ];

    for (const pattern of fallbackPatterns) {
        match = content.match(pattern);
        if (match) {
            return {
                name: match[1]?.trim().replace(/,\s*$/, ''),
                rut: match[2]?.trim().toUpperCase()
            };
        }
    }

    return {};
}

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
                // Replace standard breaks and block elements with spaces to prevent merging words
                text = text.replace(/<br\s*\/?>/gi, " ");
                text = text.replace(/<\/(p|div|tr|h\d)>/gi, " ");
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
                // Regex updated to be extremely greedy with digits and handle spacing around '#'
                // Matches "Case number # 12345", "Solicitud 12345", "Caso #12345", "número #06653857"
                case_number: /(?:Case\s*number|Caso|Solicitud|N°\s*Caso|N[uú]mero)\s*(?:#|N°|:|.)?\s*(\d+)/i,
                case_number_alt: /#\s*(\d{5,})/, // Backup: looks for hash followed by at least 5 digits

                // Dates
                incident_at: /(?:Fecha\s*(?:del?)?\s*incidente|Fecha\s*de\s*Ocurrencia)\s*[:.]?\s*(.+?)(?=\s*(?:Fecha|PPU|Patente|Punto|Motivo|$))/i,
                ingress_at: /(?:Fecha\s*de\s*ingreso|Fecha\s*Ingreso|Ingreso)\s*[:.]?\s*(.+?)(?=\s*(?:Fecha|PPU|Patente|Punto|Motivo|$))/i,

                // Other fields
                ppu: /(?:PPU|Patente|Placa)\s*[:.]?\s*([A-Z]{2,4}[-.]?\d{2,4}[-.]?\d{0,2})/i,
                incident_point: /(?:Punto del incidente|Lugar|Ubicaci[oó]n|Direcci[oó]n)\s*[:.]?\s*(.+?)(?=\s*(?:Fecha|PPU|Patente|Motivo|$))/i,
                reason: /(?:Motivo del descargo|Motivo|Causa)\s*[:.]?\s*(.+?)(?=\s*(?:Detalle|Observaciones|Descripci[oó]n|$))/i,
                detail: /(?:Detalle|Observaciones|Descripci[oó]n)\s*[:.]\s*([\s\S]+?)(?:\n\s*\n|$)/i,
            };

            // Heuristic: If we find multiple matches, prefer the longer one for case number
            let caseNumKeywords = cleanContent.match(patterns.case_number);
            let caseNumHash = cleanContent.match(patterns.case_number_alt);

            let bestCaseMatch = null;
            if (caseNumKeywords && caseNumKeywords[1]) bestCaseMatch = caseNumKeywords[1];

            // If the "Hash" match is longer (and likely more accurate if the keyword regex cut short), use it.
            if (caseNumHash && caseNumHash[1]) {
                if (!bestCaseMatch || caseNumHash[1].length > bestCaseMatch.length) {
                    bestCaseMatch = caseNumHash[1];
                }
            }

            if (bestCaseMatch) result.case_number = bestCaseMatch;

            const incidentAtMatch = cleanContent.match(patterns.incident_at);
            if (incidentAtMatch) result.incident_at = parseSpanishDate(incidentAtMatch[1]);

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

            const ppuMatch = cleanContent.match(patterns.ppu);
            if (ppuMatch) result.ppu = ppuMatch[1].trim();

            const pointMatch = cleanContent.match(patterns.incident_point);
            if (pointMatch) result.incident_point = pointMatch[1].trim();

            const reasonMatch = cleanContent.match(patterns.reason);
            if (reasonMatch) result.reason = reasonMatch[1].trim();

            const detailMatch = cleanContent.match(patterns.detail);
            if (detailMatch) result.detail = detailMatch[1].trim();

            if (result.detail) {
                result.detail = result.detail.replace(/<[^>]*>/g, '').trim();
            }

            // Extract operator info
            const operator = parseOperator(content);
            if (operator.name) result.operator_name = operator.name;
            if (operator.rut) result.operator_rut = operator.rut;

            resolve(result);
        };
        reader.onerror = (err) => reject(err);
        reader.readAsArrayBuffer(file);
    });
}

