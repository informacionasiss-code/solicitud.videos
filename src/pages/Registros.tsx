import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DataTable } from "@/components/tables/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Video, Trash2, Filter, Search, Download, RefreshCw, CheckSquare, FileText } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { STATUS_LABELS } from "@/lib/schemas";
import { useState } from "react";
import { RequestModal } from "@/components/modals/RequestModal";
import { exportToCSV } from "@/lib/export";
import { generatePendingPPUsPDF } from "@/lib/pdfGenerator";

export default function Registros() {
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);

    const { data, refetch, isLoading } = useQuery({
        queryKey: ['solicitudes', filterStatus, search],
        queryFn: async () => {
            let query = supabase.from('solicitudes').select('*').order('created_at', { ascending: false });

            if (filterStatus !== "all") {
                query = query.eq('status', filterStatus);
            }

            if (search) {
                query = query.or(`case_number.ilike.%${search}%,ppu.ilike.%${search}%`);
            }

            const { data, error } = await query;
            if (error) throw error;
            return data;
        },
    });

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que quieres eliminar esta solicitud?")) return;

        try {
            const { error } = await supabase.from('solicitudes').delete().eq('id', id);
            if (error) throw error;
            toast.success("Solicitud eliminada");
            refetch();
        } catch (error: any) {
            toast.error("Error: " + error.message);
        }
    };

    const handleBulkDelete = async () => {
        if (selectedIds.length === 0) {
            toast.error("Selecciona al menos una solicitud");
            return;
        }
        if (!confirm(`¿Eliminar ${selectedIds.length} solicitud(es)?`)) return;

        try {
            const { error } = await supabase.from('solicitudes').delete().in('id', selectedIds);
            if (error) throw error;
            toast.success(`${selectedIds.length} solicitud(es) eliminada(s)`);
            setSelectedIds([]);
            refetch();
        } catch (error: any) {
            toast.error("Error: " + error.message);
        }
    };

    const handleExport = () => {
        if (data) {
            exportToCSV(data, 'solicitudes_filtradas');
            toast.success('CSV descargado');
        }
    };

    const handleDownloadPendingPDF = async () => {
        try {
            // Fetch only pending items (status pendiente AND no video)
            const { data: pendingData, error } = await supabase
                .from('solicitudes')
                .select('ppu, case_number, incident_at')
                .is('video_url', null)
                .order('ppu', { ascending: true });

            if (error) throw error;

            if (!pendingData || pendingData.length === 0) {
                toast.error('No hay patentes pendientes de extracción');
                return;
            }

            generatePendingPPUsPDF(pendingData);
            toast.success(`PDF descargado: ${pendingData.length} patentes pendientes`);
        } catch (error: any) {
            toast.error('Error al generar PDF: ' + error.message);
        }
    };

    const toggleSelect = (id: string) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === data?.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(data?.map(r => r.id) || []);
        }
    };

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pendiente: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
            en_revision: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-300 dark:border-amber-800",
            revisado: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:border-blue-800",
            pendiente_envio: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:border-indigo-800",
            enviado: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/50 dark:text-emerald-300 dark:border-emerald-800"
        };
        return colors[status] || "bg-slate-100 text-slate-700";
    };

    const columns: ColumnDef<any>[] = [
        {
            id: "select",
            header: () => (
                <input
                    type="checkbox"
                    checked={data?.length ? selectedIds.length === data.length : false}
                    onChange={toggleSelectAll}
                    className="rounded border-slate-300 dark:border-slate-600"
                />
            ),
            cell: ({ row }) => (
                <input
                    type="checkbox"
                    checked={selectedIds.includes(row.original.id)}
                    onChange={() => toggleSelect(row.original.id)}
                    className="rounded border-slate-300 dark:border-slate-600"
                />
            ),
        },
        {
            accessorKey: "case_number",
            header: "Caso",
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        #{row.getValue("case_number")?.toString().slice(-3) || "—"}
                    </div>
                    <span className="font-semibold text-slate-900 dark:text-white">#{row.getValue("case_number")}</span>
                </div>
            ),
        },
        {
            accessorKey: "ppu",
            header: "PPU",
            cell: ({ row }) => <span className="font-mono text-sm bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded">{row.getValue("ppu")}</span>,
        },
        {
            accessorKey: "incident_at",
            header: "Fecha Incidente",
            cell: ({ row }) => {
                const date = row.getValue("incident_at");
                return date ? (
                    <span className="text-sm text-slate-600 dark:text-slate-400">
                        {format(new Date(date as string), "dd MMM yyyy, HH:mm", { locale: es })}
                    </span>
                ) : <span className="text-slate-400">—</span>;
            },
        },
        {
            accessorKey: "status",
            header: "Estado",
            cell: ({ row }) => {
                const status = row.getValue("status") as keyof typeof STATUS_LABELS;
                return (
                    <Badge className={`${getStatusColor(status)} border font-medium`}>
                        {STATUS_LABELS[status]}
                    </Badge>
                );
            },
        },
        {
            accessorKey: "video_url",
            header: "Video",
            cell: ({ row }) => {
                const url = row.getValue("video_url") as string;
                if (!url) return <span className="text-slate-400 text-sm">Sin video</span>;
                return (
                    <a href={url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium text-sm group">
                        <Video className="h-4 w-4" />
                        <span className="group-hover:underline">Ver</span>
                    </a>
                );
            },
        },
        {
            id: "actions",
            header: "",
            cell: ({ row }) => {
                return (
                    <div className="flex items-center justify-end gap-1">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                                setSelectedRequest(row.original);
                                setIsModalOpen(true);
                            }}
                            title="Ver/Editar"
                            className="hover:bg-blue-50 dark:hover:bg-blue-900/30"
                        >
                            <Eye className="h-4 w-4 text-slate-500 hover:text-blue-600 dark:text-slate-400" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(row.original.id)}
                            title="Eliminar"
                            className="hover:bg-red-50 dark:hover:bg-red-900/30"
                        >
                            <Trash2 className="h-4 w-4 text-slate-400 hover:text-red-600" />
                        </Button>
                    </div>
                )
            }
        }
    ];

    return (
        <div className="space-y-6">
            {/* Filters */}
            <div className="card-premium p-4">
                <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                            <Filter className="h-4 w-4" />
                            <span className="font-medium">Filtros</span>
                        </div>
                        {selectedIds.length > 0 && (
                            <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300">
                                <CheckSquare className="h-3 w-3 mr-1" />
                                {selectedIds.length} seleccionados
                            </Badge>
                        )}
                    </div>
                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                        <Select value={filterStatus} onValueChange={setFilterStatus}>
                            <SelectTrigger className="w-full sm:w-[180px] bg-white dark:bg-slate-800">
                                <SelectValue placeholder="Estado" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos los estados</SelectItem>
                                <SelectItem value="pendiente">Pendiente</SelectItem>
                                <SelectItem value="en_revision">En Revisión</SelectItem>
                                <SelectItem value="revisado">Revisado</SelectItem>
                                <SelectItem value="pendiente_envio">Pendiente Envío</SelectItem>
                                <SelectItem value="enviado">Enviado</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="relative flex-1 lg:flex-none">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                placeholder="Buscar caso o PPU..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full sm:w-[200px] pl-9 bg-white dark:bg-slate-800"
                            />
                        </div>
                        <Button variant="outline" size="icon" onClick={() => refetch()} title="Refrescar">
                            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                        </Button>
                        <Button variant="outline" onClick={handleExport} className="gap-2">
                            <Download className="h-4 w-4" />
                            <span className="hidden sm:inline">CSV</span>
                        </Button>
                        <Button
                            onClick={handleDownloadPendingPDF}
                            className="gap-2 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white shadow-md"
                        >
                            <FileText className="h-4 w-4" />
                            <span className="hidden sm:inline">PDF Pendientes</span>
                        </Button>
                        {selectedIds.length > 0 && (
                            <Button variant="destructive" onClick={handleBulkDelete} size="sm">
                                <Trash2 className="h-4 w-4 mr-1" />
                                Eliminar ({selectedIds.length})
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {/* Stats Bar */}
            <div className="flex items-center gap-4 text-sm text-slate-500 dark:text-slate-400">
                <span>Mostrando <strong className="text-slate-900 dark:text-white">{data?.length || 0}</strong> resultados</span>
                {filterStatus !== 'all' && (
                    <Button variant="ghost" size="sm" onClick={() => setFilterStatus('all')} className="h-7 px-2 text-xs">
                        Limpiar filtros
                    </Button>
                )}
            </div>

            {/* Table */}
            <div className="card-premium overflow-hidden">
                <DataTable columns={columns} data={data || []} />
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
