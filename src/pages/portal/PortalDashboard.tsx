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

                            <div className="p-6 space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-xl">
                                    <span className="text-sm font-medium text-slate-600">Estado Actual</span>
                                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${getStatusColor(searchResult.status)}`}>
                                        {getStatusLabel(searchResult.status)}
                                    </span>
                                </div>

                                <div className="space-y-3">
                                    <div className="flex items-start gap-3">
                                        <Clock className="w-5 h-5 text-slate-400 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">Fecha de Solicitud</p>
                                            <p className="text-sm text-slate-500">
                                                {format(new Date(searchResult.created_at), "d 'de' MMMM, yyyy - HH:mm", { locale: es })}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <CheckCircle2 className="w-5 h-5 text-slate-400 mt-0.5" />
                                        <div>
                                            <p className="text-sm font-medium text-slate-700">PPU Solicitada</p>
                                            <p className="text-sm text-slate-500">{searchResult.ppu}</p>
                                        </div>
                                    </div>

                                    {searchResult.status === 'enviado' && (
                                        <div className="mt-4 p-3 bg-emerald-50 border border-emerald-100 rounded-lg text-sm text-emerald-700 flex gap-2">
                                            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
                                            <span>
                                                Su solicitud ya fue enviada. Por favor revise su correo electrónico (incluyendo la carpeta de SPAM).
                                            </span>
                                        </div>
                                    )}

                                    {searchResult.failure_type && (
                                        <div className="mt-4 p-3 bg-amber-50 border border-amber-100 rounded-lg text-sm text-amber-700 flex gap-2">
                                            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
                                            <span>
                                                <strong>Observación:</strong> {searchResult.failure_type.replace(/_/g, ' ')}
                                            </span>
                                        </div>
                                    )}
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
