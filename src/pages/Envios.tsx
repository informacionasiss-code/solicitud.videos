import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DataTable } from "@/components/tables/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Send, CheckCircle, Copy } from "lucide-react";
import { openMailClient, generateEmailBody } from "@/lib/email";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";

export default function Envios() {
    const [previewRequest, setPreviewRequest] = useState<any>(null);

    const { data, refetch } = useQuery({
        queryKey: ['solicitudes-envios'],
        queryFn: async () => {
            // Filter by 'pendiente_envio' or 'revisado' (optional per requirements)
            // Requirement says: "Mostrar SOLO solicitudes con status pendiente_envio"
            const { data, error } = await supabase
                .from('solicitudes')
                .select('*')
                .eq('status', 'pendiente_envio')
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
            cell: ({ row }) => <span className="font-medium">#{row.getValue("case_number")}</span>,
        },
        {
            accessorKey: "ppu",
            header: "PPU",
        },
        {
            accessorKey: "video_url",
            header: "Video",
            cell: ({ row }) => {
                const url = row.getValue("video_url");
                return url ? <span className="text-green-600 font-bold">Sí</span> : <span className="text-red-500 font-bold">No</span>
            }
        },
        {
            id: "actions",
            header: "Acciones",
            cell: ({ row }) => {
                const req = row.original;
                return (
                    <div className="flex space-x-2">
                        <Button size="sm" onClick={() => setPreviewRequest(req)}>
                            <Send className="mr-2 h-4 w-4" /> Preparar
                        </Button>
                    </div>
                );
            },
        },
    ];

    const handleCopyBody = () => {
        if (previewRequest) {
            const body = generateEmailBody(previewRequest);
            navigator.clipboard.writeText(body);
            toast.success("Cuerpo copiado al portapapeles");
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Envíos Pendientes</h2>
                <p className="text-slate-500">Solicitudes listas para ser enviadas por correo.</p>
            </div>

            <DataTable columns={columns} data={data || []} />

            {/* Email Preview Modal */}
            <Dialog open={!!previewRequest} onOpenChange={(open) => !open && setPreviewRequest(null)}>
                <DialogContent className="max-w-2xl">
                    <DialogHeader>
                        <DialogTitle>Preparar Correo - Caso {previewRequest?.case_number}</DialogTitle>
                        <DialogDescription>
                            Revisa el contenido antes de abrir tu cliente de correo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-md whitespace-pre-wrap text-sm border font-mono">
                            {previewRequest && generateEmailBody(previewRequest)}
                        </div>
                    </div>

                    <DialogFooter className="gap-2 sm:gap-0">
                        <Button variant="outline" onClick={handleCopyBody}>
                            <Copy className="mr-2 h-4 w-4" /> Copiar Cuerpo
                        </Button>
                        <Button onClick={() => openMailClient(previewRequest)}>
                            <Send className="mr-2 h-4 w-4" /> Abrir Mailto
                        </Button>
                        <Button variant="default" className="bg-green-600 hover:bg-green-700" onClick={() => markAsSent(previewRequest.id)}>
                            <CheckCircle className="mr-2 h-4 w-4" /> Marcar Enviado
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
