import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save, AlertTriangle, CheckCircle } from "lucide-react";
import { requestSchema, type RequestFormValues } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { supabase } from "@/lib/supabase";
import { useState, useEffect, useCallback } from "react";

interface RequestFormProps {
    initialValues?: Partial<RequestFormValues>;
    onSubmit: (data: RequestFormValues) => Promise<void>;
    isLoading?: boolean;
    title?: string;
    mode?: "create" | "edit";
}

export function RequestForm({ initialValues, onSubmit, isLoading, title = "Formulario de Solicitud", mode = "create" }: RequestFormProps) {
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
        if (caseExists && mode === "create") {
            return; // Prevent submit if case exists
        }
        await onSubmit(data);
    };

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

                        <div className="space-y-2">
                            <Label htmlFor="case_number">Caso #</Label>
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

                        <div className="space-y-2">
                            <Label htmlFor="ppu">PPU</Label>
                            <Input
                                id="ppu"
                                placeholder="BXGH12"
                                {...register("ppu")}
                                className={cn(errors.ppu && "border-red-500")}
                            />
                            {errors.ppu && <p className="text-xs text-red-500">{errors.ppu.message}</p>}
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="incident_at">Fecha Incidente</Label>
                            <Input id="incident_at" type="datetime-local" {...register("incident_at")} />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="ingress_at">Fecha Ingreso</Label>
                            <Input id="ingress_at" type="datetime-local" {...register("ingress_at")} />
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
                                    <Input id="video_url" placeholder="https://..." {...register("video_url")} />
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
                                                onClick={() => form.setValue('failure_type', option.value as any)}
                                                className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-all ${form.watch('failure_type') === option.value
                                                    ? option.color + ' ring-2 ring-offset-1 ring-blue-500'
                                                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border-slate-200'
                                                    }`}
                                            >
                                                {option.label}
                                            </button>
                                        ))}
                                        {form.watch('failure_type') && (
                                            <button
                                                type="button"
                                                onClick={() => form.setValue('failure_type', '' as any)}
                                                className="px-3 py-1.5 text-xs font-medium rounded-full bg-white text-slate-500 hover:bg-slate-50 border border-dashed border-slate-300"
                                            >
                                                ✕ Limpiar
                                            </button>
                                        )}
                                    </div>
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

                    <div className="flex justify-end">
                        <Button
                            type="submit"
                            disabled={isLoading || (caseExists === true && mode === "create")}
                            className={cn(
                                caseExists === true && mode === "create" && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            {isLoading ? "Guardando..." : "Guardar Solicitud"}
                            {!isLoading && <Save className="ml-2 h-4 w-4" />}
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}
