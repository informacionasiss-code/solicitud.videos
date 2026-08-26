#!/usr/bin/env node
// ============================================================================
// Ejecutor de pruebas.
//
// El proyecto no tiene framework de test. En lugar de añadir uno con toda su
// configuración, cada archivo `tests/*.test.ts` se empaqueta con esbuild -que
// ya viene con Vite- y se ejecuta en Node. Basta para lo que hace falta:
// comprobar la lógica pura y las funciones que hablan con Supabase mediante un
// doble, sin necesidad de navegador.
//
//   npm test              todas las pruebas
//   npm test -- fleet     sólo las que coincidan con "fleet"
// ============================================================================

import { readdirSync, mkdtempSync, rmSync } from "node:fs";
import { join, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, "..");
const filtro = process.argv[2];

const archivos = readdirSync(aqui)
    .filter((f) => f.endsWith(".test.ts"))
    .filter((f) => !filtro || f.includes(filtro))
    .sort();

if (archivos.length === 0) {
    console.error(filtro ? `Ninguna prueba coincide con "${filtro}".` : "No hay pruebas.");
    process.exit(1);
}

const temp = mkdtempSync(join(tmpdir(), "pruebas-"));
let totalOk = 0;
let totalFallidas = 0;
const rotas = [];

for (const archivo of archivos) {
    const nombre = basename(archivo, ".test.ts");
    const salida = join(temp, `${nombre}.mjs`);

    try {
        execFileSync(
            "npx",
            [
                "esbuild", join(aqui, archivo),
                "--bundle", "--platform=node", "--format=esm",
                `--alias:@=${join(raiz, "src")}`,
                // La app lee estas variables al importar el cliente de Supabase.
                // Apuntan a un host inexistente a propósito: ninguna prueba debe
                // depender de una base real.
                '--define:import.meta.env.VITE_SUPABASE_URL="https://pruebas.supabase.co"',
                '--define:import.meta.env.VITE_SUPABASE_ANON_KEY="clave-de-prueba"',
                // Algunas dependencias (xlsx) usan `require` dinámico, que el
                // formato ESM no resuelve por sí solo. Este preámbulo les
                // proporciona uno real.
                "--banner:js=import { createRequire as __cr } from 'module'; const require = __cr(import.meta.url);",
                `--outfile=${salida}`,
                "--log-level=error",
            ],
            { cwd: raiz, stdio: ["ignore", "ignore", "inherit"] }
        );
    } catch {
        console.log(`\n■ ${nombre}\n  NO COMPILA`);
        rotas.push(nombre);
        totalFallidas++;
        continue;
    }

    let texto = "";
    let codigo = 0;
    try {
        texto = execFileSync("node", [salida], { cwd: raiz, encoding: "utf8" });
    } catch (e) {
        texto = (e.stdout || "") + (e.stderr || "");
        codigo = e.status ?? 1;
    }

    const ok = (texto.match(/^PASS/gm) || []).length;
    const fallidas = (texto.match(/^FALLA/gm) || []).length;
    totalOk += ok;
    totalFallidas += fallidas;

    console.log(`\n■ ${nombre}  —  ${ok} OK${fallidas ? `, ${fallidas} FALLIDAS` : ""}`);
    for (const linea of texto.split("\n")) {
        if (linea.startsWith("FALLA") || linea.trimStart().startsWith("got:")) {
            console.log("  " + linea);
        }
    }
    if (codigo !== 0 && fallidas === 0) {
        console.log("  El proceso terminó con error:");
        console.log(texto.split("\n").slice(-12).map((l) => "  " + l).join("\n"));
        rotas.push(nombre);
        totalFallidas++;
    }
}

rmSync(temp, { recursive: true, force: true });

console.log("\n" + "─".repeat(48));
console.log(`TOTAL: ${totalOk} OK, ${totalFallidas} fallidas`);
if (rotas.length) console.log(`Archivos con problemas: ${rotas.join(", ")}`);
process.exit(totalFallidas === 0 ? 0 : 1);
