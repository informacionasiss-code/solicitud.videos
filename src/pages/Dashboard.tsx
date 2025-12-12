import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, FileInput, Send } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Dashboard() {
    const { data: stats } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            // Parallel queries for simplicity
            const [pendientes, enRevision, revisados, pendientesEnvio, enviados] = await Promise.all([
                supabase.from('solicitudes').select('*', { count: 'exact', head: true }).eq('status', 'pendiente'),
                supabase.from('solicitudes').select('*', { count: 'exact', head: true }).eq('status', 'en_revision'),
                supabase.from('solicitudes').select('*', { count: 'exact', head: true }).eq('status', 'revisado'),
                supabase.from('solicitudes').select('*', { count: 'exact', head: true }).eq('status', 'pendiente_envio'),
                supabase.from('solicitudes').select('*', { count: 'exact', head: true }).eq('status', 'enviado'), // Ideally filter by date if needed
            ]);

            return {
                pendientes: pendientes.count || 0,
                enRevision: enRevision.count || 0,
                revisados: revisados.count || 0,
                pendientesEnvio: pendientesEnvio.count || 0,
                enviados: enviados.count || 0,
            };
        },
        refetchInterval: 10000 // Simple polling for "realtime" feel or use subscription
    });

    const { data: recentActivity } = useQuery({
        queryKey: ['recent-activity'],
        queryFn: async () => {
            const { data } = await supabase
                .from('solicitudes')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(5);
            return data;
        }
    });

    const kpis = [
        { label: "Pendientes", value: stats?.pendientes, icon: FileInput, color: "text-slate-600" },
        { label: "En Revisión", value: stats?.enRevision, icon: Clock, color: "text-amber-600" },
        { label: "Por Enviar", value: stats?.pendientesEnvio, icon: Send, color: "text-blue-600" },
        { label: "Enviados", value: stats?.enviados, icon: CheckCircle, color: "text-green-600" },
    ];

    return (
        <div className="space-y-8">
            <div>
                <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Dashboard</h2>
                <p className="text-slate-500">Resumen y estado de las solicitudes.</p>
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {kpis.map((item, i) => (
                    <Card key={i}>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">
                                {item.label}
                            </CardTitle>
                            <item.icon className={`h-4 w-4 ${item.color}`} />
                        </CardHeader>
                        <CardContent>
                            <div className="text-2xl font-bold">{item.value ?? "-"}</div>
                            <p className="text-xs text-muted-foreground">
                                Total histórico
                            </p>
                        </CardContent>
                    </Card>
                ))}
            </div>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
                <Card className="col-span-4">
                    <CardHeader>
                        <CardTitle>Actividad Reciente</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-8">
                            {recentActivity?.map((req: any) => (
                                <div key={req.id} className="flex items-center">
                                    <div className="space-y-1">
                                        <p className="text-sm font-medium leading-none">
                                            Caso #{req.case_number} - {req.ppu}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {req.status.replace('_', ' ')}
                                        </p>
                                    </div>
                                    <div className="ml-auto font-medium text-xs text-slate-500">
                                        {req.updated_at ? format(new Date(req.updated_at), "dd MMM HH:mm", { locale: es }) : ''}
                                    </div>
                                </div>
                            ))}
                            {!recentActivity?.length && <p className="text-sm text-muted-foreground">No hay actividad reciente.</p>}
                        </div>
                    </CardContent>
                </Card>

                <Card className="col-span-3">
                    <CardHeader>
                        <CardTitle>Instrucciones</CardTitle>
                    </CardHeader>
                    <CardContent className="text-sm text-slate-600 space-y-2">
                        <p>1. Ve a <strong>Ingresos</strong> para cargar nuevos correos .eml o crear manualmente.</p>
                        <p>2. En <strong>Registros</strong> puedes ver el estado, editar datos y agregar URLs de video.</p>
                        <p>3. Cuando esté listo, cambia el estado a <em>Pendiente de Envío</em>.</p>
                        <p>4. En <strong>Envíos</strong>, genera el correo final y marca como enviado.</p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}
