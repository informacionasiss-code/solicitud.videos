import { useState } from "react";
import { Search, Loader2, X, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { SmartRequestForm } from "./SmartRequestForm";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export function PortalDashboard() {
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<any | null>(null);
    const [showResultModal, setShowResultModal] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        if (!searchTerm.trim()) {
            toast.error("Ingrese un número de caso");
            return;
        }

        setIsSearching(true);
        try {
            const { data, error } = await supabase
                .from("solicitudes")
                .select("*")
                .eq("case_number", searchTerm.trim())
                .limit(1)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    toast.error("No se encontró ninguna solicitud con ese número de caso.");
                    setSearchResult(null);
                } else {
                    console.error("Search error:", error);
                    toast.error("Error al buscar la solicitud");
                }
            } else {
                setSearchResult(data);
                setShowResultModal(true);
            }
        } catch (err) {
            console.error(err);
            toast.error("Error de conexión");
        } finally {
            setIsSearching(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pendiente': return 'text-slate-600 bg-slate-100';
            case 'en_revision': return 'text-amber-600 bg-amber-100';
            case 'revisado': return 'text-blue-600 bg-blue-100';
            case 'pendiente_envio': return 'text-indigo-600 bg-indigo-100';
            case 'enviado': return 'text-emerald-600 bg-emerald-100';
            default: return 'text-slate-600 bg-slate-100';
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pendiente': return 'Pendiente';
            case 'en_revision': return 'En Revisión';
            case 'revisado': return 'Revisado';
            case 'pendiente_envio': return 'Listo para enviar';
            case 'enviado': return 'Enviado';
            default: return status;
        }
    };

    return (
        <div className="space-y-8 relative">
            {/* Hero Section */}
            <section className="text-center py-10">
                <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 mb-4 animate-fade-in">
                    Portal de Solicitudes y Videos
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8 animate-fade-in delay-100">
                    Gestiona tus solicitudes de grabaciones de forma rápida y moderna.
                    Verifica patentes y estado de cámaras en tiempo real.
                </p>
            </section>

            {/* Main Action Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Form */}
                <div className="lg:col-span-2">
                    <SmartRequestForm />
                </div>

                {/* Right Column: Information / Quick Links */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl hover-lift">
                        <h3 className="text-xl font-bold mb-2">Estado de Solicitudes</h3>
                        <p className="text-slate-300 mb-4 text-sm">Consulta el estado de tus tickets anteriores.</p>

                        <form onSubmit={handleSearch} className="relative">
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Buscar por N° Caso..."
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 pl-10 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400 font-medium"
                            />
                            <Search className="absolute left-3 top-3.5 w-5 h-5 text-slate-400" />
                            <button
                                type="submit"
                                disabled={isSearching}
                                className="absolute right-2 top-2 p-1.5 bg-indigo-500 rounded-md hover:bg-indigo-400 transition disabled:opacity-50"
                            >
                                {isSearching ? <Loader2 className="w-4 h-4 animate-spin text-white" /> : <Search className="w-4 h-4 text-white" />}
                            </button>
                        </form>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
                        <h3 className="font-bold text-slate-800 mb-4">Información Importante</h3>
                        <ul className="space-y-3 text-sm text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                                Las solicitudes se procesan en orden de llegada.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                                Si el bus tiene reporte de "Sin Disco", la solicitud se ingresará pero con observación.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                                El tiempo máximo de respuesta es de 48 horas hábiles.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>

            {/* Search Result Modal */}
            <AnimatePresence>
                {showResultModal && searchResult && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-start">
                                <div>
                                    <h3 className="text-xl font-bold text-slate-900">Detalle de Solicitud</h3>
                                    <p className="text-sm text-slate-500">Caso #{searchResult.case_number}</p>
                                </div>
                                <button
                                    onClick={() => setShowResultModal(false)}
                                    className="p-1 hover:bg-slate-100 rounded-full transition"
                                >
                                    <X className="w-5 h-5 text-slate-500" />
                                </button>
                            </div>

                            <div className="max-h-[80vh] overflow-y-auto custom-scrollbar">
                                <div className="p-6 space-y-6">
                                    {/* Status Section */}
                                    <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100">
                                        <div>
                                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest">Estado Actual</span>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className={`w-3 h-3 rounded-full ${getStatusColor(searchResult.status).replace('text-', 'bg-').split(' ')[0].replace('600', '500')}`} />
                                                <span className="text-lg font-bold text-slate-800">
                                                    {getStatusLabel(searchResult.status)}
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Key Dates Grid */}
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100/50">
                                            <div className="flex items-center gap-2 mb-1 text-indigo-700">
                                                <Clock className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase">Solicitado el</span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-700">
                                                {searchResult.created_at ? format(new Date(searchResult.created_at), "dd MMM yyyy, HH:mm", { locale: es }) : '-'}
                                            </p>
                                        </div>
                                        <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                                            <div className="flex items-center gap-2 mb-1 text-slate-500">
                                                <AlertCircle className="w-4 h-4" />
                                                <span className="text-xs font-bold uppercase">Fecha Incidente</span>
                                            </div>
                                            <p className="text-sm font-medium text-slate-700">
                                                {searchResult.incident_at ? format(new Date(searchResult.incident_at), "dd MMM yyyy, HH:mm", { locale: es }) : 'No indicada'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Detailed Info */}
                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-slate-900 border-b pb-2">Información del Caso</h4>

                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                            <div>
                                                <p className="text-xs text-slate-500 font-medium">PPU / Patente</p>
                                                <p className="text-base font-semibold text-slate-800">{searchResult.ppu}</p>
                                            </div>
                                            <div>
                                                <p className="text-xs text-slate-500 font-medium">Motivo</p>
                                                <p className="text-base font-semibold text-slate-800">{searchResult.reason || 'No especificado'}</p>
                                            </div>
                                        </div>

                                        <div>
                                            <p className="text-xs text-slate-500 font-medium">Lugar del Incidente</p>
                                            <p className="text-sm text-slate-700 mt-1">{searchResult.incident_point || 'No especificado'}</p>
                                        </div>

                                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-100">
                                            <p className="text-xs text-slate-500 font-medium mb-1">Descripción / Detalle</p>
                                            <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                                {searchResult.detail || 'Sin detalles adicionales.'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Resolution / Status Messages */}
                                    <div className="space-y-3 pt-2">
                                        {searchResult.status === 'enviado' && (
                                            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex gap-3 text-emerald-800">
                                                <CheckCircle2 className="w-5 h-5 flex-shrink-0 mt-0.5 text-emerald-600" />
                                                <div>
                                                    <p className="font-bold text-sm">¡Solicitud Completada!</p>
                                                    <p className="text-sm mt-1 opacity-90">
                                                        Los registros han sido enviados exitosamente. Por favor revise su bandeja de entrada (y SPAM).
                                                    </p>
                                                    {searchResult.obs && (
                                                        <div className="mt-2 pt-2 border-t border-emerald-200/50">
                                                            <p className="text-xs font-bold uppercase opacity-80">Observación del Operador:</p>
                                                            <p className="text-sm mt-0.5">{searchResult.obs}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {searchResult.status === 'pendiente_envio' && (
                                            <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-xl flex gap-3 text-indigo-800">
                                                <Clock className="w-5 h-5 flex-shrink-0 mt-0.5 text-indigo-600" />
                                                <div>
                                                    <p className="font-bold text-sm">Listo para Enviar</p>
                                                    <p className="text-sm mt-1 opacity-90">
                                                        Su solicitud ha sido aprobada y procesada. Estamos preparando el envío final de los archivos.
                                                    </p>
                                                </div>
                                            </div>
                                        )}

                                        {searchResult.failure_type && (
                                            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex gap-3 text-amber-800">
                                                <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-amber-600" />
                                                <div>
                                                    <p className="font-bold text-sm">Reporte de Falla</p>
                                                    <p className="text-sm mt-1 opacity-90">
                                                        Existe una observación técnica: <strong>{searchResult.failure_type.replace(/_/g, ' ')}</strong>.
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100 text-center">
                                <button
                                    onClick={() => setShowResultModal(false)}
                                    className="text-sm font-medium text-indigo-600 hover:text-indigo-700"
                                >
                                    Cerrar Consulta
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
