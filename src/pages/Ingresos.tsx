import { useState, useCallback } from "react";
// import { format } from "date-fns"; // logic changed to standard ISO
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, Sparkles, CheckCircle } from "lucide-react";
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
        <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
                {/* Left Column - Drop Zone */}
                <div className="lg:col-span-5 space-y-6">
                    {/* Drop Zone Card */}
                    <div
                        {...getRootProps()}
                        className={`drop-zone relative p-10 flex flex-col items-center justify-center cursor-pointer min-h-[320px] ${isDragActive ? 'active' : ''} ${fileUploaded ? 'success' : ''}`}
                    >
                        <input {...getInputProps()} />

                        {fileUploaded ? (
                            <>
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-5 shadow-xl">
                                    <CheckCircle className="h-10 w-10 text-white" />
                                </div>
                                <p className="text-xl font-bold text-emerald-700">¡Archivo Procesado!</p>
                                <p className="text-sm text-emerald-600 mt-2 text-center max-w-[220px]">Los datos han sido extraídos correctamente. Revisa el formulario.</p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); setFileUploaded(false); setParsedData(null); }}
                                    className="mt-6 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-all"
                                >
                                    Cargar otro archivo
                                </button>
                            </>
                        ) : loading ? (
                            <>
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-5 shadow-xl animate-pulse">
                                    <Sparkles className="h-10 w-10 text-white animate-spin" />
                                </div>
                                <p className="text-xl font-bold text-slate-700">Procesando...</p>
                                <p className="text-sm text-slate-500 mt-2">Extrayendo datos del correo</p>
                            </>
                        ) : (
                            <>
                                <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-5 shadow-xl transition-all duration-300 ${isDragActive
                                    ? 'bg-gradient-to-br from-indigo-500 to-purple-600 scale-110'
                                    : 'bg-gradient-to-br from-slate-600 to-slate-800'
                                    }`}>
                                    <UploadCloud className="h-10 w-10 text-white" />
                                </div>
                                <p className="text-xl font-bold text-slate-800">
                                    {isDragActive ? "Suelta aquí" : "Arrastra un archivo .eml"}
                                </p>
                                <p className="text-sm text-slate-500 mt-2 text-center">
                                    o haz click para seleccionar
                                </p>
                                <div className="mt-6 px-5 py-2 bg-white rounded-full text-xs font-medium text-slate-500 border border-slate-200 shadow-sm">
                                    Solo archivos .eml
                                </div>
                            </>
                        )}
                    </div>

                    {/* Instructions Card */}
                    <div className="helper-card">
                        <div className="helper-card-header">
                            <div className="helper-card-header-icon">
                                <FileText className="h-4 w-4" />
                            </div>
                            <span>Formato Esperado</span>
                        </div>
                        <p className="text-xs text-slate-500 mb-3">
                            El archivo .eml debe contener las siguientes etiquetas:
                        </p>
                        <div className="space-y-1">
                            {[
                                { label: "Case number #", desc: "Número de caso" },
                                { label: "Fecha del incidente:", desc: "dd/mm/yyyy" },
                                { label: "Fecha de los hechos:", desc: "dd/mm/yyyy" },
                                { label: "Fecha de ingreso:", desc: "dd/mm/yyyy" },
                                { label: "PPU:", desc: "Patente del vehículo" },
                                { label: "Punto del incidente:", desc: "Ubicación" },
                                { label: "Punto de los hechos:", desc: "Ubicación" },
                                { label: "Motivo del caso:", desc: "Motivo principal" },
                            ].map((item, i) => (
                                <div key={i} className="helper-list-item">
                                    <code>{item.label}</code>
                                    <span>{item.desc}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Right Column - Form */}
                <div className="lg:col-span-7">
                    <div className="form-card-enterprise p-8">
                        <div className="section-header">
                            <div className="section-header-icon">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div>
                                <h3>Datos de la Solicitud</h3>
                                <p>Completa los campos requeridos</p>
                            </div>
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
