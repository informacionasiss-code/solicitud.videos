import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DataTable } from "@/components/tables/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Video } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { STATUS_LABELS } from "@/lib/schemas";
import { useState } from "react";
import { RequestModal } from "@/components/modals/RequestModal";

export default function Registros() {
    const [filterStatus, setFilterStatus] = useState<string>("all");
    const [search, setSearch] = useState("");
    const [selectedRequest, setSelectedRequest] = useState<any>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

    const { data, refetch } = useQuery({
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

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "case_number",
            header: "Caso",
            cell: ({ row }) => <span className="font-medium">#{row.getValue("case_number")}</span>,
        },
        {
            accessorKey: "ppu",
            header: "PPU",
        },
        {
            accessorKey: "incident_at",
            header: "Fecha Incidente",
            cell: ({ row }) => {
                const date = row.getValue("incident_at");
                return date ? format(new Date(date as string), "dd/MM/yyyy HH:mm", { locale: es }) : "-";
            },
        },
        {
            accessorKey: "status",
            header: "Estado",
            cell: ({ row }) => {
                const status = row.getValue("status") as keyof typeof STATUS_LABELS;
                const colorMap: Record<string, "pending" | "review" | "done" | "default" | "outline"> = {
                    pendiente: "outline",
                    en_revision: "pending",
                    revisado: "review",
                    pendiente_envio: "default",
                    enviado: "done"
                }
                return <Badge variant={colorMap[status] || "default"}>{STATUS_LABELS[status]}</Badge>;
            },
        },
        {
            accessorKey: "video_url",
            header: "Video",
            cell: ({ row }) => {
                const url = row.getValue("video_url") as string;
                if (!url) return <span className="text-slate-400">-</span>;
                return (
                    <a href={url} target="_blank" rel="noreferrer" className="flex items-center text-blue-600 hover:underline">
                        <Video className="h-4 w-4 mr-1" /> Ver
                    </a>
                );
            },
        },
        {
            id: "actions",
            cell: ({ row }) => {
                return (
                    <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" onClick={() => {
                            setSelectedRequest(row.original);
                            setIsModalOpen(true);
                        }}>
                            <Eye className="h-4 w-4 text-slate-500" />
                        </Button>
                    </div>
                )
            }
        }
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Registros</h2>
                    <p className="text-slate-500">Gestión de todas las solicitudes ingresadas.</p>
                </div>
                <div className="flex items-center space-x-2">
                    <Select value={filterStatus} onValueChange={setFilterStatus}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar por estado" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            <SelectItem value="pendiente">Pendiente</SelectItem>
                            <SelectItem value="en_revision">En Revisión</SelectItem>
                            <SelectItem value="revisado">Revisado</SelectItem>
                            <SelectItem value="pendiente_envio">Pendiente de Envío</SelectItem>
                            <SelectItem value="enviado">Enviado</SelectItem>
                        </SelectContent>
                    </Select>
                    <Input
                        placeholder="Buscar Caso o PPU..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-[200px]"
                    />
                </div>
            </div>

            <DataTable columns={columns} data={data || []} />

            <RequestModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                request={selectedRequest}
                onSuccess={() => refetch()}
            />
        </div>
    );
}
