import { z } from "zod";

/**
 * Campo de texto opcional que además tolera `null`.
 *
 * Postgres devuelve `null` -no cadena vacía- en las columnas sin valor, y esos
 * registros se cargan tal cual en el formulario al editar. Con `.optional()` a
 * secas, cualquier solicitud sin video, sin observaciones o sin operador
 * quedaba bloqueada por un "Invalid input" que no dependía de nada que el
 * usuario pudiera corregir. Un bus sin disco nunca tiene video, así que ésos
 * fallaban siempre.
 */
const textoOpcional = z.string().nullish();

export const requestSchema = z.object({
    case_number: z.string().min(1, "Número de caso requerido"),
    incident_at: textoOpcional,
    ingress_at: textoOpcional,
    ppu: z.string().min(4, "PPU requerida"),
    incident_point: textoOpcional,
    reason: textoOpcional,
    detail: textoOpcional,
    video_url: textoOpcional,
    obs: textoOpcional,
    operator_name: textoOpcional,
    operator_rut: textoOpcional,
    failure_type: z.any().optional(),
    status: z.enum(['pendiente', 'en_revision', 'revisado', 'pendiente_envio', 'enviado']),

    // Cruce contra el padrón de flota. Los completa el formulario a partir de
    // la verificación de la PPU; no son campos que el usuario escriba.
    fleet_status: z.enum(['en_flota', 'fuera_de_flota', 'desconocido']).nullish(),
    sin_disco: z.boolean().nullish(),
    sin_disco_source: z.enum(['flota', 'bus_failures', 'manual']).nullish(),
});

export const FAILURE_TYPES = {
    disco_danado: "Disco Dañado",
    bus_sin_disco: "Bus Sin Disco",
    video_sobreescrito: "Video Sobreescrito",
    error_lectura: "Error de Lectura",
    no_disponible: "No Disponible"
} as const;

export type RequestFormValues = z.infer<typeof requestSchema>;

export const STATUS_LABELS = {
    pendiente: "Pendiente",
    en_revision: "En Revisión",
    revisado: "Revisado",
    pendiente_envio: "Pendiente de Envío",
    enviado: "Enviado"
} as const;
