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

function decodeBase64ToText(input: string): string {
    const clean = input.replace(/\s+/g, "");
    try {
        const binary = atob(clean);
        const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
        // Try UTF-8 first, fallback to ISO-8859-1
        try {
            return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
        } catch {
            return new TextDecoder("iso-8859-1", { fatal: false }).decode(bytes);
        }
    } catch {
        return input;
    }
}

function parseHeadersBlock(headerBlock: string): Record<string, string> {
    const lines = headerBlock.split(/\r?\n/);
    const headers: Record<string, string> = {};
    let currentKey: string | null = null;
    for (const line of lines) {
        if (/^\s/.test(line) && currentKey) {
            headers[currentKey] = `${headers[currentKey]} ${line.trim()}`;
            continue;
        }
        const idx = line.indexOf(":");
        if (idx === -1) continue;
        const key = line.slice(0, idx).trim().toLowerCase();
        const value = line.slice(idx + 1).trim();
        headers[key] = value;
        currentKey = key;
    }
    return headers;
}

function extractBoundary(contentType?: string): string | null {
    if (!contentType) return null;
    const match = contentType.match(/boundary="?([^";]+)"?/i);
    return match ? match[1] : null;
}

function decodeBodyByEncoding(body: string, encoding?: string): string {
    if (!encoding) return body;
    const enc = encoding.toLowerCase();
    if (enc.includes("base64")) return decodeBase64ToText(body);
    if (enc.includes("quoted-printable")) return decodeQuotedPrintable(body);
    return body;
}

function extractBestBody(raw: string): { body: string; subject?: string } {
    const [headerBlock, ...rest] = raw.split(/\r?\n\r?\n/);
    const bodyBlock = rest.join("\n\n");
    const headers = parseHeadersBlock(headerBlock || "");
    const subject = headers["subject"];
    const contentType = headers["content-type"];
    const boundary = extractBoundary(contentType);

    if (!boundary) {
        return { body: decodeBodyByEncoding(bodyBlock, headers["content-transfer-encoding"]), subject };
    }

    const boundaryRegex = new RegExp(`--${boundary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`);
    const parts = bodyBlock.split(boundaryRegex).slice(1); // skip preamble

    let textPlain: string | undefined;
    let textHtml: string | undefined;

    for (const part of parts) {
        if (part.startsWith("--")) break; // end marker
        const trimmed = part.replace(/^\r?\n/, "");
        const [partHeaderBlock, ...partRest] = trimmed.split(/\r?\n\r?\n/);
        const partBody = partRest.join("\n\n");
        const partHeaders = parseHeadersBlock(partHeaderBlock || "");
        const partType = (partHeaders["content-type"] || "").toLowerCase();
        const partEncoding = partHeaders["content-transfer-encoding"];

        // Nested multipart
        if (partType.includes("multipart/")) {
            const nested = extractBestBody(`${partHeaderBlock}\n\n${partBody}`);
            if (nested.body) {
                if (!textPlain && !textHtml) {
                    // Prefer first nested body if nothing else
                    textPlain = nested.body;
                }
            }
            continue;
        }

        if (partType.includes("text/plain")) {
            textPlain = decodeBodyByEncoding(partBody, partEncoding);
        } else if (partType.includes("text/html")) {
            textHtml = decodeBodyByEncoding(partBody, partEncoding);
        }
    }

    return { body: textPlain || textHtml || bodyBlock, subject };
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
            const rawContent = decoder.decode(arrayBuffer);
            const { body, subject } = extractBestBody(rawContent);
            let content = body;

            if (content.match(/=[0-9A-F]{2}/i) || content.match(/=\r?\n/)) {
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

                // Remove invisible characters (Zero-width space, etc) preventing regex matches
                text = text.replace(/[\u200B-\u200D\uFEFF]/g, "");

                // Normalize whitespace
                return text.replace(/\s+/g, " ").trim();
            };

            const combinedContent = `${subject ? subject + " " : ""}${content}`;
            const cleanContent = stripHtml(combinedContent);

            const patterns = {
                // New case format like "608608-20260217-SU3025"
                case_number_strict: /\b\d{4,}\s*-\s*\d{8}\s*-\s*[A-Z]{2}\s*\d{3,6}\b/i,

                // Case number: matches "Caso #12345", "Solicitud 123456",
                // or new format like "608608-20260217-SU3025"
                // Allow spaces inside to tolerate line wraps
                case_number: /(?:Case\s*number|Caso|Solicitud|N°\s*Caso|N[uú]mero|recibido\s+con\s+el\s+n[uú]mero)\s*(?:#|N°|:|.)?\s*([\d\s]{3,})/i,
                case_number_fallback: /#\s*([\d\s]{3,})/i, // Fallback for just hash + digits

                // Dates
                ingress_at: /Fecha\s*de\s*ingreso\s*:\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4}(?:\s+\d{1,2}:\d{2})?)/i,
                incident_at: /Fecha\s*(?:de\s*los\s*hechos|del?\s*incidente|incidente)\s*:\s*(\d{1,2}[-/]\d{1,2}[-/]\d{4}(?:\s+\d{1,2}:\d{2})?)/i,

                // PPU
                ppu: /PPU\s*:\s*([A-Z0-9]{4,8})/i,

                // Location (more robust: Punto/Lugar/Ubicación ...)
                incident_point: /(?:Punto|Lugar|Ubicaci[oó]n)\s*(?:de\s*)?(?:los\s*hechos|del\s*incidente|del\s*hecho|incidente)?\s*[:\-–]?\s*(.+?)(?=\s*(?:Motivo|Submotivo|Detalle|Servicio|PPU|Fecha|Plazo|DATOS|Datos|D[ií]as|Solicitud|$))/i,
                incident_point_fallback: /Punto\s*de\s*(?:los\s*hechos|del\s*incidente)\s*(?:\:|\-|\–)\s*([^\n\r]+?)\s*(?=\s*(?:Motivo|Submotivo|Detalle|Servicio|PPU|Fecha|Plazo|DATOS|Datos|D[ií]as|Solicitud|$))/i,

                // Reason
                reason: /Motivo\s*(?:del\s*(?:descargo|caso))?\s*:\s*(.+?)(?=\s*(?:Submotivo|Detalle|DATOS|$))/i,

                // Detail - stops at DATOS OB or End of String
                detail: /Detalle\s*:\s*([\s\S]+?)(?=\s*(?:DATOS\s*OB|$))/i,
            };

            // Case Number
            const strictMatch = cleanContent.match(patterns.case_number_strict);
            if (strictMatch && strictMatch[0]) {
                result.case_number = strictMatch[0].replace(/\s+/g, '').trim().toUpperCase();
            } else {
                const caseMatch = cleanContent.match(patterns.case_number);
                if (caseMatch && caseMatch[1]) {
                    // Remove any spaces captured inside the number
                    result.case_number = caseMatch[1].replace(/\s+/g, '').toUpperCase();
                } else {
                    const caseFallback = cleanContent.match(patterns.case_number_fallback);
                    if (caseFallback && caseFallback[1]) {
                        result.case_number = caseFallback[1].replace(/\s+/g, '').toUpperCase();
                    }
                }
            }

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
            if (pointMatch) {
                result.incident_point = pointMatch[1].trim();
            } else {
                const pointFallback = cleanContent.match(patterns.incident_point_fallback);
                if (pointFallback) {
                    result.incident_point = pointFallback[1].trim();
                }
            }

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
