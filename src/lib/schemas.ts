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

/**
 * Campo de lista cerrada que además admite vacío.
 *
 * Estos campos llegan de tres sitios con tres formas de "sin valor": `null`
 * desde Postgres, `undefined` cuando el objeto no trae la clave, y `""` cuando
 * pasan por un formulario. Un enum a secas sólo acepta sus propios valores, así
 * que cualquiera de los tres bloqueaba el guardado con un "Invalid input" sobre
 * un campo que el usuario ni siquiera edita.
 *
 * Se admite `""` como valor válido en lugar de transformarlo: una transformación
 * haría que el tipo de entrada del esquema difiera del de salida, y el
 * formulario se apoya en que sean el mismo. La conversión de `""` a null se
 * hace al construir lo que va a la base, con `vacioANulo`.
 */
const listaOpcional = <T extends readonly [string, ...string[]]>(valores: T) =>
    z.union([z.enum(valores), z.literal("")]).nullish();

/** Booleano opcional que admite vacío, por la misma razón. */
const booleanoOpcional = z.union([z.boolean(), z.literal("")]).nullish();

/** Convierte a null los vacíos antes de escribir en la base. */
export const vacioANulo = <T>(valor: T | "" | null | undefined): T | null =>
    valor === "" || valor === undefined ? null : valor;

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
    fleet_status: listaOpcional(['en_flota', 'fuera_de_flota', 'desconocido']),
    sin_disco: booleanoOpcional,
    sin_disco_source: listaOpcional(['flota', 'bus_failures', 'manual']),
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
