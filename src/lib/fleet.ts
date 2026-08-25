import { supabase } from "@/lib/supabase";

/**
 * Tabla del padrón de flota.
 *
 * Se llama `padron_flota` y no `flota` porque en esta base ya existe una tabla
 * `flota` perteneciente a otro sistema. Compartir el nombre haría que esta app
 * leyera —y una migración escribiera— datos ajenos.
 */
const TABLA_PADRON = "padron_flota";

// ============================================================================
// Cruce de una PPU contra el padrón de flota y contra el historial de fallas.
//
// Dos preguntas distintas se responden acá, y conviene no mezclarlas:
//   1. ¿La PPU es nuestra?          -> FleetStatus
//   2. Si es nuestra, ¿tiene disco? -> sinDisco
// La segunda sólo tiene sentido si la primera dio 'en_flota': el disco duro de
// un bus ajeno no es asunto nuestro.
// ============================================================================

export type FleetStatus = "en_flota" | "fuera_de_flota" | "desconocido";

/** Por qué el cruce no pudo concluir. Sólo aplica a 'desconocido'. */
export type FleetUnknownReason =
    | "ppu_incompleta"
    | "padron_no_existe"
    | "padron_vacio"
    | "error_consulta";

export type SinDiscoSource = "flota" | "bus_failures" | "manual";

export interface FlotaRow {
    id: string;
    ppu: string;
    interno?: string | null;
    terminal?: string | null;
    modelo?: string | null;
    tiene_disco: boolean;
    activo: boolean;
    notas?: string | null;
}

export interface BusFailureRow {
    id: string;
    ppu: string;
    failure_type: string;
    case_number?: string | null;
    notes?: string | null;
    created_at: string;
}

export interface FleetCheck {
    /** PPU normalizada (mayúsculas, sólo A-Z0-9). */
    ppu: string;
    status: FleetStatus;
    /** Sólo puede ser true cuando status === 'en_flota'. */
    sinDisco: boolean;
    sinDiscoSource: SinDiscoSource | null;
    bus: FlotaRow | null;
    /** Último reporte de falla registrado para esta PPU, si existe. */
    failure: BusFailureRow | null;
    unknownReason: FleetUnknownReason | null;
}

/**
 * Deja la PPU en su forma canónica: mayúsculas y sólo alfanuméricos.
 * "bxgh-12", "BXGH.12" y "bxgh 12" son la misma patente.
 */
export function normalizePpu(raw?: string | null): string {
    return (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Longitud mínima con la que tiene sentido consultar el padrón. */
export const MIN_PPU_LENGTH = 4;

export function isPpuLookupable(raw?: string | null): boolean {
    return normalizePpu(raw).length >= MIN_PPU_LENGTH;
}

function emptyCheck(ppu: string, unknownReason: FleetUnknownReason): FleetCheck {
    return {
        ppu,
        status: "desconocido",
        sinDisco: false,
        sinDiscoSource: null,
        bus: null,
        failure: null,
        unknownReason,
    };
}

/**
 * Detecta que la tabla `flota` todavía no existe en la base.
 * Postgres devuelve 42P01 ("undefined_table"); PostgREST responde PGRST205
 * cuando el recurso no está en su cache de esquema.
 */
function isMissingTableError(error: { code?: string; message?: string } | null): boolean {
    if (!error) return false;
    if (error.code === "42P01" || error.code === "PGRST205") return true;
    const msg = (error.message || "").toLowerCase();
    return msg.includes("does not exist") || msg.includes("could not find the table");
}

// El padrón se carga una sola vez por SQL y luego cambia muy poco. Consultar su
// tamaño en cada tecla del formulario sería un desperdicio, así que se cachea.
// El TTL corto basta para que una carga nueva se refleje sin recargar la app.
const PADRON_TTL_MS = 60_000;
let padronCache: { loaded: boolean; missing: boolean; at: number } | null = null;

/** Invalida el cache del padrón (usar tras cargar o modificar la flota). */
export function invalidateFleetCache(): void {
    padronCache = null;
}

/**
 * ¿Hay un padrón utilizable? Distinguir "padrón vacío" de "PPU ausente del
 * padrón" es lo que evita que la app bloquee todas las solicitudes mientras
 * la flota todavía no se ha cargado.
 */
async function getPadronStatus(): Promise<{ loaded: boolean; missing: boolean }> {
    const now = Date.now();
    if (padronCache && now - padronCache.at < PADRON_TTL_MS) {
        return { loaded: padronCache.loaded, missing: padronCache.missing };
    }

    const { count, error } = await supabase
        .from(TABLA_PADRON)
        .select("id", { count: "exact", head: true });

    if (error) {
        const missing = isMissingTableError(error);
        if (!missing) console.error("[FLOTA] Error consultando el padrón:", error);
        // Ante un error transitorio no se afirma que el padrón esté cargado:
        // en la duda, la app no debe bloquear.
        const status = { loaded: false, missing };
        padronCache = { ...status, at: now };
        return status;
    }

    const status = { loaded: (count ?? 0) > 0, missing: false };
    padronCache = { ...status, at: now };
    return status;
}

/**
 * Cruza una PPU contra el padrón de flota y el historial de fallas.
 * Nunca lanza: ante cualquier problema devuelve status 'desconocido', que la
 * interfaz trata como "no se pudo verificar" y no como "fuera de flota".
 */
export async function checkPpu(rawPpu?: string | null): Promise<FleetCheck> {
    const ppu = normalizePpu(rawPpu);

    if (ppu.length < MIN_PPU_LENGTH) {
        return emptyCheck(ppu, "ppu_incompleta");
    }

    try {
        const [flotaRes, failureRes, padron] = await Promise.all([
            supabase.from(TABLA_PADRON).select("*").eq("ppu", ppu).maybeSingle(),
            supabase
                .from("bus_failures")
                .select("*")
                .eq("ppu", ppu)
                .order("created_at", { ascending: false })
                .limit(1),
            getPadronStatus(),
        ]);

        const failure = (failureRes.data?.[0] as BusFailureRow | undefined) || null;
        if (failureRes.error) {
            console.error("[FLOTA] Error consultando bus_failures:", failureRes.error);
        }

        if (flotaRes.error) {
            if (isMissingTableError(flotaRes.error)) {
                return { ...emptyCheck(ppu, "padron_no_existe"), failure };
            }
            console.error("[FLOTA] Error consultando flota:", flotaRes.error);
            return { ...emptyCheck(ppu, "error_consulta"), failure };
        }

        const bus = (flotaRes.data as FlotaRow | null) || null;

        if (!bus) {
            if (padron.missing) return { ...emptyCheck(ppu, "padron_no_existe"), failure };
            // Padrón sin filas: la ausencia de la PPU no prueba nada todavía.
            if (!padron.loaded) return { ...emptyCheck(ppu, "padron_vacio"), failure };

            return {
                ppu,
                status: "fuera_de_flota",
                sinDisco: false,
                sinDiscoSource: null,
                bus: null,
                failure,
                unknownReason: null,
            };
        }

        // El bus es nuestro: recién ahora importa el disco duro.
        // El padrón manda; un reporte previo en bus_failures sirve de respaldo
        // para buses cuya ficha aún no refleja la falla.
        let sinDisco = false;
        let sinDiscoSource: SinDiscoSource | null = null;

        if (bus.tiene_disco === false) {
            sinDisco = true;
            sinDiscoSource = "flota";
        } else if (failure?.failure_type === "bus_sin_disco") {
            sinDisco = true;
            sinDiscoSource = "bus_failures";
        }

        return {
            ppu,
            status: "en_flota",
            sinDisco,
            sinDiscoSource,
            bus,
            failure,
            unknownReason: null,
        };
    } catch (e) {
        console.error("[FLOTA] Excepción en checkPpu:", e);
        return emptyCheck(ppu, "error_consulta");
    }
}

/**
 * Deja constancia en el historial de que el bus no tenía disco al tramitar el
 * caso. Es idempotente por caso: reprocesar la misma solicitud no duplica.
 * No lanza — es un registro complementario y no debe voltear el guardado.
 */
export async function registrarBusSinDisco(
    ppu: string,
    caseNumber?: string | null,
    notes?: string | null
): Promise<void> {
    const normalized = normalizePpu(ppu);
    if (!normalized) return;

    try {
        if (caseNumber) {
            const { data: existing } = await supabase
                .from("bus_failures")
                .select("id")
                .eq("ppu", normalized)
                .eq("failure_type", "bus_sin_disco")
                .eq("case_number", caseNumber)
                .limit(1);
            if (existing && existing.length > 0) return;
        }

        const { error } = await supabase.from("bus_failures").insert([
            {
                ppu: normalized,
                failure_type: "bus_sin_disco",
                case_number: caseNumber || null,
                notes: notes || "Detectado automáticamente: el bus no cuenta con disco duro.",
            },
        ]);
        if (error) console.error("[FLOTA] No se pudo registrar el bus sin disco:", error);
    } catch (e) {
        console.error("[FLOTA] Excepción registrando bus sin disco:", e);
    }
}

// ---------------------------------------------------------------------------
// Textos compartidos entre formulario, tabla y correo
// ---------------------------------------------------------------------------

/** Frase exacta que debe aparecer en el correo cuando el bus no tiene disco. */
export const SIN_DISCO_MENSAJE = "BUS NO TIENE DISCO PARA SU REVISION";

export const FLEET_STATUS_LABELS: Record<FleetStatus, string> = {
    en_flota: "En flota",
    fuera_de_flota: "Fuera de flota",
    desconocido: "Sin verificar",
};

export const FLEET_UNKNOWN_MESSAGES: Record<FleetUnknownReason, string> = {
    ppu_incompleta: "Ingresa al menos 4 caracteres para verificar la PPU.",
    padron_no_existe:
        "El padrón de flota aún no existe en la base de datos. Ejecuta la migración de la tabla `flota` para activar la verificación.",
    padron_vacio:
        "El padrón de flota está vacío. Carga las PPUs de la flota para activar la verificación.",
    error_consulta: "No se pudo verificar la PPU contra el padrón. Revisa la conexión.",
};
