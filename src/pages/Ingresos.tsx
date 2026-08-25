import { useState, useCallback } from "react";
// import { format } from "date-fns"; // logic changed to standard ISO
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, Sparkles, CheckCircle } from "lucide-react";
import { RequestForm } from "@/components/forms/RequestForm";
import { parseEmlFile } from "@/lib/parser";
import { RequestFormValues } from "@/lib/schemas";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import {
    checkPpu,
    normalizePpu,
    SIN_DISCO_MENSAJE,
    type FleetCheck,
} from "@/lib/fleet";
import { enviarSolicitudSinDisco } from "@/lib/envioAutomatico";
import { PpuFleetAlert } from "@/components/fleet/PpuFleetAlert";

export default function Ingresos() {
    const [parsedData, setParsedData] = useState<Partial<RequestFormValues> | null>(null);
    const [loading, setLoading] = useState(false);
    const [fileUploaded, setFileUploaded] = useState(false);
    // Cruce hecho en el momento de subir el .eml, para avisar de inmediato sin
    // esperar a que el usuario mire el formulario.
    const [uploadCheck, setUploadCheck] = useState<FleetCheck | null>(null);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (file) {
            try {
                setLoading(true);
                const data = await parseEmlFile(file);
                const ppu = normalizePpu(data.ppu);
                setParsedData({ ...data, ppu });
                setFileUploaded(true);

                // Verificación inmediata contra el padrón: es el aviso que
                // decide si el caso se tramita o se descarta.
                const check = await checkPpu(ppu);
                setUploadCheck(check);

                if (check.status === "fuera_de_flota") {
                    toast.error(
                        `PPU ${check.ppu} FUERA DE FLOTA — no considerar. El registro está bloqueado.`,
                        { duration: 12000 }
                    );
                } else if (check.sinDisco) {
                    toast.warning(`${SIN_DISCO_MENSAJE} — PPU ${check.ppu}`, { duration: 12000 });
                } else {
                    toast.success("Archivo .eml procesado correctamente");
                }
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
        // Barrera final del lado del contenedor: ninguna solicitud de un bus
        // ajeno debe llegar a la base, sin importar por dónde entre.
        if (values.fleet_status === 'fuera_de_flota') {
            toast.error("PPU fuera de flota: la solicitud no se registra.");
            return;
        }

        const ppu = normalizePpu(values.ppu);
        const sinDisco = Boolean(values.sin_disco);

        try {
            setLoading(true);
            const { data: creada, error } = await supabase.from('solicitudes').insert([
                {
                    case_number: values.case_number,
                    incident_at: values.incident_at ? new Date(values.incident_at).toISOString() : null,
                    ingress_at: values.ingress_at ? new Date(values.ingress_at).toISOString() : null,
                    ppu,
                    incident_point: values.incident_point,
                    reason: values.reason,
                    detail: values.detail,
                    operator_name: values.operator_name || null,
                    operator_rut: values.operator_rut || null,
                    fleet_status: values.fleet_status || 'desconocido',
                    sin_disco: sinDisco,
                    sin_disco_source: sinDisco ? (values.sin_disco_source || 'flota') : null,
                    failure_type: sinDisco ? 'bus_sin_disco' : (values.failure_type || null),
                    // Sin disco no hay nada que revisar; el envío se despacha
                    // enseguida y el estado final lo fija ese envío.
                    status: sinDisco ? 'pendiente_envio' : 'pendiente'
                }
            ]).select().single();

            if (error) throw error;

            if (sinDisco) {
                toast.loading("Bus sin disco: enviando correo...", { id: "envio-auto" });
                const envio = await enviarSolicitudSinDisco({ ...creada, sin_disco: true });
                if (envio.enviado) {
                    toast.success(`✅ ${envio.mensaje}`, { id: "envio-auto", duration: 9000 });
                } else {
                    toast.error(`⚠️ ${envio.mensaje}`, { id: "envio-auto", duration: 12000 });
                }
            } else {
                toast.success("✅ Solicitud creada exitosamente");
            }

            // Reset form for next entry instead of navigating away
            setParsedData(null);
            setFileUploaded(false);
            setUploadCheck(null);
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
                                    onClick={(e) => { e.stopPropagation(); setFileUploaded(false); setParsedData(null); setUploadCheck(null); }}
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

                    {/* Veredicto del padrón para el correo recién subido */}
                    {uploadCheck && (
                        <PpuFleetAlert check={uploadCheck} isChecking={false} />
                    )}

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
