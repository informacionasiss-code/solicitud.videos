import { AlertOctagon, AlertTriangle, CheckCircle2, HardDrive, Info, Loader2 } from "lucide-react";
import {
    FLEET_UNKNOWN_MESSAGES,
    SIN_DISCO_MENSAJE,
    type FleetCheck,
} from "@/lib/fleet";

interface PpuFleetAlertProps {
    check: FleetCheck | null;
    isChecking: boolean;
    /** Oculta el estado "todo correcto" cuando no aporta (p. ej. en listas). */
    hideSuccess?: boolean;
}

/**
 * Resultado del cruce de la PPU contra el padrón de flota.
 *
 * Tres desenlaces, en orden de gravedad:
 *   - fuera de flota  -> rojo, el caso no debe tramitarse
 *   - sin disco duro  -> ámbar, se tramita pero sin video posible
 *   - en flota con disco -> verde discreto
 */
export function PpuFleetAlert({ check, isChecking, hideSuccess }: PpuFleetAlertProps) {
    if (isChecking) {
        return (
            <div className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                Verificando PPU contra el padrón de flota...
            </div>
        );
    }

    if (!check) return null;

    // --- No pertenece a la flota -------------------------------------------
    if (check.status === "fuera_de_flota") {
        return (
            <div
                role="alert"
                className="rounded-xl border-2 border-red-500 bg-red-50 p-4 shadow-sm"
            >
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-red-600 text-white">
                        <AlertOctagon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-base font-extrabold uppercase tracking-wide text-red-700">
                            PPU fuera de flota — no considerar
                        </h4>
                        <p className="mt-1 text-sm text-red-700">
                            La patente <strong className="font-mono">{check.ppu}</strong> no
                            pertenece a nuestra flota. Esta solicitud no corresponde a un bus
                            nuestro y no debe tramitarse.
                        </p>
                        <p className="mt-2 text-xs font-semibold text-red-600">
                            El registro está bloqueado. Verifica la patente en el correo de
                            origen; si el bus sí es nuestro, primero agrégalo al padrón de flota.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // --- Es nuestro pero no tiene disco duro -------------------------------
    if (check.status === "en_flota" && check.sinDisco) {
        return (
            <div
                role="alert"
                className="rounded-xl border-2 border-amber-500 bg-amber-50 p-4 shadow-sm"
            >
                <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-600 text-white">
                        <HardDrive className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                        <h4 className="text-base font-extrabold uppercase tracking-wide text-amber-800">
                            {SIN_DISCO_MENSAJE}
                        </h4>
                        <p className="mt-1 text-sm text-amber-800">
                            El bus <strong className="font-mono">{check.ppu}</strong>
                            {check.bus?.interno ? ` (interno ${check.bus.interno})` : ""} es de
                            nuestra flota, pero <strong>no cuenta con disco duro</strong> según el
                            padrón. No hay grabación posible para este caso.
                        </p>
                        <p className="mt-2 rounded-md bg-amber-100 px-3 py-2 text-xs font-semibold text-amber-900">
                            Al guardar se enviará el correo de inmediato con el aviso
                            «{SIN_DISCO_MENSAJE}» y el caso quedará cerrado como enviado: no hay
                            revisión que esperar.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // --- No se pudo verificar ----------------------------------------------
    if (check.status === "desconocido") {
        if (check.unknownReason === "ppu_incompleta") return null;
        return (
            <div className="flex items-start gap-2 rounded-lg border border-slate-300 bg-slate-50 px-3 py-2 text-sm text-slate-600">
                <Info className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
                <span>
                    {check.unknownReason
                        ? FLEET_UNKNOWN_MESSAGES[check.unknownReason]
                        : "No se pudo verificar la PPU."}
                </span>
            </div>
        );
    }

    // --- En flota y con disco ----------------------------------------------
    if (hideSuccess) return null;

    const tieneFallaPrevia = Boolean(check.failure);

    return (
        <div className="flex items-start gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" />
            <div>
                <span>
                    PPU <strong className="font-mono">{check.ppu}</strong> verificada en el padrón
                    de flota
                    {check.bus?.interno ? ` — interno ${check.bus.interno}` : ""}
                    {check.bus?.terminal ? ` · ${check.bus.terminal}` : ""}.
                </span>
                {check.bus?.activo === false && (
                    <span className="mt-1 flex items-center gap-1 text-xs font-medium text-slate-500">
                        <AlertTriangle className="h-3 w-3" />
                        Bus dado de baja en el padrón.
                    </span>
                )}
                {tieneFallaPrevia && (
                    <span className="mt-1 block text-xs text-emerald-600">
                        Reporte previo registrado:{" "}
                        {check.failure?.failure_type.replace(/_/g, " ")}.
                    </span>
                )}
            </div>
        </div>
    );
}
