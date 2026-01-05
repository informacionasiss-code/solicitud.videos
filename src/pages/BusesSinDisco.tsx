import { useState } from "react";
import { supabase } from "@/lib/supabase";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Trash2, Bus, AlertTriangle, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface BusFailure {
    id: string;
    ppu: string;
    failure_type: string;
    case_number?: string;
    notes?: string;
    created_at: string;
}

export default function BusesSinDisco() {
    const queryClient = useQueryClient();
    const [isAdding, setIsAdding] = useState(false);
    const [newBus, setNewBus] = useState({ ppu: "", failure_type: "disco_danado", notes: "" });
    const [searchTerm, setSearchTerm] = useState("");

    const { data: failures, isLoading } = useQuery({
        queryKey: ["bus_failures"],
        queryFn: async () => {
            const { data, error } = await supabase
                .from("bus_failures")
                .select("*")
                .order("created_at", { ascending: false });
            if (error) throw error;
            return data as BusFailure[];
        }
    });

    const addBusMutation = useMutation({
        mutationFn: async (bus: typeof newBus) => {
            const { error } = await supabase.from("bus_failures").insert([{
                ...bus,
                ppu: bus.ppu.toUpperCase()
            }]);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bus_failures"] });
            toast.success("Bus registrado correctamente");
            setIsAdding(false);
            setNewBus({ ppu: "", failure_type: "disco_danado", notes: "" });
        },
        onError: (err: any) => toast.error("Error al registrar: " + err.message)
    });

    const deleteBusMutation = useMutation({
        mutationFn: async (id: string) => {
            const { error } = await supabase.from("bus_failures").delete().eq("id", id);
            if (error) throw error;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["bus_failures"] });
            toast.success("Registro eliminado");
        }
    });

    const filteredBuses = failures?.filter(f =>
        f.ppu.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.failure_type.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Buses Sin Disco / Con Fallas</h1>
                    <p className="text-slate-500">Gestione la lista negra de buses. Estas PPUs generarán alerta al solicitar videos.</p>
                </div>
                <button
                    onClick={() => setIsAdding(!isAdding)}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition"
                >
                    <Plus className="w-4 h-4" />
                    {isAdding ? "Cancelar" : "Nuevo Registro"}
                </button>
            </div>

            {isAdding && (
                <div className="bg-slate-50 p-6 rounded-xl border border-indigo-100 shadow-inner">
                    <h3 className="font-semibold text-slate-800 mb-4">Agregar Nuevo Bus Reportado</h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <input
                            placeholder="PPU (Ej: ABCD12)"
                            value={newBus.ppu}
                            onChange={e => setNewBus({ ...newBus, ppu: e.target.value })}
                            className="p-2 rounded border border-slate-300 uppercase"
                            maxLength={6}
                        />
                        <select
                            value={newBus.failure_type}
                            onChange={e => setNewBus({ ...newBus, failure_type: e.target.value })}
                            className="p-2 rounded border border-slate-300"
                        >
                            <option value="disco_danado">Disco Dañado</option>
                            <option value="bus_sin_disco">Bus Sin Disco</option>
                            <option value="video_sobreescrito">Video Sobreescrito</option>
                            <option value="error_lectura">Error de Lectura</option>
                            <option value="no_disponible">No Disponible</option>
                        </select>
                        <input
                            placeholder="Notas opcionales"
                            value={newBus.notes}
                            onChange={e => setNewBus({ ...newBus, notes: e.target.value })}
                            className="p-2 rounded border border-slate-300"
                        />
                        <button
                            onClick={() => addBusMutation.mutate(newBus)}
                            disabled={!newBus.ppu || addBusMutation.isPending}
                            className="bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
                        >
                            {addBusMutation.isPending ? "Guardando..." : "Guardar"}
                        </button>
                    </div>
                </div>
            )}

            {/* List */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex gap-4 bg-slate-50/50">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <input
                            className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:ring-1 focus:ring-indigo-500"
                            placeholder="Buscar por PPU..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium">
                            <tr>
                                <th className="px-6 py-3">PPU</th>
                                <th className="px-6 py-3">Tipo Falla</th>
                                <th className="px-6 py-3">Fecha Reporte</th>
                                <th className="px-6 py-3">Notas</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {isLoading ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">Cargando...</td></tr>
                            ) : filteredBuses?.length === 0 ? (
                                <tr><td colSpan={5} className="p-8 text-center text-slate-400">No hay registros encontrados</td></tr>
                            ) : (
                                filteredBuses?.map(bus => (
                                    <tr key={bus.id} className="hover:bg-slate-50/50 transition-colors">
                                        <td className="px-6 py-3 font-mono font-medium text-slate-900 flex items-center gap-2">
                                            <Bus className="w-4 h-4 text-slate-400" />
                                            {bus.ppu}
                                        </td>
                                        <td className="px-6 py-3">
                                            <span className="px-2 py-1 bg-red-100 text-red-700 rounded-full text-xs font-medium flex items-center gap-1 w-fit">
                                                <AlertTriangle className="w-3 h-3" />
                                                {bus.failure_type.replace(/_/g, " ")}
                                            </span>
                                        </td>
                                        <td className="px-6 py-3 text-slate-500">
                                            {format(new Date(bus.created_at), "dd MMM yyyy", { locale: es })}
                                        </td>
                                        <td className="px-6 py-3 text-slate-500 truncate max-w-xs" title={bus.notes}>
                                            {bus.notes || "—"}
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button
                                                onClick={() => {
                                                    if (confirm("¿Eliminar este registro?")) deleteBusMutation.mutate(bus.id);
                                                }}
                                                className="text-red-400 hover:text-red-600 p-2 hover:bg-red-50 rounded"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
