import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DataTable } from "@/components/tables/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle, Copy, Mail, Sparkles, ExternalLink } from "lucide-react";
import { generateEmailBody, generateEmailSubject, EMAIL_CONFIG } from "@/lib/email";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";

// Generate mailto URL directly
const getMailtoUrl = (request: any) => {
    const subject = encodeURIComponent(generateEmailSubject(request.case_number));
    const body = encodeURIComponent(generateEmailBody(request));
    const to = EMAIL_CONFIG.to.join(',');
    const cc = EMAIL_CONFIG.cc.join(',');
    return `mailto:${to}?cc=${cc}&subject=${subject}&body=${body}`;
};

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

    const handleCopyBody = () => {
        if (previewRequest) {
            const body = generateEmailBody(previewRequest);
            navigator.clipboard.writeText(body);
            toast.success("Cuerpo copiado al portapapeles");
        }
    };

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

            {/* Email Preview Modal */}
            {/* Email Preview Modal */}
            <Dialog open={!!previewRequest} onOpenChange={(open) => !open && setPreviewRequest(null)}>
                <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2 text-xl">
                            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                <Mail className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                            </div>
                            Vista Previa del Correo
                        </DialogTitle>
                        <DialogDescription className="text-base text-slate-500">
                            Revisa el contenido antes de abrir tu cliente de correo.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="grid gap-4 py-4">
                        <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-700">
                            <div>
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Caso</p>
                                <p className="font-medium text-slate-900 dark:text-white">#{previewRequest?.case_number}</p>
                            </div>
                            <div className="text-right">
                                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">PPU</p>
                                <p className="font-mono text-slate-900 dark:text-white">{previewRequest?.ppu}</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Cuerpo del Mensaje</p>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCopyBody}
                                    className="h-8 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20"
                                >
                                    <Copy className="mr-1 h-3 w-3" /> Copiar contenido
                                </Button>
                            </div>
                            <div className="relative rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 overflow-hidden">
                                <div className="absolute top-0 left-0 w-1 h-full bg-blue-500/50" />
                                <pre className="p-4 text-sm font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed max-h-[400px] overflow-y-auto">
                                    {previewRequest && generateEmailBody(previewRequest)}
                                </pre>
                            </div>
                        </div>
                    </div>

                    <DialogFooter className="gap-3 sm:gap-0 sticky bottom-0 bg-background pt-2">
                        {previewRequest && (
                            <a
                                href={getMailtoUrl(previewRequest)}
                                className="inline-flex items-center justify-center h-10 px-4 py-2 text-sm font-medium text-white transition-all bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 hover:shadow-lg focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 w-full sm:w-auto sm:mr-auto"
                            >
                                <ExternalLink className="mr-2 h-4 w-4" />
                                Abrir Outlook / Mail
                            </a>
                        )}
                        <Button
                            onClick={() => markAsSent(previewRequest.id)}
                            className="w-full sm:w-auto bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm hover:shadow transition-all"
                        >
                            <CheckCircle className="mr-2 h-4 w-4" />
                            Confirmar Envío
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
