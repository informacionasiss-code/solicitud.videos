import { useState, useCallback } from "react";
// import { format } from "date-fns"; // logic changed to standard ISO
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, CheckCircle } from "lucide-react";
import { RequestForm } from "@/components/forms/RequestForm";
import { parseEmlFile } from "@/lib/parser";
import { RequestFormValues } from "@/lib/schemas";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export default function Ingresos() {
    const [parsedData, setParsedData] = useState<Partial<RequestFormValues> | null>(null);
    const [loading, setLoading] = useState(false);
    const [fileUploaded, setFileUploaded] = useState(false);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            try {
                setLoading(true);
                const data = await parseEmlFile(file);
                setParsedData({
                    ...data,
                });
                setFileUploaded(true);
                toast.success("Archivo .eml procesado correctamente");
            } catch (error) {
                console.error(error);
                toast.error("Error al leer el archivo .eml");
            } finally {
                setLoading(false);
            }
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'message/rfc822': ['.eml'] },
        multiple: false
    });

    const handleSubmit = async (values: RequestFormValues) => {
        try {
            setLoading(true);
            const { error } = await supabase.from('solicitudes').insert([
                {
                    case_number: values.case_number,
                    incident_at: values.incident_at ? new Date(values.incident_at).toISOString() : null,
                    ingress_at: values.ingress_at ? new Date(values.ingress_at).toISOString() : null,
                    ppu: values.ppu,
                    incident_point: values.incident_point,
                    reason: values.reason,
                    detail: values.detail,
                    operator_name: values.operator_name || null,
                    operator_rut: values.operator_rut || null,
                    status: 'pendiente'
                }
            ]);

            if (error) throw error;

            toast.success("✅ Solicitud creada exitosamente");
            // Reset form for next entry instead of navigating away
            setParsedData(null);
            setFileUploaded(false);
        } catch (error: any) {
            console.error(error);
            toast.error("Error al guardar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-[calc(100vh-4rem)] w-full overflow-hidden bg-slate-50/50 p-4">
            <div className="grid h-full grid-cols-1 gap-6 lg:grid-cols-12">
                {/* Left Panel: Upload & Info */}
                <div className="flex h-full flex-col gap-4 lg:col-span-4 xl:col-span-3">
                    {/* Drag & Drop Zone */}
                    <div
                        {...getRootProps()}
                        className={`group relative flex flex-1 flex-col items-center justify-center rounded-xl border-2 border-dashed transition-all duration-300 cursor-pointer
                        ${isDragActive
                                ? "border-blue-500 bg-blue-50/50 scale-[0.99]"
                                : fileUploaded
                                    ? "border-emerald-500 bg-emerald-50/50"
                                    : "border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                            }
                        `}
                    >
                        <input {...getInputProps()} />
                        <div className="z-10 flex flex-col items-center gap-4 text-center p-6">
                            <div className={`rounded-2xl p-4 transition-transform duration-300 group-hover:scale-110 shadow-sm
                                ${fileUploaded ? "bg-emerald-100 text-emerald-600" : "bg-white text-slate-400"}
                            `}>
                                {fileUploaded ? (
                                    <CheckCircle className="h-10 w-10" />
                                ) : (
                                    <UploadCloud className="h-10 w-10" />
                                )}
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-semibold text-slate-800">
                                    {fileUploaded ? "¡Archivo Procesado!" : "Nuevo Ingreso"}
                                </h3>
                                <p className="text-sm text-slate-500 max-w-[200px] leading-relaxed">
                                    {fileUploaded
                                        ? "La información ha sido extraída. Verifica los datos a la derecha."
                                        : "Arrastra tu archivo .eml aquí o haz clic para buscar"}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Helper Card */}
                    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="mb-3 flex items-center gap-2">
                            <div className="rounded-lg bg-blue-100 p-1.5 text-blue-600">
                                <FileText className="h-4 w-4" />
                            </div>
                            <span className="font-semibold text-slate-700 text-sm">Datos Reconocidos</span>
                        </div>
                        <div className="space-y-3">
                            {[
                                { label: "N° Caso", desc: "Formato: #1234..." },
                                { label: "Fechas", desc: "Incidente e Ingreso" },
                                { label: "PPU", desc: "Patente del Bus" },
                                { label: "Detalles", desc: "Ubicación y Motivo" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center justify-between text-xs">
                                    <span className="font-medium text-slate-600">{item.label}</span>
                                    <span className="text-slate-400">{item.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Panel: High Density Form */}
                <div className="relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-8 xl:col-span-9">
                    <div className="flex-1 overflow-y-auto p-0 scrollbar-thin scrollbar-thumb-slate-200 hover:scrollbar-thumb-slate-300">
                        <RequestForm
                            initialValues={parsedData || {}}
                            onSubmit={handleSubmit}
                            isLoading={loading}
                            title="Detalles de la Solicitud"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
