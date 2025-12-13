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
        "dd/MM/yyyy HH:mm",
        "dd/MM/yyyy",
        "dd-MM-yyyy HH:mm",
        "dd-MM-yyyy",
        "yyyy-MM-dd HH:mm",
        "yyyy-MM-dd",
        "EEEE d 'de' MMMM 'de' yyyy",
        "d 'de' MMMM 'de' yyyy",
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
// Formats: "DATOS OB: NOMBRE, RUT" or "DATOS OB  NOMBRE APELLIDO RUT" etc.
function parseOperator(content: string): { name?: string; rut?: string } {
    // Try to find DATOS OB section first
    const datosObPatterns = [
        // DATOS OB: SALAZAR TAPIA, JORGE ANIBAL 10164679-3
        /DATOS\s*OB[:\s]+([A-ZÁÉÍÓÚÑ\s,]+?)\s+(\d{7,8}-[\dkK])/i,
        // DATOS OB NOMBRE APELLIDO RUT
        /DATOS\s*OB[:\s]*\s+([A-ZÁÉÍÓÚÑ][A-ZÁÉÍÓÚÑ\s,]+?)\s+(\d{7,8}-[\dkK])/i,
        // More flexible: just DATOS OB followed by any text until RUT
        /DATOS\s*OB[:\s]*([^0-9]+?)(\d{7,8}-[\dkK])/i,
    ];

    for (const pattern of datosObPatterns) {
        const match = content.match(pattern);
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

    // Fallback: look for Conductor or Chofer patterns
    const fallbackPatterns = [
        /Conductor[:\s]+([A-ZÁÉÍÓÚÑ\s,]+?)\s+(\d{7,8}-[\dkK])/i,
        /Chofer[:\s]+([A-ZÁÉÍÓÚÑ\s,]+?)\s+(\d{7,8}-[\dkK])/i,
        /Operador[:\s]+([A-ZÁÉÍÓÚÑ\s,]+?)\s+(\d{7,8}-[\dkK])/i,
    ];

    for (const pattern of fallbackPatterns) {
        const match = content.match(pattern);
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

