import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { UploadCloud, FileText, Sparkles, CheckCircle, Ban, HardDrive } from "lucide-react";
import { RequestForm } from "@/components/forms/RequestForm";
import { parseEmlFile } from "@/lib/parser";
import { RequestFormValues, vacioANulo } from "@/lib/schemas";
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

/** Resumen de lo último que se registró, para no depender de un toast que se va. */
interface UltimaSolicitud {
    caseNumber: string;
    ppu: string;
    sinDisco: boolean;
    enviado: boolean;
}

export default function Ingresos() {
    const [parsedData, setParsedData] = useState<Partial<RequestFormValues> | null>(null);
    const [loading, setLoading] = useState(false);
    const [fileUploaded, setFileUploaded] = useState(false);

    // PPU ajena detectada al subir el archivo. Es la única alerta que sobrevive
    // a la limpieza del formulario, porque en ese caso no hay nada que revisar.
    const [rechazo, setRechazo] = useState<FleetCheck | null>(null);
    const [ultima, setUltima] = useState<UltimaSolicitud | null>(null);

    const limpiar = useCallback(() => {
        setParsedData(null);
        setFileUploaded(false);
    }, []);

    /**
     * Inserta la solicitud y, si el bus no tiene disco, despacha el correo y
     * cierra el caso. Devuelve el motivo del rechazo en vez de lanzar, para que
     * quien la llama decida si cae a revisión manual.
     */
    const persistir = useCallback(async (
        valores: Partial<RequestFormValues>,
        check: FleetCheck | null
    ): Promise<{ ok: true; ultima: UltimaSolicitud } | { ok: false; motivo: string }> => {
        const ppu = normalizePpu(valores.ppu);
        const sinDisco = Boolean(valores.sin_disco ?? check?.sinDisco);
        const caseNumber = (valores.case_number || "").trim();

        if (!caseNumber) return { ok: false, motivo: "El correo no traía número de caso." };
        if (ppu.length < 4) return { ok: false, motivo: "El correo no traía una PPU válida." };

        // El número de caso es único en la base: comprobarlo antes evita que el
        // guardado automático muera con un error de restricción.
        const { data: existente } = await supabase
            .from("solicitudes")
            .select("id")
            .eq("case_number", caseNumber)
            .maybeSingle();
        if (existente) return { ok: false, motivo: `El caso ${caseNumber} ya está registrado.` };

        const { data: creada, error } = await supabase
            .from("solicitudes")
            .insert([{
                case_number: caseNumber,
                incident_at: valores.incident_at ? new Date(valores.incident_at).toISOString() : null,
                ingress_at: valores.ingress_at ? new Date(valores.ingress_at).toISOString() : null,
                ppu,
                incident_point: valores.incident_point,
                reason: valores.reason,
                detail: valores.detail,
                operator_name: valores.operator_name || null,
                operator_rut: valores.operator_rut || null,
                fleet_status: vacioANulo(valores.fleet_status) || check?.status || "desconocido",
                sin_disco: sinDisco,
                sin_disco_source: sinDisco
                    ? (vacioANulo(valores.sin_disco_source) || check?.sinDiscoSource || "flota")
                    : null,
                failure_type: sinDisco ? "bus_sin_disco" : (vacioANulo(valores.failure_type) || null),
                status: sinDisco ? "pendiente_envio" : "pendiente",
            }])
            .select()
            .single();

        if (error) return { ok: false, motivo: error.message };

        let enviado = false;
        if (sinDisco) {
            const envio = await enviarSolicitudSinDisco({ ...creada, sin_disco: true });
            enviado = envio.enviado;
            if (!envio.enviado) toast.error(`⚠️ ${envio.mensaje}`, { duration: 12000 });
        }

        return { ok: true, ultima: { caseNumber, ppu, sinDisco, enviado } };
    }, []);

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        const file = acceptedFiles[0];
        if (!file) return;

        setLoading(true);
        setRechazo(null);

        try {
            const data = await parseEmlFile(file);
            const ppu = normalizePpu(data.ppu);
            const check = await checkPpu(ppu);

            // --- No es nuestro: se avisa y se deja todo listo para el siguiente
            if (check.status === "fuera_de_flota") {
                setRechazo(check);
                setUltima(null);
                limpiar();
                toast.error(`PPU ${check.ppu} FUERA DE FLOTA — no se registra.`, { duration: 10000 });
                return;
            }

            // --- Es nuestro: se registra solo, sin pasar por el formulario
            if (check.status === "en_flota") {
                const datos: Partial<RequestFormValues> = {
                    ...data,
                    ppu,
                    fleet_status: check.status,
                    sin_disco: check.sinDisco,
                    sin_disco_source: check.sinDiscoSource,
                };

                const r = await persistir(datos, check);

                if (r.ok) {
                    setUltima(r.ultima);
                    limpiar();
                    if (r.ultima.sinDisco) {
                        toast.success(
                            r.ultima.enviado
                                ? `Caso ${r.ultima.caseNumber} registrado y respondido — ${SIN_DISCO_MENSAJE}`
                                : `Caso ${r.ultima.caseNumber} registrado — ${SIN_DISCO_MENSAJE}`,
                            { duration: 9000 }
                        );
                    } else {
                        toast.success(`Caso ${r.ultima.caseNumber} registrado automáticamente.`, { duration: 7000 });
                    }
                } else {
                    // Algo impide guardarlo solo: se muestra el formulario para
                    // resolverlo a mano en vez de perder el archivo.
                    setParsedData(datos);
                    setFileUploaded(true);
                    toast.warning(`${r.motivo} Revisa los datos y guarda manualmente.`, { duration: 10000 });
                }
                return;
            }

            // --- No se pudo verificar la flota: revisión manual
            setParsedData({ ...data, ppu });
            setFileUploaded(true);
            toast.info("Archivo procesado. No se pudo verificar la flota: revisa y guarda.", { duration: 8000 });
        } catch (error) {
            console.error(error);
            toast.error("Error al leer el archivo .eml");
        } finally {
            setLoading(false);
        }
    }, [limpiar, persistir]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'message/rfc822': ['.eml'] },
        multiple: false
    });

    // Guardado manual, para el caso en que la flota no pudo verificarse.
    const handleSubmit = async (values: RequestFormValues) => {
        if (values.fleet_status === 'fuera_de_flota') {
            toast.error("PPU fuera de flota: la solicitud no se registra.");
            return;
        }

        setLoading(true);
        try {
            const r = await persistir(values, null);
            if (!r.ok) {
                toast.error(r.motivo);
                return;
            }
            setUltima(r.ultima);
            limpiar();
            toast.success(
                r.ultima.sinDisco
                    ? `Caso ${r.ultima.caseNumber} registrado — ${SIN_DISCO_MENSAJE}`
                    : `Caso ${r.ultima.caseNumber} registrado.`
            );
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

                        {loading ? (
                            <>
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-5 shadow-xl animate-pulse">
                                    <Sparkles className="h-10 w-10 text-white animate-spin" />
                                </div>
                                <p className="text-xl font-bold text-slate-700">Procesando...</p>
                                <p className="text-sm text-slate-500 mt-2">Extrayendo datos y verificando la flota</p>
                            </>
                        ) : fileUploaded ? (
                            <>
                                <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mb-5 shadow-xl">
                                    <CheckCircle className="h-10 w-10 text-white" />
                                </div>
                                <p className="text-xl font-bold text-emerald-700">¡Archivo Procesado!</p>
                                <p className="text-sm text-emerald-600 mt-2 text-center max-w-[220px]">
                                    Revisa el formulario y guarda la solicitud.
                                </p>
                                <button
                                    onClick={(e) => { e.stopPropagation(); limpiar(); setRechazo(null); }}
                                    className="mt-6 px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 rounded-lg border border-slate-200 transition-all"
                                >
                                    Cargar otro archivo
                                </button>
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

                    {/* PPU ajena: única alerta, y el formulario ya quedó limpio */}
                    {rechazo && (
                        <div>
                            <PpuFleetAlert check={rechazo} isChecking={false} />
                            <p className="mt-2 text-center text-xs text-slate-500">
                                No se registró nada. Puedes cargar el siguiente archivo.
                            </p>
                        </div>
                    )}

                    {/* Confirmación de lo último registrado */}
                    {ultima && !rechazo && !fileUploaded && (
                        <div className={`rounded-xl border p-4 ${ultima.sinDisco
                            ? "border-amber-300 bg-amber-50"
                            : "border-emerald-300 bg-emerald-50"}`}>
                            <div className="flex items-start gap-3">
                                <div className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-white ${ultima.sinDisco ? "bg-amber-600" : "bg-emerald-600"}`}>
                                    {ultima.sinDisco ? <HardDrive className="h-5 w-5" /> : <CheckCircle className="h-5 w-5" />}
                                </div>
                                <div className="min-w-0">
                                    <p className={`text-sm font-bold ${ultima.sinDisco ? "text-amber-800" : "text-emerald-800"}`}>
                                        Registrado automáticamente
                                    </p>
                                    <p className={`text-xs ${ultima.sinDisco ? "text-amber-700" : "text-emerald-700"}`}>
                                        Caso <strong>{ultima.caseNumber}</strong> · PPU{" "}
                                        <strong className="font-mono">{ultima.ppu}</strong>
                                    </p>
                                    {ultima.sinDisco && (
                                        <p className="mt-1 text-xs font-semibold text-amber-800">
                                            {SIN_DISCO_MENSAJE} —{" "}
                                            {ultima.enviado
                                                ? "correo enviado y caso cerrado."
                                                : "el correo no pudo enviarse; quedó pendiente de envío."}
                                        </p>
                                    )}
                                </div>
                            </div>
                        </div>
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
                    {rechazo ? (
                        // Sin formulario: no hay nada que completar para un bus ajeno.
                        <div className="form-card-enterprise flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
                            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-red-100">
                                <Ban className="h-8 w-8 text-red-600" />
                            </div>
                            <h3 className="text-lg font-bold text-slate-900">Solicitud descartada</h3>
                            <p className="mt-2 max-w-sm text-sm text-slate-500">
                                La patente <strong className="font-mono">{rechazo.ppu}</strong> no
                                pertenece a nuestra flota, así que no hay nada que registrar. Arrastra
                                el siguiente archivo cuando quieras.
                            </p>
                            <button
                                onClick={() => setRechazo(null)}
                                className="mt-6 rounded-lg border border-slate-200 px-4 py-2 text-xs font-medium text-slate-600 transition-all hover:bg-slate-50"
                            >
                                Entendido
                            </button>
                        </div>
                    ) : (
                        <div className="form-card-enterprise p-8">
                            <div className="section-header">
                                <div className="section-header-icon">
                                    <FileText className="h-5 w-5" />
                                </div>
                                <div>
                                    <h3>Datos de la Solicitud</h3>
                                    <p>
                                        {fileUploaded
                                            ? "Revisa los campos y guarda"
                                            : "Sube un .eml o completa los campos"}
                                    </p>
                                </div>
                            </div>
                            <RequestForm
                                initialValues={parsedData || {}}
                                onSubmit={handleSubmit}
                                isLoading={loading}
                                key={parsedData ? 'loaded' : 'new'}
                            />
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
