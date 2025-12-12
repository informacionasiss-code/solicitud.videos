import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText } from "lucide-react";
import { RequestForm } from "@/components/forms/RequestForm";
import { parseEmlFile } from "@/lib/parser";
import { RequestFormValues } from "@/lib/schemas";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";

export default function Ingresos() {
    const [parsedData, setParsedData] = useState<Partial<RequestFormValues> | null>(null);
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            try {
                setLoading(true);
                const data = await parseEmlFile(file);
                // Transform parsed data to form format if needed
                // E.g. date formatting
                setParsedData({
                    ...data,
                    // Add default timestamps if missing or format them
                    // incident_at: data.incident_at ? new Date(data.incident_at).toISOString().slice(0, 16) : undefined
                });
                toast.success("Archivo procesado correctamente");
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
            // Insert into Supabase
            const { error } = await supabase.from('solicitudes').insert([
                {
                    case_number: values.case_number,
                    incident_at: values.incident_at ? new Date(values.incident_at).toISOString() : null,
                    ingress_at: values.ingress_at ? new Date(values.ingress_at).toISOString() : null,
                    ppu: values.ppu,
                    incident_point: values.incident_point,
                    reason: values.reason,
                    detail: values.detail,
                    status: 'pendiente'
                }
            ]);

            if (error) throw error;

            toast.success("Solicitud creada exitosamente");
            navigate("/registros"); // Redirect to list
        } catch (error: any) {
            console.error(error);
            toast.error("Error al guardar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-4xl mx-auto">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Nuevo Ingreso</h2>
                <p className="text-slate-500">Crea una solicitud manual o arrastra un correo (.eml).</p>
            </div>

            <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                <div className="md:col-span-1">
                    <Card
                        {...getRootProps()}
                        className={`flex flex-col items-center justify-center p-8 border-2 border-dashed cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-900 ${isDragActive ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20' : 'border-slate-300'}`}
                    >
                        <input {...getInputProps()} />
                        <div className="h-12 w-12 rounded-full bg-slate-100 flex items-center justify-center mb-4">
                            {loading ? <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-slate-600"></div> : <UploadCloud className="h-6 w-6 text-slate-600" />}
                        </div>
                        <p className="text-sm font-medium text-center text-slate-900">
                            {isDragActive ? "Suelta el archivo aquí" : "Arrastra un .eml"}
                        </p>
                        <p className="text-xs text-slate-500 mt-1 text-center">
                            o haz click para buscar
                        </p>
                    </Card>

                    <div className="mt-4 p-4 bg-blue-50 rounded-lg text-sm text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
                        <h4 className="font-semibold mb-2 flex items-center"><FileText className="h-4 w-4 mr-2" /> Instrucciones</h4>
                        <p>El archivo .eml debe contener:</p>
                        <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
                            <li>#Caso (en asunto/cuerpo)</li>
                            <li>Fecha incidente</li>
                            <li>PPU</li>
                            <li>Motivo</li>
                        </ul>
                    </div>
                </div>

                <div className="md:col-span-2">
                    <RequestForm
                        initialValues={parsedData || {}}
                        onSubmit={handleSubmit}
                        isLoading={loading}
                        key={parsedData ? 'loaded' : 'new'} // Force re-render on data load
                    />
                </div>
            </div>
        </div>
    );
}
