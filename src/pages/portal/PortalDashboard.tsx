import { useState, useEffect } from "react";
import {
    Search, Loader2, X, Clock, CheckCircle2, AlertCircle,
    FileVideo, History, PlusCircle, ExternalLink, UserCheck, Eye
} from "lucide-react";
import { SmartRequestForm } from "./SmartRequestForm";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

type Tab = 'new' | 'search' | 'history';

export function PortalDashboard() {
    const [activeTab, setActiveTab] = useState<Tab>('new');
    const [searchTerm, setSearchTerm] = useState("");
    const [isSearching, setIsSearching] = useState(false);
    const [searchResult, setSearchResult] = useState<any | null>(null);
    const [showResultModal, setShowResultModal] = useState(false);
    const [history, setHistory] = useState<any[]>([]);
    const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

    useEffect(() => {
        const stored = localStorage.getItem('portal_history');
        if (stored) {
            setHistory(JSON.parse(stored));
        }
    }, []);

    const addToHistory = (item: any) => {
        // Prevent duplicates
        const filtered = history.filter(h => h.id !== item.id);
        const newHistory = [item, ...filtered].slice(0, 50);
        setHistory(newHistory);
        localStorage.setItem('portal_history', JSON.stringify(newHistory));
    };

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

    const handleMarkAsReviewed = async () => {
        if (!searchResult) return;
        setIsUpdatingStatus(true);
        try {
            const { error } = await supabase
                .from("solicitudes")
                .update({ status: 'revisado' })
                .eq('id', searchResult.id);

            if (error) throw error;

            toast.success("Solicitud marcada como revisada");
            const updated = { ...searchResult, status: 'revisado' };
            setSearchResult(updated);
            addToHistory(updated);
        } catch (error) {
            console.error(error);
            toast.error("Error al actualizar estado");
        } finally {
            setIsUpdatingStatus(false);
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pendiente': return 'Pendiente';
            case 'en_revision': return 'En Revisión';
            case 'revisado': return 'Revisado por Cliente';
            case 'pendiente_envio': return 'Listo para enviar';
            case 'enviado': return 'Enviado';
            default: return status;
        }
    };

    return (
        <div className="max-w-5xl mx-auto pb-20">
            {/* Mobile-First Navigation Tabs */}
            <div className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-slate-200 mb-6 -mx-4 px-4 pt-4 pb-0 md:rounded-2xl md:top-4 md:mx-0 md:bg-white md:shadow-sm">
                <div className="flex space-x-1 overflow-x-auto pb-4 md:pb-4 scrollbar-hide">
                    <button
                        onClick={() => setActiveTab('new')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'new'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-600 ring-offset-2'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <PlusCircle className="w-4 h-4" />
                        Nueva Solicitud
                    </button>
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'search'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-600 ring-offset-2'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <Search className="w-4 h-4" />
                        Consultar Estado
                    </button>
                    <button
                        onClick={() => setActiveTab('history')}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${activeTab === 'history'
                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/30 ring-2 ring-indigo-600 ring-offset-2'
                            : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                            }`}
                    >
                        <History className="w-4 h-4" />
                        Videos Revisados
                    </button>
                </div>
            </div>

            {/* Content Area */}
            <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="min-h-[60vh]"
            >
                {activeTab === 'new' && (
                    <div className="max-w-2xl mx-auto">
                        <SmartRequestForm />
                    </div>
                )}

                {activeTab === 'search' && (
                    <div className="max-w-lg mx-auto mt-10">
                        <div className="bg-white rounded-3xl p-8 shadow-xl border border-slate-100 text-center">
                            <div className="w-16 h-16 bg-indigo-50 rounded-2xl flex items-center justify-center mx-auto mb-6 text-indigo-600">
                                <Search className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-bold text-slate-900 mb-2">Consultar Solicitud</h2>
                            <p className="text-slate-500 mb-8">Ingrese su número de caso para ver el estado en tiempo real, descargar videos y confirmar revisiones.</p>

                            <form onSubmit={handleSearch} className="relative">
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    placeholder="Ej: 123456"
                                    className="w-full h-14 bg-slate-50 border border-slate-200 rounded-2xl px-5 pl-12 text-lg text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-shadow"
                                    autoFocus
                                />
                                <Search className="absolute left-4 top-4.5 w-6 h-6 text-slate-400" />
                                <button
                                    type="submit"
                                    disabled={isSearching}
                                    className="absolute right-2 top-2 h-10 px-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                                >
                                    {isSearching ? <Loader2 className="w-5 h-5 animate-spin" /> : "Buscar"}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {activeTab === 'history' && (
                    <div className="max-w-3xl mx-auto">
                        <div className="bg-white rounded-2xl shadow-lg border border-slate-100 overflow-hidden">
                            <div className="p-6 border-b border-slate-100">
                                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                    <History className="w-5 h-5 text-indigo-500" />
                                    Historial de Revisados
                                </h3>
                            </div>
                            {history.length === 0 ? (
                                <div className="p-12 text-center text-slate-500">
                                    <Clock className="w-12 h-12 mx-auto mb-4 text-slate-300" />
                                    <p>No tienes videos marcados como revisados aún.</p>
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-100">
                                    {history.map((item) => (
                                        <div key={item.id} className="p-4 hover:bg-slate-50 transition flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.status === 'revisado' ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}`}>
                                                    <UserCheck className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-slate-900">Caso #{item.case_number}</p>
                                                    <p className="text-xs text-slate-500">{item.created_at ? format(new Date(item.created_at), "dd MMM yyyy", { locale: es }) : 'Fecha desc.'}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                {item.status === 'revisado' && (
                                                    <span className="hidden sm:inline-flex text-xs font-semibold px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                                                        REVISADO
                                                    </span>
                                                )}
                                                <button
                                                    onClick={() => { setSearchResult(item); setShowResultModal(true); }}
                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                                                >
                                                    <Eye className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </motion.div>

            {/* Search Result Modal */}
            <AnimatePresence>
                {showResultModal && searchResult && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.button
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowResultModal(false)}
                            className="absolute inset-0 cursor-default"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden ring-1 ring-white/20 relative z-10"
                        >
                            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                <div>
                                    <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Detalle de Solicitud</p>
                                    <h3 className="text-2xl font-extrabold text-slate-900">Caso #{searchResult.case_number}</h3>
                                </div>
                                <button onClick={() => setShowResultModal(false)} className="p-2 hover:bg-slate-100 rounded-full transition text-slate-400 hover:text-slate-600">
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
                                {/* Status Badge */}
                                <div className={`p-4 rounded-2xl border flex items-center gap-4 ${searchResult.status === 'enviado' ? 'bg-emerald-50 border-emerald-100' :
                                    searchResult.status === 'pendiente_envio' ? 'bg-indigo-50 border-indigo-100' :
                                        'bg-slate-50 border-slate-100'
                                    }`}>
                                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shadow-sm ${searchResult.status === 'enviado' ? 'bg-emerald-500 text-white' :
                                        searchResult.status === 'pendiente_envio' ? 'bg-indigo-500 text-white' :
                                            'bg-white text-slate-500'
                                        }`}>
                                        {searchResult.status === 'enviado' ? <CheckCircle2 className="w-6 h-6" /> : <Clock className="w-6 h-6" />}
                                    </div>
                                    <div>
                                        <p className="text-xs font-bold uppercase opacity-60">Estado Actual</p>
                                        <p className={`text-lg font-bold ${searchResult.status === 'enviado' ? 'text-emerald-700' :
                                            searchResult.status === 'pendiente_envio' ? 'text-indigo-700' : 'text-slate-700'
                                            }`}>
                                            {getStatusLabel(searchResult.status)}
                                        </p>
                                    </div>
                                </div>

                                {/* Main Actions & Links */}
                                {(searchResult.status === 'enviado' || searchResult.status === 'pendiente_envio' || searchResult.status === 'revisado') && (
                                    <div className="space-y-3">
                                        {searchResult.video_url && (
                                            <a
                                                href={searchResult.video_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex items-center justify-center gap-2 w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition transform active:scale-95"
                                            >
                                                <FileVideo className="w-5 h-5" />
                                                Ver Video / Descargar
                                                <ExternalLink className="w-4 h-4 opacity-50" />
                                            </a>
                                        )}

                                        {searchResult.status !== 'revisado' && (
                                            <button
                                                onClick={handleMarkAsReviewed}
                                                disabled={isUpdatingStatus}
                                                className="flex items-center justify-center gap-2 w-full py-3 bg-white border-2 border-slate-200 hover:border-indigo-200 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 rounded-xl font-bold transition"
                                            >
                                                {isUpdatingStatus ? <Loader2 className="w-5 h-5 animate-spin" /> : <UserCheck className="w-5 h-5" />}
                                                Marcar como Revisado e Informado
                                            </button>
                                        )}

                                        {searchResult.status === 'revisado' && (
                                            <div className="p-3 text-center bg-blue-50 text-blue-800 rounded-xl text-sm font-semibold border border-blue-100">
                                                ✓ Marcado como Revisado
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Metadata Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 transition">
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">Fecha Solicitud</p>
                                        <p className="font-semibold text-slate-700">{searchResult.created_at ? format(new Date(searchResult.created_at), "dd/MM/yyyy", { locale: es }) : '-'}</p>
                                        <p className="text-xs text-slate-500">{searchResult.created_at ? format(new Date(searchResult.created_at), "HH:mm") : '-'} hrs</p>
                                    </div>
                                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 hover:border-indigo-100 transition">
                                        <p className="text-xs text-slate-400 font-bold uppercase mb-1">PPU / Patente</p>
                                        <p className="font-semibold text-slate-900 text-lg">{searchResult.ppu}</p>
                                    </div>
                                </div>

                                {/* Full Detail Section */}
                                <div className="space-y-4">
                                    <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100">
                                        <h4 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2 border-b pb-2">
                                            <AlertCircle className="w-4 h-4 text-slate-400" /> Detalle del Incidente
                                        </h4>
                                        <div className="grid grid-cols-1 gap-4 text-sm">
                                            <div>
                                                <span className="text-slate-500 block text-xs uppercase font-bold">Fecha Ocurrencia:</span>
                                                <span className="font-medium text-slate-800">{searchResult.incident_at ? format(new Date(searchResult.incident_at), "dd MMMM yyyy, HH:mm", { locale: es }) : 'N/A'}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block text-xs uppercase font-bold">Ubicación:</span>
                                                <span className="font-medium text-slate-800">{searchResult.incident_point}</span>
                                            </div>
                                            <div>
                                                <span className="text-slate-500 block text-xs uppercase font-bold">Descripción:</span>
                                                <p className="font-medium text-slate-700 mt-1 leading-relaxed bg-white p-3 rounded-lg border border-slate-200 shadow-sm whitespace-pre-wrap">
                                                    {searchResult.detail}
                                                </p>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Operator Info */}
                                    {searchResult.operator_name && (
                                        <div className="flex items-center justify-between px-4 py-3 bg-slate-100 rounded-xl text-xs text-slate-500">
                                            <span>Gestionado por:</span>
                                            <span className="font-bold text-slate-700 uppercase">US EL ROBLE</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
