import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, FileInput, Send, TrendingUp, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { STATUS_LABELS } from "@/lib/schemas";

export default function Dashboard() {
    const { data: stats } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const [pendientes, enRevision, revisados, pendientesEnvio, enviados] = await Promise.all([
                supabase.from('solicitudes').select('*', { count: 'exact', head: true }).eq('status', 'pendiente'),
                supabase.from('solicitudes').select('*', { count: 'exact', head: true }).eq('status', 'en_revision'),
                supabase.from('solicitudes').select('*', { count: 'exact', head: true }).eq('status', 'revisado'),
                supabase.from('solicitudes').select('*', { count: 'exact', head: true }).eq('status', 'pendiente_envio'),
                supabase.from('solicitudes').select('*', { count: 'exact', head: true }).eq('status', 'enviado'),
            ]);

            return {
                pendientes: pendientes.count || 0,
                enRevision: enRevision.count || 0,
                revisados: revisados.count || 0,
                pendientesEnvio: pendientesEnvio.count || 0,
                enviados: enviados.count || 0,
            };
        },
        refetchInterval: 10000
    });

    const { data: recentActivity } = useQuery({
        queryKey: ['recent-activity'],
        queryFn: async () => {
            const { data } = await supabase
                .from('solicitudes')
                .select('*')
                .order('updated_at', { ascending: false })
                .limit(6);
            return data;
        }
    });

    const kpis = [
        { label: "Pendientes", value: stats?.pendientes, icon: FileInput, gradient: "from-slate-500 to-slate-600", bgGradient: "from-slate-50 to-slate-100" },
        { label: "En Revisión", value: stats?.enRevision, icon: Clock, gradient: "from-amber-500 to-orange-600", bgGradient: "from-amber-50 to-orange-50" },
        { label: "Por Enviar", value: stats?.pendientesEnvio, icon: Send, gradient: "from-blue-500 to-indigo-600", bgGradient: "from-blue-50 to-indigo-50" },
        { label: "Enviados", value: stats?.enviados, icon: CheckCircle, gradient: "from-emerald-500 to-teal-600", bgGradient: "from-emerald-50 to-teal-50" },
    ];

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pendiente: "bg-slate-100 text-slate-700",
            en_revision: "bg-amber-100 text-amber-700",
            revisado: "bg-blue-100 text-blue-700",
            pendiente_envio: "bg-indigo-100 text-indigo-700",
            enviado: "bg-emerald-100 text-emerald-700"
        };
        return colors[status] || "bg-slate-100 text-slate-700";
    };

    return (
        <div className="space-y-8">
            {/* KPI Cards */}
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {kpis.map((item, i) => (
                    <div
                        key={i}
                        className={`stat-card hover-lift bg-gradient-to-br ${item.bgGradient} group cursor-pointer`}
                    >
                        <div className="flex items-start justify-between">
                            <div>
                                <p className="text-sm font-medium text-slate-500 mb-1">{item.label}</p>
                                <p className="text-4xl font-bold text-slate-900">{item.value ?? "—"}</p>
                            </div>
                            <div className={`stat-card-icon bg-gradient-to-br ${item.gradient} shadow-lg group-hover:scale-110 transition-transform`}>
                                <item.icon className="h-5 w-5 text-white" />
                            </div>
                        </div>
                        <div className="mt-4 flex items-center text-xs text-slate-500">
                            <TrendingUp className="h-3 w-3 mr-1 text-emerald-500" />
                            <span>Total acumulado</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Main Content Grid */}
            <div className="grid gap-6 lg:grid-cols-5">
                {/* Recent Activity - Takes 3 columns */}
                <div className="lg:col-span-3 card-premium p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900">Actividad Reciente</h3>
                            <p className="text-sm text-slate-500">Últimas solicitudes actualizadas</p>
                        </div>
                        <Link to="/registros" className="text-sm font-medium text-blue-600 hover:text-blue-700 flex items-center gap-1 group">
                            Ver todos
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                    <div className="space-y-4">
                        {recentActivity?.map((req: any) => (
                            <div
                                key={req.id}
                                className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 hover:bg-slate-100/80 transition-colors border border-transparent hover:border-slate-200"
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                                        #{req.case_number?.slice(-3) || "—"}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900">
                                            Caso #{req.case_number}
                                        </p>
                                        <p className="text-sm text-slate-500">PPU: {req.ppu}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <Badge className={`${getStatusColor(req.status)} border-0 font-medium`}>
                                        {STATUS_LABELS[req.status as keyof typeof STATUS_LABELS] || req.status}
                                    </Badge>
                                    <span className="text-xs text-slate-400 hidden sm:block">
                                        {req.updated_at ? format(new Date(req.updated_at), "dd MMM, HH:mm", { locale: es }) : ''}
                                    </span>
                                </div>
                            </div>
                        ))}
                        {!recentActivity?.length && (
                            <div className="text-center py-12 text-slate-400">
                                <FileInput className="h-12 w-12 mx-auto mb-3 opacity-50" />
                                <p className="font-medium">No hay actividad reciente</p>
                                <p className="text-sm">Los nuevos ingresos aparecerán aquí</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions - Takes 2 columns */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Quick Access Card */}
                    <div className="card-premium p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Acciones Rápidas</h3>
                        <div className="space-y-3">
                            <Link to="/ingresos" className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-blue-500 to-indigo-600 text-white hover:from-blue-600 hover:to-indigo-700 transition-all shadow-md hover:shadow-lg group">
                                <FileInput className="h-5 w-5" />
                                <div className="flex-1">
                                    <p className="font-semibold">Nuevo Ingreso</p>
                                    <p className="text-xs text-white/70">Cargar .eml o manual</p>
                                </div>
                                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                            <Link to="/envios" className="flex items-center gap-4 p-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 text-white hover:from-emerald-600 hover:to-teal-700 transition-all shadow-md hover:shadow-lg group">
                                <Send className="h-5 w-5" />
                                <div className="flex-1">
                                    <p className="font-semibold">Centro de Envíos</p>
                                    <p className="text-xs text-white/70">{stats?.pendientesEnvio || 0} listos para enviar</p>
                                </div>
                                <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                            </Link>
                        </div>
                    </div>

                    {/* Instructions Card */}
                    <div className="card-premium p-6">
                        <h3 className="text-lg font-semibold text-slate-900 mb-4">Flujo de Trabajo</h3>
                        <div className="space-y-4">
                            {[
                                { step: 1, title: "Ingreso", desc: "Carga un .eml o ingresa datos manualmente" },
                                { step: 2, title: "Revisión", desc: "Revisa y agrega el link del video" },
                                { step: 3, title: "Envío", desc: "Genera el correo y marca como enviado" }
                            ].map((item) => (
                                <div key={item.step} className="flex items-start gap-3">
                                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold flex-shrink-0 shadow-md">
                                        {item.step}
                                    </div>
                                    <div>
                                        <p className="font-medium text-slate-900">{item.title}</p>
                                        <p className="text-sm text-slate-500">{item.desc}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
