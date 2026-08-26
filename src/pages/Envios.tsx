import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { DataTable } from "@/components/tables/DataTable";
import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Send, CheckCircle, Mail, Sparkles, HardDrive, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import { EmailDrawer } from "@/components/drawers/EmailDrawer";
import { esBusSinDisco, tieneFallaRegistrada, motivoSinVideo } from "@/lib/email";
import { registrarEnvio, esReenvio } from "@/lib/envioAutomatico";
import { SIN_DISCO_MENSAJE } from "@/lib/fleet";

export default function Envios() {
    const [previewRequest, setPreviewRequest] = useState<any>(null);

    const { data, refetch } = useQuery({
        queryKey: ['solicitudes-envios'],
        queryFn: async () => {
            // Pendientes de envío: los que ya tienen video, y también todos los
            // que tienen una falla registrada. Antes sólo entraban los buses
            // sin disco, de modo que un caso cerrado por video sobreescrito o
            // disco dañado no aparecía en ninguna parte y no se podía responder.
            // `status.eq.pendiente_envio` cierra el caso del reenvío: una
            // solicitud reabierta a mano puede no tener video ni falla, y sin
            // esta condición volvería a quedarse fuera de la cola, que es
            // justamente lo que se quiere evitar al reabrirla.
            const { data, error } = await supabase
                .from('solicitudes')
                .select('*')
                .or('video_url.not.is.null,sin_disco.is.true,failure_type.not.is.null,status.eq.pendiente_envio')
                .neq('status', 'enviado')
                .order('updated_at', { ascending: false });

            if (!error) return data;

            // La columna `sin_disco` llega con la migración de flota. Mientras
            // no esté aplicada, se mantiene el comportamiento anterior en vez
            // de dejar la pantalla en blanco.
            console.warn('[ENVIOS] Consulta con sin_disco falló, usando fallback:', error);
            const fallback = await supabase
                .from('solicitudes')
                .select('*')
                .not('video_url', 'is', null)
                .neq('status', 'enviado')
                .order('updated_at', { ascending: false });

            if (fallback.error) throw fallback.error;
            return fallback.data;
        },
    });

    const markAsSent = async (id: string) => {
        // El contador se lee de la fila que ya está en pantalla: así un reenvío
        // queda registrado como tal en lugar de contarse como primer envío.
        const fila = (data as { id: string; send_count?: number }[] | undefined)
            ?.find((r) => r.id === id);
        const r = await registrarEnvio(id, fila?.send_count);
        if (!r.ok) {
            toast.error(r.mensaje);
            return;
        }
        toast.success("Marcado como enviado");
        setPreviewRequest(null);
        refetch();
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
                    <div className="min-w-0">
                        <span className="font-semibold text-slate-900">#{row.getValue("case_number")}</span>
                        {esReenvio(row.original) && (
                            <span
                                className="ml-2 inline-flex items-center gap-1 rounded-full border border-violet-300 bg-violet-100 px-2 py-0.5 text-[10px] font-bold uppercase text-violet-700"
                                title="Este caso ya se envió antes y fue devuelto a la cola"
                            >
                                <RotateCcw className="h-2.5 w-2.5" />
                                Reenvío
                            </span>
                        )}
                    </div>
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
                if (esBusSinDisco(row.original)) {
                    return (
                        <Badge
                            className="bg-red-100 text-red-700 border-red-300 border font-semibold"
                            title={SIN_DISCO_MENSAJE}
                        >
                            <HardDrive className="h-3 w-3 mr-1" />
                            Sin disco
                        </Badge>
                    );
                }
                if (tieneFallaRegistrada(row.original)) {
                    return (
                        <Badge className="bg-amber-100 text-amber-800 border-amber-300 border font-semibold">
                            {motivoSinVideo(row.original)}
                        </Badge>
                    );
                }
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
                    <p className="text-sm text-slate-500 mt-1">Aquí aparecen las solicitudes con video listo y las cerradas por una falla —sin disco, sobreescrito, disco dañado—, que se responden sin grabación.</p>
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
