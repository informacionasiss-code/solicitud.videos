import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Bus, ChevronRight, Video, RefreshCw, FileText, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { useState } from "react";
import { RequestModal } from "@/components/modals/RequestModal";

interface GroupedPPU {
    ppu: string;
    cases: {
        id: string;
        case_number: string;
        incident_at: string | null;
        incident_point: string | null;
        video_url: string | null;
        obs: string | null;
        status: string;
    }[];
}

export default function PPUAgrupados() {
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [expandedPPU, setExpandedPPU] = useState<string | null>(null);

    const { data, refetch, isLoading } = useQuery({
        queryKey: ['ppu-grouped'],
        queryFn: async () => {
            // Get only records without video (pending extraction)
            const { data, error } = await supabase
                .from('solicitudes')
                .select('*')
                .is('video_url', null)
                .order('ppu', { ascending: true });

            if (error) throw error;

            // Group by PPU
            const grouped: Record<string, GroupedPPU> = {};

            data?.forEach(item => {
                const ppu = item.ppu || 'SIN PPU';
                if (!grouped[ppu]) {
                    grouped[ppu] = {
                        ppu,
                        cases: []
                    };
                }
                grouped[ppu].cases.push({
                    id: item.id,
                    case_number: item.case_number,
                    incident_at: item.incident_at,
                    incident_point: item.incident_point,
                    video_url: item.video_url,
                    obs: item.obs,
                    status: item.status
                });
            });

            // Convert to array and sort by case count (most cases first)
            return Object.values(grouped).sort((a, b) => b.cases.length - a.cases.length);
        },
    });

    const toggleExpand = (ppu: string) => {
        setExpandedPPU(expandedPPU === ppu ? null : ppu);
    };

    const openCase = async (caseId: string) => {
        const { data, error } = await supabase
            .from('solicitudes')
            .select('*')
            .eq('id', caseId)
            .single();

        if (error) {
            toast.error('Error al cargar el caso');
            return;
        }

        setSelectedRequest(data);
        setIsModalOpen(true);
    };

    const totalBuses = data?.length || 0;
    const totalCases = data?.reduce((sum, g) => sum + g.cases.length, 0) || 0;

    return (
        <div className="space-y-6">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="card-premium p-6 bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-blue-100 text-sm font-medium">Buses Pendientes</p>
                            <p className="text-4xl font-bold mt-1">{totalBuses}</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                            <Bus className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </div>
                <div className="card-premium p-6 bg-gradient-to-r from-amber-500 to-orange-600 text-white">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-amber-100 text-sm font-medium">Casos Totales</p>
                            <p className="text-4xl font-bold mt-1">{totalCases}</p>
                        </div>
                        <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                            <FileText className="h-7 w-7 text-white" />
                        </div>
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="card-premium p-4 flex items-center justify-between">
                <div>
                    <h3 className="font-semibold text-slate-900 dark:text-white">PPUs Agrupados</h3>
                    <p className="text-sm text-slate-500">Haz click en un bus para ver todos sus casos pendientes</p>
                </div>
                <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
                    <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                    Actualizar
                </Button>
            </div>

            {/* PPU List */}
            <div className="space-y-3">
                {data?.map((group) => (
                    <div key={group.ppu} className="card-premium overflow-hidden">
                        {/* PPU Header */}
                        <button
                            onClick={() => toggleExpand(group.ppu)}
                            className="w-full p-4 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white shadow-lg">
                                    <Bus className="h-6 w-6" />
                                </div>
                                <div className="text-left">
                                    <p className="font-mono text-lg font-bold text-slate-900 dark:text-white">
                                        {group.ppu}
                                    </p>
                                    <p className="text-sm text-slate-500">
                                        {group.cases.length} {group.cases.length === 1 ? 'caso pendiente' : 'casos pendientes'}
                                    </p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge className={`${group.cases.length >= 3
                                        ? 'bg-red-100 text-red-700 border-red-200'
                                        : group.cases.length >= 2
                                            ? 'bg-amber-100 text-amber-700 border-amber-200'
                                            : 'bg-blue-100 text-blue-700 border-blue-200'
                                    } border`}>
                                    {group.cases.length} {group.cases.length === 1 ? 'video' : 'videos'}
                                </Badge>
                                <ChevronRight className={`h-5 w-5 text-slate-400 transition-transform ${expandedPPU === group.ppu ? 'rotate-90' : ''
                                    }`} />
                            </div>
                        </button>

                        {/* Expanded Cases */}
                        {expandedPPU === group.ppu && (
                            <div className="border-t border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                                <div className="p-4 space-y-2">
                                    {group.cases.map((c) => (
                                        <div
                                            key={c.id}
                                            className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-blue-300 transition-colors cursor-pointer"
                                            onClick={() => openCase(c.id)}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-slate-500 to-slate-600 flex items-center justify-center text-white text-xs font-bold">
                                                    #{c.case_number?.slice(-3) || '?'}
                                                </div>
                                                <div>
                                                    <p className="font-semibold text-slate-900 dark:text-white">
                                                        Caso #{c.case_number}
                                                    </p>
                                                    <p className="text-xs text-slate-500">
                                                        {c.incident_at
                                                            ? format(new Date(c.incident_at), "dd MMM yyyy, HH:mm", { locale: es })
                                                            : 'Sin fecha'
                                                        }
                                                        {c.incident_point && ` • ${c.incident_point.substring(0, 30)}...`}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                {c.obs && (
                                                    <Badge className="bg-yellow-100 text-yellow-700 border-yellow-200 border text-xs">
                                                        <AlertCircle className="h-3 w-3 mr-1" />
                                                        Obs
                                                    </Badge>
                                                )}
                                                {c.video_url ? (
                                                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border">
                                                        <Video className="h-3 w-3 mr-1" />
                                                        Listo
                                                    </Badge>
                                                ) : (
                                                    <Badge className="bg-slate-100 text-slate-600 border-slate-200 border">
                                                        Pendiente
                                                    </Badge>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {data?.length === 0 && (
                    <div className="card-premium p-12 text-center">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto mb-4 shadow-lg">
                            <Video className="h-8 w-8 text-white" />
                        </div>
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">¡Todo al día!</h3>
                        <p className="text-sm text-slate-500 mt-1">No hay videos pendientes de extracción</p>
                    </div>
                )}
            </div>

            <RequestModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                request={selectedRequest}
                onSuccess={() => refetch()}
            />
        </div>
    );
}
