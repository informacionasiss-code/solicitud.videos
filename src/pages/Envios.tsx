import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DataTable } from "@/components/tables/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle, Mail, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { EmailDrawer } from "@/components/drawers/EmailDrawer";

export default function Envios() {
    const [previewRequest, setPreviewRequest] = useState<any>(null);

    const { data, refetch } = useQuery({
        queryKey: ['solicitudes-envios'],
        queryFn: async () => {
            // Show any request that has a video AND is not yet sent
            const { data, error } = await supabase
                .from('solicitudes')
                .select('*')
                .not('video_url', 'is', null)
                .neq('status', 'enviado')
                .order('updated_at', { ascending: false });

            if (error) throw error;
            return data;
        },
    });

    const markAsSent = async (id: string) => {
        try {
            const { error } = await supabase.from('solicitudes').update({
                status: 'enviado',
                sent_at: new Date().toISOString()
            }).eq('id', id);

            if (error) throw error;
            toast.success("Marcado como enviado");
            setPreviewRequest(null);
            refetch();
        } catch (e: any) {
            toast.error(e.message);
        }
    };

    const columns: ColumnDef<any>[] = [
        {
            accessorKey: "case_number",
            header: "Caso",
            cell: ({ row }) => (
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        #{row.getValue("case_number")?.toString().slice(-3) || "—"}
                    </div>
                    <span className="font-semibold text-slate-900">#{row.getValue("case_number")}</span>
                </div>
            ),
        },
        {
            accessorKey: "ppu",
            header: "PPU",
            cell: ({ row }) => <span className="font-mono text-sm bg-slate-100 px-2 py-1 rounded">{row.getValue("ppu")}</span>,
        },
        {
            accessorKey: "video_url",
            header: "Video",
            cell: ({ row }) => {
                const url = row.getValue("video_url");
                return url ? (
                    <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 border font-medium">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Listo
                    </Badge>
                ) : (
                    <Badge className="bg-red-100 text-red-700 border-red-200 border font-medium">
                        Sin video
                    </Badge>
                );
            }
        },
        {
            id: "actions",
            header: "Acciones",
            cell: ({ row }) => {
                const req = row.original;
                return (
                    <div className="flex items-center gap-2">
                        <Button
                            size="sm"
                            onClick={() => setPreviewRequest(req)}
                            className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 shadow-md"
                        >
                            <Mail className="mr-2 h-4 w-4" /> Preparar
                        </Button>
                    </div>
                );
            },
        },
    ];

    return (
        <div className="space-y-6">
            {/* Quick Stats */}
            <div className="card-premium p-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-indigo-100 text-sm font-medium">Solicitudes listas para enviar</p>
                        <p className="text-4xl font-bold mt-1">{data?.length || 0}</p>
                    </div>
                    <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center">
                        <Send className="h-8 w-8 text-white" />
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="card-premium overflow-hidden">
                <DataTable columns={columns} data={data || []} />
            </div>

            {/* Empty State */}
            {data?.length === 0 && (
                <div className="card-premium p-12 text-center">
                    <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-200 to-slate-300 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="h-8 w-8 text-slate-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-slate-900">No hay envíos pendientes</h3>
                    <p className="text-sm text-slate-500 mt-1">Cuando agregues un video a una solicitud, aparecerá aquí automáticamente.</p>
                </div>
            )}

            {/* Email Drawer */}
            <EmailDrawer
                isOpen={!!previewRequest}
                onClose={() => setPreviewRequest(null)}
                request={previewRequest}
                onMarkSent={markAsSent}
            />
        </div>
    );
}
