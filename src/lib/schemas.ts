import { z } from "zod";

export const requestSchema = z.object({
    case_number: z.string().min(1, "Número de caso requerido"),
    incident_at: z.string().optional(),
    ingress_at: z.string().optional(),
    ppu: z.string().min(4, "PPU requerida"),
    incident_point: z.string().optional(),
    reason: z.string().optional(),
    detail: z.string().optional(),
    video_url: z.string().optional(),
    obs: z.string().optional(),
    operator_name: z.string().optional(),
    operator_rut: z.string().optional(),
    failure_type: z.any().optional(),
    status: z.enum(['pendiente', 'en_revision', 'revisado', 'pendiente_envio', 'enviado']),

    // Cruce contra el padrón de flota. Los completa el formulario a partir de
    // la verificación de la PPU; no son campos que el usuario escriba.
    fleet_status: z.enum(['en_flota', 'fuera_de_flota', 'desconocido']).optional(),
    sin_disco: z.boolean().optional(),
    sin_disco_source: z.enum(['flota', 'bus_failures', 'manual']).optional().nullable(),
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
