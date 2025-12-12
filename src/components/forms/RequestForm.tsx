import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2, Save } from "lucide-react";
import { requestSchema, type RequestFormValues } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface RequestFormProps {
    initialValues?: Partial<RequestFormValues>;
    onSubmit: (data: RequestFormValues) => Promise<void>;
    isLoading?: boolean;
    title?: string;
    mode?: "create" | "edit";
}

export function RequestForm({ initialValues, onSubmit, isLoading, title = "Formulario de Solicitud", mode = "create" }: RequestFormProps) {
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
            status: "pendiente",
            ...initialValues,
        },
    });

    const { register, handleSubmit, formState: { errors } } = form;

    return (
        <Card className="w-full">
            <CardHeader>
                <CardTitle>{title}</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">

                        <div className="space-y-2">
                            <Label htmlFor="case_number">Caso #</Label>
                            <Input
                                id="case_number"
                                placeholder="06651555"
                                {...register("case_number")}
                                className={cn(errors.case_number && "border-red-500")}
                            />
                            {errors.case_number && <p className="text-xs text-red-500">{errors.case_number.message}</p>}
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

                        {mode === "edit" && (
                            <div className="space-y-2 md:col-span-2">
                                <Label htmlFor="video_url">URL del Video</Label>
                                <Input id="video_url" placeholder="https://..." {...register("video_url")} />
                                {errors.video_url && <p className="text-xs text-red-500">{errors.video_url.message}</p>}
                            </div>
                        )}
                    </div>

                    <div className="flex justify-end">
                        <Button type="submit" disabled={isLoading}>
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
