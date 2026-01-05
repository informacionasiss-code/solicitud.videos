import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, FileInput, Send, TrendingUp, ArrowRight, BarChart3, Activity, Calendar, Download, FileSpreadsheet } from "lucide-react";
import { format, subDays, startOfDay, endOfDay } from "date-fns";
import { es } from "date-fns/locale";
import { Link } from "react-router-dom";
import { STATUS_LABELS } from "@/lib/schemas";
import { exportToCSV, exportToExcel } from "@/lib/export";
import { toast } from "sonner";

export default function Dashboard() {
    const { data: stats } = useQuery({
        queryKey: ['dashboard-stats'],
        queryFn: async () => {
            const [pendientes, enRevision, revisados, pendientesEnvio, enviados, totalHistory] = await Promise.all([
                supabase.from('solicitudes').select('*', { count: 'exact', head: true }).eq('status', 'pendiente'),
                supabase.from('solicitudes').select('*', { count: 'exact', head: true }).eq('status', 'en_revision'),
                supabase.from('solicitudes').select('*', { count: 'exact', head: true }).eq('status', 'revisado'),
                supabase.from('solicitudes').select('*', { count: 'exact', head: true }).eq('status', 'pendiente_envio'),
                supabase.from('solicitudes').select('*', { count: 'exact', head: true }).eq('status', 'enviado'),
                supabase.from('solicitudes').select('*', { count: 'exact', head: true }),
            ]);

            return {
                pendientes: pendientes.count || 0,
                enRevision: enRevision.count || 0,
                revisados: revisados.count || 0,
                pendientesEnvio: pendientesEnvio.count || 0,
                enviados: enviados.count || 0,
                total: totalHistory.count || 0,
            };
        },
        refetchInterval: 10000
    });

    // Last 7 days data for chart
    const { data: weeklyData } = useQuery({
        queryKey: ['weekly-stats'],
        queryFn: async () => {
            const days = [];
            for (let i = 6; i >= 0; i--) {
                const date = subDays(new Date(), i);
                const start = startOfDay(date).toISOString();
                const end = endOfDay(date).toISOString();

                const { count } = await supabase
                    .from('solicitudes')
                    .select('*', { count: 'exact', head: true })
                    .gte('created_at', start)
                    .lte('created_at', end);

                days.push({
                    day: format(date, 'EEE', { locale: es }),
                    count: count || 0
                });
            }
            return days;
        },
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

    const { data: allData } = useQuery({
        queryKey: ['all-for-export'],
        queryFn: async () => {
            const { data } = await supabase.from('solicitudes').select('*').order('created_at', { ascending: false });
            return data;
        }
    });

    const handleExport = () => {
        if (allData) {
            exportToCSV(allData, 'solicitudes');
            toast.success('Archivo CSV descargado');
        }
    };

    const handleExportExcel = () => {
        if (allData) {
            exportToExcel(allData, 'solicitudes');
            toast.success('Archivo Excel descargado');
        }
    };

    const kpis = [
        { label: "Pendientes", value: stats?.pendientes, icon: FileInput, gradient: "from-slate-500 to-slate-600", bgGradient: "from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-900" },
        { label: "En Revisión", value: stats?.enRevision, icon: Clock, gradient: "from-amber-500 to-orange-600", bgGradient: "from-amber-50 to-orange-50 dark:from-amber-900/30 dark:to-orange-900/30" },
        { label: "Por Enviar", value: stats?.pendientesEnvio, icon: Send, gradient: "from-blue-500 to-indigo-600", bgGradient: "from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30" },
        { label: "Enviados", value: stats?.enviados, icon: CheckCircle, gradient: "from-emerald-500 to-teal-600", bgGradient: "from-emerald-50 to-teal-50 dark:from-emerald-900/30 dark:to-teal-900/30" },
    ];

    const getStatusColor = (status: string) => {
        const colors: Record<string, string> = {
            pendiente: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
            en_revision: "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
            revisado: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
            pendiente_envio: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/50 dark:text-indigo-300",
            enviado: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300"
        };
        return colors[status] || "bg-slate-100 text-slate-700";
    };

    const maxCount = Math.max(...(weeklyData?.map(d => d.count) || [1]));

    return (
        <div className="space-y-8">
            {/* Header with Export */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Resumen General</h2>
                    <p className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-2">
                        <Activity className="h-4 w-4" />
                        <span>{stats?.total || 0} solicitudes totales en el sistema</span>
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button onClick={handleExport} variant="outline" className="gap-2">
                        <Download className="h-4 w-4" />
                        CSV
                    </Button>
                    <Button onClick={handleExportExcel} className="gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 text-white">
                        <FileSpreadsheet className="h-4 w-4" />
                        Excel
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
                {kpis.map((item, i) => (
                    <div
                        key={i}
                        className="card-premium p-6 relative overflow-hidden group hover:shadow-xl transition-all duration-300"
                        style={{ animationDelay: `${i * 100}ms` }}
                    >
                        {/* Decorative background blob */}
                        <div className={`absolute -right-6 -top-6 w-32 h-32 rounded-full opacity-10 bg-gradient-to-br ${item.gradient} transition-transform duration-500 group-hover:scale-150`} />

                        <div className="relative flex items-center justify-between z-10">
                            <div>
                                <p className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{item.label}</p>
                                <h3 className="text-4xl font-extrabold text-slate-900 dark:text-white mt-2">{item.value ?? 0}</h3>
                            </div>
                            <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${item.gradient} flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform duration-300`}>
                                <item.icon className="h-7 w-7" />
                            </div>
                        </div>

                        <div className="mt-4 flex items-center justify-between text-xs relative z-10">
                            <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full font-medium border border-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800">
                                <TrendingUp className="h-3 w-3" />
                                <span className="text-[10px]">ACTIVO</span>
                            </span>
                            <span className="text-slate-400 font-medium">Actualizado ahora</span>
                        </div>
                    </div>
                ))}
            </div>

            {/* Charts Row */}
            <div className="grid gap-6 lg:grid-cols-3">
                {/* Weekly Chart */}
                <div className="lg:col-span-2 card-premium p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2">
                                <BarChart3 className="h-5 w-5 text-blue-500" />
                                Ingresos Últimos 7 Días
                            </h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Solicitudes creadas por día</p>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                            <Calendar className="h-4 w-4" />
                            <span>Esta semana</span>
                        </div>
                    </div>
                    <div className="flex items-end justify-between gap-2 h-48 px-2">
                        {weeklyData?.map((day, i) => (
                            <div key={i} className="flex-1 flex flex-col items-center gap-2">
                                <div className="relative w-full flex justify-center">
                                    <div
                                        className="chart-bar w-full max-w-[40px] bg-gradient-to-t from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600"
                                        style={{
                                            height: `${Math.max((day.count / maxCount) * 150, 10)}px`,
                                            animationDelay: `${i * 100}ms`
                                        }}
                                    />
                                    {day.count > 0 && (
                                        <span className="absolute -top-6 text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {day.count}
                                        </span>
                                    )}
                                </div>
                                <span className="text-xs font-medium text-slate-500 dark:text-slate-400 capitalize">{day.day}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Status Distribution */}
                <div className="card-premium p-6">
                    <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Distribución por Estado</h3>
                    <div className="space-y-4">
                        {[
                            { label: 'Pendientes', value: stats?.pendientes || 0, color: 'bg-slate-500' },
                            { label: 'En Revisión', value: stats?.enRevision || 0, color: 'bg-amber-500' },
                            { label: 'Por Enviar', value: stats?.pendientesEnvio || 0, color: 'bg-blue-500' },
                            { label: 'Enviados', value: stats?.enviados || 0, color: 'bg-emerald-500' },
                        ].map((item, i) => {
                            const total = (stats?.total || 1);
                            const percentage = Math.round((item.value / total) * 100) || 0;
                            return (
                                <div key={i}>
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-slate-600 dark:text-slate-400">{item.label}</span>
                                        <span className="font-medium text-slate-900 dark:text-white">{item.value} ({percentage}%)</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full ${item.color} rounded-full transition-all duration-1000`}
                                            style={{ width: `${percentage}%` }}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>

            {/* Bottom Row */}
            <div className="grid gap-6 lg:grid-cols-5">
                {/* Recent Activity */}
                <div className="lg:col-span-3 card-premium p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div>
                            <h3 className="text-lg font-semibold text-slate-900 dark:text-white">Actividad Reciente</h3>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Últimas solicitudes actualizadas</p>
                        </div>
                        <Link to="/registros" className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 flex items-center gap-1 group">
                            Ver todos
                            <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                    <div className="space-y-3">
                        {recentActivity?.map((req: any, index: number) => (
                            <div
                                key={req.id}
                                className="flex items-center justify-between p-4 rounded-xl bg-slate-50/50 dark:bg-slate-800/50 hover:bg-slate-100/80 dark:hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-slate-700 slide-in-right"
                                style={{ animationDelay: `${index * 50}ms` }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-white text-xs font-bold shadow-md">
                                        #{req.case_number?.slice(-3) || "—"}
                                    </div>
                                    <div>
                                        <p className="font-semibold text-slate-900 dark:text-white">Caso #{req.case_number}</p>
                                        <p className="text-sm text-slate-500 dark:text-slate-400">PPU: {req.ppu}</p>
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
                            </div>
                        )}
                    </div>
                </div>

                {/* Quick Actions */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="card-premium p-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Acciones Rápidas</h3>
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

                    {/* System Status */}
                    <div className="card-premium p-6">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Estado del Sistema</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="status-indicator online" />
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Base de Datos</span>
                                </div>
                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Conectado</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="status-indicator online" />
                                    <span className="text-sm text-slate-600 dark:text-slate-400">API Supabase</span>
                                </div>
                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Activo</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="status-indicator online" />
                                    <span className="text-sm text-slate-600 dark:text-slate-400">Sincronización</span>
                                </div>
                                <span className="text-xs font-medium text-emerald-600 dark:text-emerald-400">Tiempo Real</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
