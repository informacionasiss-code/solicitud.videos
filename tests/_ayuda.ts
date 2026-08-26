// Utilidades mínimas compartidas por las pruebas.

let fallidas = 0;

/** Registra el resultado de una comprobación. */
export function ok(nombre: string, condicion: boolean, obtenido?: unknown): void {
    console.log(`${condicion ? "PASS" : "FALLA"}  ${nombre}`);
    if (!condicion) {
        fallidas++;
        if (obtenido !== undefined) console.log(`     got: ${JSON.stringify(obtenido)}`);
    }
}

/** Cierra el archivo de pruebas con el código de salida adecuado. */
export function fin(): never {
    console.log(fallidas === 0 ? "\nTODAS PASARON" : `\n${fallidas} FALLARON`);
    process.exit(fallidas === 0 ? 0 : 1);
}

/**
 * Doble del cliente de Supabase.
 *
 * Sustituye `supabase.from` por una cadena de métodos que devuelve lo que la
 * prueba indique y registra lo que se intentó escribir. Evita depender de una
 * base real y permite comprobar exactamente qué consulta hace el código.
 */
export interface DobleSupabase {
    /** Respuestas por tabla: `{ tabla: { select, count } }`. */
    datos: Record<string, { filas?: unknown[]; error?: unknown; count?: number }>;
    /** Filas que el código intentó insertar, por tabla. */
    insertados: Record<string, unknown[]>;
    /** Actualizaciones que el código intentó aplicar, por tabla. */
    actualizados: Record<string, unknown[]>;
    /** Valores usados en cláusulas `in`, por tabla. */
    consultados: Record<string, unknown[]>;
}

export function instalarDobleSupabase(
    supabase: { from: unknown },
    datos: DobleSupabase["datos"]
): DobleSupabase {
    const doble: DobleSupabase = { datos, insertados: {}, actualizados: {}, consultados: {} };

    (supabase as { from: (t: string) => unknown }).from = (tabla: string) => {
        const resp = doble.datos[tabla] || {};
        const filas = resp.filas ?? [];
        let cambiosPendientes: unknown = null;

        const consulta: Record<string, unknown> = {
            select: (_cols?: string, opciones?: { head?: boolean }) => {
                if (opciones?.head) {
                    return Promise.resolve({ count: resp.count ?? filas.length, error: resp.error ?? null });
                }
                return consulta;
            },
            insert: (nuevas: unknown[]) => {
                (doble.insertados[tabla] ||= []).push(...nuevas);
                return { ...consulta, then: undefined, error: null, select: () => consulta };
            },
            update: (cambios: unknown) => {
                cambiosPendientes = cambios;
                return consulta;
            },
            delete: () => consulta,
            in: (_col: string, valores: unknown[]) => {
                (doble.consultados[tabla] ||= []).push(...valores);
                return Promise.resolve({
                    data: filas.filter((f) => valores.includes((f as { ppu?: unknown }).ppu)),
                    error: resp.error ?? null,
                });
            },
            eq: (_col: string, valor: unknown) => {
                if (cambiosPendientes !== null) {
                    (doble.actualizados[tabla] ||= []).push({ id: valor, ...(cambiosPendientes as object) });
                    cambiosPendientes = null;
                    return Promise.resolve({ data: filas[0] ?? null, error: null });
                }
                return consulta;
            },
            order: () => consulta,
            limit: () => Promise.resolve({ data: filas, error: resp.error ?? null }),
            maybeSingle: () => Promise.resolve({ data: filas[0] ?? null, error: resp.error ?? null }),
            single: () => Promise.resolve({ data: filas[0] ?? null, error: resp.error ?? null }),
            then: (resolver: (v: unknown) => unknown) =>
                Promise.resolve({ data: filas, error: resp.error ?? null }).then(resolver),
        };

        return consulta;
    };

    return doble;
}
