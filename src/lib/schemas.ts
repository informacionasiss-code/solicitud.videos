import { z } from "zod";

export const requestSchema = z.object({
    case_number: z.string().min(6, "Número de caso inválido (mínimo 6 dígitos)"),
    incident_at: z.string().optional(), // Using string for date inputs
    ingress_at: z.string().optional(),
    ppu: z.string().min(4, "PPU requerida"),
    incident_point: z.string().optional(),
    reason: z.string().optional(),
    detail: z.string().optional(),
    video_url: z.string().url("URL inválida").optional().or(z.literal("")),
    status: z.enum(['pendiente', 'en_revision', 'revisado', 'pendiente_envio', 'enviado']),
});

export type RequestFormValues = z.infer<typeof requestSchema>;

export const STATUS_LABELS = {
    pendiente: "Pendiente",
    en_revision: "En Revisión",
    revisado: "Revisado",
    pendiente_envio: "Pendiente de Envío",
    enviado: "Enviado"
} as const;
