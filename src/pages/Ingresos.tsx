import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, Sparkles, CheckCircle } from "lucide-react";
import { RequestForm } from "@/components/forms/RequestForm";
import { parseEmlFile } from "@/lib/parser";
import { RequestFormValues } from "@/lib/schemas";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Ingresos() {
    const [parsedData, setParsedData] = useState<Partial<RequestFormValues> | null>(null);
    const [loading, setLoading] = useState(false);
    const [fileUploaded, setFileUploaded] = useState(false);
    const navigate = useNavigate();

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
                    status: 'pendiente'
                }
            ]);

            if (error) throw error;

            toast.success("Solicitud creada exitosamente");
            navigate("/registros");
        } catch (error: any) {
            console.error(error);
            toast.error("Error al guardar: " + error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
                {/* Left Column - Drop Zone */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Drop Zone Card */}
                    <div
                        {...getRootProps()}
                        className={`drop-zone relative p-8 flex flex-col items-center justify-center cursor-pointer min-h-[280px] ${isDragActive ? 'active border-blue-500 bg-blue-50' : ''
                            } ${fileUploaded ? 'border-emerald-500 bg-emerald-50' : ''}`}
                    >
                        <input {...getInputProps()} />

                        {fileUploaded ? (
                            <>
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-4 shadow-lg">
                                    <CheckCircle className="h-8 w-8 text-white" />
                                </div>
                                <p className="text-lg font-semibold text-emerald-700">¡Archivo Cargado!</p>
                                <p className="text-sm text-emerald-600 mt-1">Los datos han sido extraídos</p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setFileUploaded(false); setParsedData(null); }}
                                    className="mt-4 text-xs text-slate-500 hover:text-slate-700 underline"
                                >
                                    Cargar otro archivo
                                </button>
                            </>
                        ) : loading ? (
                            <>
                                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center mb-4 shadow-lg animate-pulse">
                                    <Sparkles className="h-8 w-8 text-white animate-spin" />
                                </div>
                                <p className="text-lg font-semibold text-slate-700">Procesando...</p>
                                <p className="text-sm text-slate-500 mt-1">Extrayendo datos del correo</p>
                            </>
                        ) : (
                            <>
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-lg transition-all ${isDragActive
                                        ? 'bg-gradient-to-br from-blue-500 to-indigo-600 scale-110'
                                        : 'bg-gradient-to-br from-slate-500 to-slate-600'
                                    }`}>
                                    <UploadCloud className="h-8 w-8 text-white" />
                                </div>
                                <p className="text-lg font-semibold text-slate-700">
                                    {isDragActive ? "Suelta aquí" : "Arrastra un .eml"}
                                </p>
                                <p className="text-sm text-slate-500 mt-1 text-center">
                                    o haz click para seleccionar
                                </p>
                                <div className="mt-6 px-4 py-2 bg-slate-100 rounded-full text-xs text-slate-500">
                                    Solo archivos .eml
                                </div>
                            </>
                        )}
                    </div>

                    {/* Instructions Card */}
                    <div className="card-premium p-6">
                        <h4 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
                            <FileText className="h-4 w-4 text-blue-600" />
                            Formato Esperado
                        </h4>
                        <p className="text-sm text-slate-600 mb-3">
                            El archivo .eml debe contener las siguientes etiquetas:
                        </p>
                        <div className="space-y-2">
                            {[
                                { label: "Case number #", desc: "Número de caso" },
                                { label: "Fecha del incidente:", desc: "dd/mm/yyyy" },
                                { label: "Fecha de ingreso:", desc: "dd/mm/yyyy" },
                                { label: "PPU:", desc: "Patente del vehículo" },
                                { label: "Punto del incidente:", desc: "Ubicación" },
                            ].map((item, i) => (
                                <div key={i} className="flex items-center text-xs">
                                    <code className="px-2 py-1 bg-slate-100 rounded text-slate-700 font-mono">{item.label}</code>
                                    <span className="ml-2 text-slate-500">{item.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column - Form */}
                <div className="lg:col-span-3">
                    <div className="card-premium p-6">
                        <div className="mb-6">
                            <h3 className="text-lg font-semibold text-slate-900">Datos de la Solicitud</h3>
                            <p className="text-sm text-slate-500">Completa los campos requeridos</p>
                        </div>
                        <RequestForm
                            initialValues={parsedData || {}}
                            onSubmit={handleSubmit}
                            isLoading={loading}
                            key={parsedData ? 'loaded' : 'new'}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
