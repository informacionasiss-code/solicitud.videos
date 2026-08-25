import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, AlertTriangle, CheckCircle, Ban } from "lucide-react";
import { requestSchema, type RequestFormValues } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useState, useEffect, useCallback } from "react";
import { DateTimeInput } from "@/components/ui/datetime-input";
import { Controller } from "react-hook-form";
import { checkPpu, normalizePpu, SIN_DISCO_MENSAJE, type FleetCheck } from "@/lib/fleet";
import { PpuFleetAlert } from "@/components/fleet/PpuFleetAlert";

interface RequestFormProps {
    initialValues?: Partial<RequestFormValues>;
    onSubmit: (data: RequestFormValues) => Promise<void>;
    isLoading?: boolean;
    title?: string;
    mode?: "create" | "edit";
    /** Notifica al contenedor cada vez que cambia el cruce con el padrón. */
    onFleetCheckChange?: (check: FleetCheck | null) => void;
}

export function RequestForm({ initialValues, onSubmit, isLoading, mode = "create", onFleetCheckChange }: RequestFormProps) {
    const [caseExists, setCaseExists] = useState<boolean | null>(null);
    const [checkingCase, setCheckingCase] = useState(false);
    const [fleetCheck, setFleetCheck] = useState<FleetCheck | null>(null);
    const [checkingPpu, setCheckingPpu] = useState(false);

    const form = useForm<RequestFormValues>({
        resolver: zodResolver(requestSchema),
        defaultValues: {
            case_number: "",
            incident_at: "",
            ingress_at: "",
            ppu: "",
            incident_point: "",
            reason: "",
            detail: "",
            video_url: "",
            obs: "",
            operator_name: "",
            operator_rut: "",
            failure_type: "",
            status: "pendiente",
            ...initialValues,
        },
    });

    const { register, handleSubmit, formState: { errors }, control } = form;
    const caseNumber = useWatch({ control, name: "case_number" });
    const ppu = useWatch({ control, name: "ppu" });

    // Check if case number exists
    const checkCaseExists = useCallback(async (caseNum: string) => {
        if (!caseNum || caseNum.length < 3) {
            setCaseExists(null);
            return;
        }

        setCheckingCase(true);
        try {
            const { data, error } = await supabase
                .from('solicitudes')
                .select('id')
                .eq('case_number', caseNum)
                .maybeSingle();

            if (error) {
                console.error('Error checking case:', error);
                setCaseExists(null);
            } else {
                // In edit mode, ignore if it's the same record
                if (mode === "edit" && initialValues?.case_number === caseNum) {
                    setCaseExists(false);
                } else {
                    setCaseExists(!!data);
                }
            }
        } catch (e) {
            console.error('Error:', e);
            setCaseExists(null);
        } finally {
            setCheckingCase(false);
        }
    }, [mode, initialValues?.case_number]);

    // Debounce case number check
    useEffect(() => {
        const timer = setTimeout(() => {
            checkCaseExists(caseNumber);
        }, 300);
        return () => clearTimeout(timer);
    }, [caseNumber, checkCaseExists]);

    // ------------------------------------------------------------------
    // Cruce de la PPU contra el padrón de flota.
    // Se ignoran las respuestas que llegan fuera de orden: con debounce corto
    // una consulta lenta podía pisar el resultado de una PPU ya corregida.
    // ------------------------------------------------------------------
    useEffect(() => {
        const normalized = normalizePpu(ppu);

        if (normalized.length < 4) {
            setCheckingPpu(false);
            setFleetCheck(null);
            return;
        }

        let cancelled = false;
        setCheckingPpu(true);

        const timer = setTimeout(async () => {
            const result = await checkPpu(normalized);
            if (cancelled) return;
            setFleetCheck(result);
            setCheckingPpu(false);
        }, 400);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [ppu]);

    // Avisar al contenedor (Ingresos/Registros) del resultado vigente.
    useEffect(() => {
        onFleetCheckChange?.(fleetCheck);
    }, [fleetCheck, onFleetCheckChange]);

    // Detección proveniente del padrón. Es la que bloquea campos: si el padrón
    // dice que no hay disco, el operador no debe poder contradecirlo.
    const sinDiscoPadron = fleetCheck?.status === "en_flota" && fleetCheck.sinDisco;

    const failureType = useWatch({ control, name: "failure_type" });

    // Un bus sin disco no puede tener video: la falla se fija sola para que el
    // operador no tenga que recordarlo y para que el correo salga correcto.
    useEffect(() => {
        if (sinDiscoPadron && form.getValues("failure_type") !== "bus_sin_disco") {
            form.setValue("failure_type", "bus_sin_disco");
        }
    }, [sinDiscoPadron, form]);

    /**
     * Valor que efectivamente se guarda.
     *
     * El padrón manda cuando pudo consultarse. Si no (sin conexión, padrón sin
     * cargar), se conserva lo que ya estaba registrado: un hecho confirmado
     * antes no puede borrarse sólo porque hoy la consulta falló. La marca
     * manual del operador también cuenta, venga de donde venga.
     */
    const sinDiscoEfectivo = fleetCheck?.status === "en_flota"
        ? (fleetCheck.sinDisco || failureType === "bus_sin_disco")
        : (Boolean(initialValues?.sin_disco) || failureType === "bus_sin_disco");

    const sinDiscoSourceEfectivo = sinDiscoPadron
        ? (fleetCheck?.sinDiscoSource ?? "flota")
        : sinDiscoEfectivo
            ? (initialValues?.sin_disco_source || "manual")
            : null;

    const isFueraDeFlota = fleetCheck?.status === "fuera_de_flota";
    const isDuplicado = caseExists === true && mode === "create";
    const submitBloqueado = isFueraDeFlota || isDuplicado;

    const handleFormSubmit = async (data: RequestFormValues) => {
        if (isDuplicado) {
            console.log('[FORM] Bloqueado: el caso ya existe');
            return;
        }

        // Segunda barrera: aunque la interfaz deshabilita el botón, un submit
        // por teclado o un cambio de PPU de último momento no debe colarse.
        if (isFueraDeFlota) {
            console.log('[FORM] Bloqueado: PPU fuera de flota');
            return;
        }

        const payload: RequestFormValues = {
            ...data,
            ppu: normalizePpu(data.ppu),
            // Un 'desconocido' de hoy no debe pisar un 'en_flota' ya verificado.
            fleet_status: fleetCheck && fleetCheck.status !== 'desconocido'
                ? fleetCheck.status
                : (initialValues?.fleet_status ?? 'desconocido'),
            sin_disco: sinDiscoEfectivo,
            sin_disco_source: sinDiscoEfectivo ? sinDiscoSourceEfectivo : null,
            failure_type: sinDiscoEfectivo ? 'bus_sin_disco' : data.failure_type,
        };

        try {
            await onSubmit(payload);
        } catch (error) {
            console.error('[FORM] Submit error:', error);
        }
    };

    // Log validation errors
    useEffect(() => {
        if (Object.keys(errors).length > 0) {
            console.log('[FORM] Validation errors:', errors);
        }
    }, [errors]);

    return (
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
            {Object.keys(errors).length > 0 && (
                <div className="p-3 bg-red-100 border border-red-300 rounded-lg text-sm text-red-700">
                    <strong>Errores de validación:</strong>
                    <ul className="list-disc ml-4 mt-1">
                        {Object.entries(errors).map(([key, err]) => (
                            <li key={key}>{key}: {(err as any)?.message || 'Error'}</li>
                        ))}
                    </ul>
                </div>
            )}
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                {/* CSS to attempt to hide AM/PM in some browsers if supported, usually system dependent */}
                <style>{`
                            input[type="datetime-local"]::-webkit-calendar-picker-indicator { cursor: pointer; }
                        `}</style>

                <div className="space-y-1.5">
                    <Label htmlFor="case_number" className="label-enterprise">N° Caso</Label>
                    <div className="relative">
                        <Input
                            id="case_number"
                            placeholder="06651555"
                            {...register("case_number")}
                            className={cn(
                                errors.case_number && "border-red-500",
                                caseExists === true && "border-red-500 pr-10",
                                caseExists === false && caseNumber?.length >= 3 && "border-emerald-500 pr-10"
                            )}
                        />
                        {checkingCase && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                            </div>
                        )}
                        {!checkingCase && caseExists === true && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <AlertTriangle className="h-4 w-4 text-red-500" />
                            </div>
                        )}
                        {!checkingCase && caseExists === false && caseNumber?.length >= 3 && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                            </div>
                        )}
                    </div>
                    {errors.case_number && <p className="text-xs text-red-500">{errors.case_number.message}</p>}
                    {caseExists === true && (
                        <p className="text-xs text-red-500 font-medium flex items-center gap-1">
                            <AlertTriangle className="h-3 w-3" />
                            ¡Este caso ya está registrado!
                        </p>
                    )}
                </div>

                <div className="space-y-1.5">
                    <Label htmlFor="ppu" className="label-enterprise">PPU</Label>
                    <div className="relative">
                        <Input
                            id="ppu"
                            placeholder="BXGH12"
                            {...register("ppu")}
                            className={cn(
                                "uppercase",
                                errors.ppu && "border-red-500",
                                isFueraDeFlota && "border-red-500 ring-1 ring-red-400 pr-10",
                                sinDiscoPadron && "border-amber-500 ring-1 ring-amber-400 pr-10",
                                fleetCheck?.status === "en_flota" && !fleetCheck.sinDisco && "border-emerald-500 pr-10"
                            )}
                        />
                        {checkingPpu && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
                            </div>
                        )}
                        {!checkingPpu && isFueraDeFlota && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <Ban className="h-4 w-4 text-red-500" />
                            </div>
                        )}
                        {!checkingPpu && fleetCheck?.status === "en_flota" && !fleetCheck.sinDisco && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                <CheckCircle className="h-4 w-4 text-emerald-500" />
                            </div>
                        )}
                    </div>
                    {errors.ppu && <p className="text-xs text-red-500">{errors.ppu.message}</p>}
                </div>

                {/* Resultado del cruce con el padrón de flota */}
                <div className="md:col-span-2">
                    <PpuFleetAlert check={fleetCheck} isChecking={checkingPpu} />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="incident_at">Fecha Incidente (DD/MM/AAAA + HH:mm)</Label>
                    <Controller
                        control={control}
                        name="incident_at"
                        render={({ field }) => (
                            <DateTimeInput
                                {...field}
                                includeTime={true}
                                value={field.value as string}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="ingress_at">Fecha Ingreso (Solo Fecha)</Label>
                    <Controller
                        control={control}
                        name="ingress_at"
                        render={({ field }) => (
                            <DateTimeInput
                                {...field}
                                includeTime={false}
                                value={field.value as string}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="incident_point">Punto del Incidente</Label>
                    <Input id="incident_point" placeholder="Av. Pajaritos / Las Torres..." {...register("incident_point")} />
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="reason">Motivo</Label>
                    <Textarea id="reason" placeholder="Descripción breve..." {...register("reason")} />
                </div>

                <div className="space-y-2 md:col-span-2">
                    <Label htmlFor="detail">Detalle Completo</Label>
                    <Textarea id="detail" className="min-h-[150px]" placeholder="Texto completo del correo..." {...register("detail")} />
                </div>

                {/* Operator Info - Always visible if data exists */}
                <div className="space-y-2">
                    <Label htmlFor="operator_name">Operador (DATOS OB)</Label>
                    <Input
                        id="operator_name"
                        placeholder="Extraído del email..."
                        {...register("operator_name")}
                    />
                </div>

                <div className="space-y-2">
                    <Label htmlFor="operator_rut">RUT Operador</Label>
                    <Input
                        id="operator_rut"
                        placeholder="12345678-9"
                        {...register("operator_rut")}
                    />
                </div>

                {mode === "edit" && (
                    <>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="video_url">URL del Video</Label>
                            <Input
                                id="video_url"
                                placeholder={sinDiscoEfectivo ? "Sin disco duro: no hay video que adjuntar" : "https://..."}
                                disabled={sinDiscoEfectivo}
                                {...register("video_url")}
                            />
                            {sinDiscoEfectivo && (
                                <p className="text-xs text-amber-700">
                                    Campo deshabilitado: el bus no tiene disco duro, no existe grabación.
                                </p>
                            )}
                            {errors.video_url && <p className="text-xs text-red-500">{errors.video_url.message}</p>}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label>Tipo de Falla (si no hay video)</Label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { value: 'disco_danado', label: 'Disco Dañado', color: 'bg-red-100 text-red-700 hover:bg-red-200 border-red-200' },
                                    { value: 'bus_sin_disco', label: 'Bus Sin Disco', color: 'bg-orange-100 text-orange-700 hover:bg-orange-200 border-orange-200' },
                                    { value: 'video_sobreescrito', label: 'Sobreescrito', color: 'bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200' },
                                    { value: 'error_lectura', label: 'Error Lectura', color: 'bg-purple-100 text-purple-700 hover:bg-purple-200 border-purple-200' },
                                    { value: 'no_disponible', label: 'No Disponible', color: 'bg-slate-100 text-slate-700 hover:bg-slate-200 border-slate-200' },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        disabled={sinDiscoPadron}
                                        onClick={() => form.setValue('failure_type', option.value as any)}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all disabled:cursor-not-allowed disabled:opacity-60 ${form.watch('failure_type') === option.value
                                            ? option.color + ' ring-2 ring-offset-1 ring-blue-500'
                                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                                            }`}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                                {failureType && !sinDiscoPadron && (
                                    <button
                                        type="button"
                                        onClick={() => form.setValue('failure_type', '' as any)}
                                        className="px-3 py-1.5 text-xs font-medium rounded-full bg-white text-slate-500 hover:bg-slate-50 border border-dashed border-slate-300"
                                    >
                                        ✕ Limpiar
                                    </button>
                                )}
                            </div>
                            {sinDiscoPadron && (
                                <p className="text-xs text-amber-700">
                                    Fijado automáticamente en «Bus Sin Disco» según el padrón de flota.
                                </p>
                            )}
                        </div>

                        <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="obs">Observaciones Adicionales</Label>
                            <Textarea
                                id="obs"
                                placeholder="Notas adicionales..."
                                className="min-h-[80px]"
                                {...register("obs")}
                            />
                        </div>
                    </>
                )}
            </div>

            <div className="flex flex-col items-end gap-2">
                {isFueraDeFlota && (
                    <p className="flex items-center gap-1.5 text-sm font-semibold text-red-600">
                        <Ban className="h-4 w-4" />
                        Registro bloqueado: la PPU no pertenece a nuestra flota.
                    </p>
                )}
                {sinDiscoEfectivo && !isFueraDeFlota && (
                    <p className="text-xs font-medium text-amber-700">
                        Se guardará como «Bus sin disco». El correo dirá: «{SIN_DISCO_MENSAJE}».
                    </p>
                )}
                <Button
                    type="submit"
                    disabled={isLoading || submitBloqueado}
                    className={cn(submitBloqueado && "opacity-50 cursor-not-allowed")}
                >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {isLoading ? "Guardando..." : "Guardar Solicitud"}
                    {!isLoading && <Save className="ml-2 h-4 w-4" />}
                </Button>
            </div>
        </form>
    );
}
