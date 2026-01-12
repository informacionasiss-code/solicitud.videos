import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, AlertTriangle, CheckCircle } from "lucide-react";
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

interface RequestFormProps {
    initialValues?: Partial<RequestFormValues>;
    onSubmit: (data: RequestFormValues) => Promise<void>;
    isLoading?: boolean;
    title?: string;
    mode?: "create" | "edit";
}

export function RequestForm({ initialValues, onSubmit, isLoading, mode = "create" }: RequestFormProps) {
    const [caseExists, setCaseExists] = useState<boolean | null>(null);
    const [checkingCase, setCheckingCase] = useState(false);

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

    const handleFormSubmit = async (data: RequestFormValues) => {
        console.log('[FORM] Submitting data:', data);
        if (caseExists && mode === "create") {
            console.log('[FORM] Blocked: case already exists');
            return;
        }
        try {
            await onSubmit(data);
            console.log('[FORM] Submit successful');
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
        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            {Object.keys(errors).length > 0 && (
                <div className="p-2 bg-red-100 border border-red-300 rounded text-xs text-red-700">
                    <strong>Errores de validación:</strong>
                    <ul className="list-disc ml-4 mt-1">
                        {Object.entries(errors).map(([key, err]) => (
                            <li key={key}>{key}: {(err as any)?.message || 'Error'}</li>
                        ))}
                    </ul>
                </div>
            )}

            {/* Enterprise Grid - High Density */}
            <div className="grid grid-cols-12 gap-x-4 gap-y-4">

                {/* Row 1: Identifiers & Dates (Compact) */}
                <div className="col-span-12 md:col-span-3 space-y-1">
                    <Label htmlFor="case_number" className="text-xs font-semibold text-slate-600">Caso #</Label>
                    <div className="relative">
                        <Input
                            id="case_number"
                            placeholder="066..."
                            {...register("case_number")}
                            className={cn(
                                "h-9 text-sm",
                                errors.case_number && "border-red-500",
                                caseExists === true && "border-red-500 pr-8",
                                caseExists === false && caseNumber?.length >= 3 && "border-emerald-500 pr-8"
                            )}
                        />
                        {checkingCase && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <Loader2 className="h-3 w-3 animate-spin text-slate-400" />
                            </div>
                        )}
                        {!checkingCase && caseExists === true && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <AlertTriangle className="h-3 w-3 text-red-500" />
                            </div>
                        )}
                        {!checkingCase && caseExists === false && caseNumber?.length >= 3 && (
                            <div className="absolute right-2 top-1/2 -translate-y-1/2">
                                <CheckCircle className="h-3 w-3 text-emerald-500" />
                            </div>
                        )}
                    </div>
                    {caseExists === true && (
                        <p className="text-[10px] text-red-500 font-medium leading-none mt-1">
                            ¡Duplicado!
                        </p>
                    )}
                </div>

                <div className="col-span-12 md:col-span-3 space-y-1">
                    <Label htmlFor="ppu" className="text-xs font-semibold text-slate-600">PPU</Label>
                    <Input
                        id="ppu"
                        placeholder="BXGH12"
                        {...register("ppu")}
                        className={cn("h-9 text-sm", errors.ppu && "border-red-500")}
                    />
                </div>

                <div className="col-span-12 md:col-span-3 space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Fecha Incidente (24h)</Label>
                    <Controller
                        control={control}
                        name="incident_at"
                        render={({ field }) => (
                            <DateTimeInput
                                {...field}
                                includeTime={true}
                                className="h-9 text-sm"
                                value={field.value as string}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </div>

                <div className="col-span-12 md:col-span-3 space-y-1">
                    <Label className="text-xs font-semibold text-slate-600">Fecha Ingreso</Label>
                    <Controller
                        control={control}
                        name="ingress_at"
                        render={({ field }) => (
                            <DateTimeInput
                                {...field}
                                includeTime={false}
                                className="h-9 text-sm"
                                value={field.value as string}
                                onChange={field.onChange}
                            />
                        )}
                    />
                </div>

                {/* Row 2: Operator & Location */}
                <div className="col-span-12 md:col-span-4 space-y-1">
                    <Label htmlFor="operator_name" className="text-xs font-semibold text-slate-600">Nombre Operador</Label>
                    <Input id="operator_name" className="h-9 text-sm" {...register("operator_name")} placeholder="Opcional..." />
                </div>

                <div className="col-span-12 md:col-span-2 space-y-1">
                    <Label htmlFor="operator_rut" className="text-xs font-semibold text-slate-600">RUT Operador</Label>
                    <Input id="operator_rut" className="h-9 text-sm" {...register("operator_rut")} placeholder="12.345..." />
                </div>

                <div className="col-span-12 md:col-span-6 space-y-1">
                    <Label htmlFor="incident_point" className="text-xs font-semibold text-slate-600">Punto del Incidente</Label>
                    <Input id="incident_point" className="h-9 text-sm" placeholder="Av. Pajaritos..." {...register("incident_point")} />
                </div>

                {/* Row 3: Reason & Detail */}
                <div className="col-span-12 space-y-1">
                    <Label htmlFor="reason" className="text-xs font-semibold text-slate-600">Motivo</Label>
                    <Input id="reason" className="h-9 text-sm" placeholder="Descripción breve..." {...register("reason")} />
                </div>

                <div className="col-span-12 flex-1 min-h-[100px] flex flex-col space-y-1">
                    <Label htmlFor="detail" className="text-xs font-semibold text-slate-600">Detalle Completo</Label>
                    <Textarea
                        id="detail"
                        className="flex-1 min-h-[120px] resize-none text-sm p-3 bg-slate-50 focus:bg-white transition-colors"
                        placeholder="Texto completo del correo..."
                        {...register("detail")}
                    />
                </div>

                {mode === "edit" && (
                    <div className="col-span-12 grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
                        <div className="space-y-1">
                            <Label htmlFor="video_url" className="text-xs font-semibold text-slate-600">URL del Video</Label>
                            <Input id="video_url" className="h-9 text-sm" placeholder="https://..." {...register("video_url")} />
                            {errors.video_url && <p className="text-xs text-red-500">{errors.video_url.message}</p>}
                        </div>

                        <div className="space-y-1">
                            <Label className="text-xs font-semibold text-slate-600">Tipo de Falla</Label>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { value: 'disco_danado', label: 'Disco Dañado', color: 'bg-red-100 text-red-700' },
                                    { value: 'bus_sin_disco', label: 'Sin Disco', color: 'bg-orange-100 text-orange-700' },
                                    { value: 'video_sobreescrito', label: 'Sobreescrito', color: 'bg-amber-100 text-amber-700' },
                                    { value: 'error_lectura', label: 'Error', color: 'bg-purple-100 text-purple-700' },
                                ].map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => form.setValue('failure_type', option.value as any)}
                                        className={cn(
                                            "px-2 py-1 text-xs font-medium rounded border transition-all",
                                            form.watch('failure_type') === option.value
                                                ? `${option.color} border-current`
                                                : "bg-slate-50 text-slate-500 border-slate-200"
                                        )}
                                    >
                                        {option.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            <Button type="submit" disabled={isLoading || checkingCase || caseExists === true} className="w-full bg-slate-900 hover:bg-slate-800 text-white h-10 mt-2">
                {isLoading ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Guardando...
                    </>
                ) : (
                    <>
                        <Save className="mr-2 h-4 w-4" />
                        {mode === "create" ? "Guardar Solicitud" : "Actualizar Solicitud"}
                    </>
                )}
            </Button>
        </form>
    );
}
