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
}

function decodeQuotedPrintable(input: string): string {
    return input
        .replace(/=\r?\n/g, "") // Soft line breaks
        .replace(/=([0-9A-F]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
}

function parseSpanishDate(dateStr: string): string | undefined {
    if (!dateStr) return undefined;

    // Clean string
    const cleanStr = dateStr.trim().replace(/\s+/g, ' ');

    // Try multiple formats
    const formats = [
        "dd/MM/yyyy HH:mm",
        "dd/MM/yyyy",
        "dd-MM-yyyy HH:mm",
        "dd-MM-yyyy",
        "yyyy-MM-dd HH:mm",
        "yyyy-MM-dd",
        "EEEE d 'de' MMMM 'de' yyyy", // Jueves 12 de Diciembre de 2023
        "d 'de' MMMM 'de' yyyy",
    ];

    for (const fmt of formats) {
        try {
            const parsed = parse(cleanStr, fmt, new Date(), { locale: es });
            if (!isNaN(parsed.getTime())) {
                // Adjust for timezone if needed, but local input usually implies local time.
                // However, input[type="datetime-local"] expects "YYYY-MM-DDThh:mm"
                // We return ISO to be safe, but standard ISO includes Z.
                // For datetime-local input, we need "YYYY-MM-DDThh:mm" (local time).

                // Manually format to local ISO without timezone conversion issues
                const pad = (n: number) => n.toString().padStart(2, '0');
                return `${parsed.getFullYear()}-${pad(parsed.getMonth() + 1)}-${pad(parsed.getDate())}T${pad(parsed.getHours())}:${pad(parsed.getMinutes())}`;
            }
        } catch (e) {
            // continue
        }
    }
    return undefined;
}

export async function parseEmlFile(file: File): Promise<ParsedEml> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const arrayBuffer = e.target?.result as ArrayBuffer;
            const decoder = new TextDecoder("iso-8859-1"); // Decode base charset first
            let content = decoder.decode(arrayBuffer);

            // Decode Quoted-Printable if detected (simple heuristic: contains =XX)
            if (content.match(/=[0-9A-F]{2}/i)) {
                content = decodeQuotedPrintable(content);
            }

            const result: ParsedEml = {};

            // Regex Patterns (Adjusted to be more lenient)
            const patterns = {
                case_number: /Case number #(\d+)/i,
                case_number_alt: /#\s*(\d{6,})/,
                incident_at: /(?:Fecha del incidente|Fecha de Ocurrencia):\s*(.+)/i,
                ingress_at: /(?:Fecha de ingreso|Fecha Ingreso):\s*(.+)/i,
                ppu: /PPU:\s*([A-Z0-9]+)/i,
                incident_point: /(?:Punto del incidente|Lugar):\s*(.+)/i,
                reason: /(?:Motivo del descargo|Motivo):\s*(.+)/i,
                detail: /(?:Detalle|Observaciones):\s*([\s\S]+?)(?:\n\s*\n|$)/i,
            };

            const caseMatch = content.match(patterns.case_number) || content.match(patterns.case_number_alt);
            if (caseMatch) result.case_number = caseMatch[1];

            const incidentAtMatch = content.match(patterns.incident_at);
            if (incidentAtMatch) result.incident_at = parseSpanishDate(incidentAtMatch[1]);

            const ingressAtMatch = content.match(patterns.ingress_at);
            if (ingressAtMatch) result.ingress_at = parseSpanishDate(ingressAtMatch[1]);

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
