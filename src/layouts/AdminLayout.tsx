import { useState, useEffect } from "react";
import { Link, useLocation, Outlet } from "react-router-dom";
import {
    LayoutDashboard,
    FileText,
    Users,
    Send,
    Menu,
    X,
    Bus,
    ShieldCheck,
    FileInput,
    Lock
} from "lucide-react";
import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";

export function AdminLayout() {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [password, setPassword] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    const [isSidebarOpen, setIsSidebarOpen] = useState(true);
    const location = useLocation();

    useEffect(() => {
        const auth = sessionStorage.getItem("admin_auth");
        if (auth === "true") {
            setIsAuthenticated(true);
        }
        setIsLoading(false);
    }, []);

    const handleLogin = (e: React.FormEvent) => {
        e.preventDefault();
        if (password === "Zulu2025") {
            sessionStorage.setItem("admin_auth", "true");
            setIsAuthenticated(true);
            toast.success("Acceso concedido");
        } else {
            toast.error("Contraseña incorrecta");
        }
    };

    const handleLogout = () => {
        sessionStorage.removeItem("admin_auth");
        setIsAuthenticated(false);
        setPassword("");
    };

    const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

    const menuItems = [
        { icon: LayoutDashboard, label: "Dashboard", path: "/admin/dashboard" },
        { icon: FileInput, label: "Nuevo Ingreso", path: "/admin/ingresos" }, // Restored Feature
        { icon: FileText, label: "Registros", path: "/admin/registros" },
        { icon: Users, label: "PPU Agrupados", path: "/admin/agrupados" },
        { icon: Send, label: "Envíos", path: "/admin/envios" },
        { icon: Bus, label: "Buses Sin Disco", path: "/admin/buses-sin-disco" },
    ];

    if (isLoading) return null;

    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-slate-900 px-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
                >
                    <div className="p-8 pb-0 text-center">
                        <div className="w-16 h-16 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-500/30">
                            <Lock className="w-8 h-8 text-white" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900">Portal Administrativo</h2>
                        <p className="text-slate-500 mt-2">Ingrese la clave de seguridad para continuar</p>
                    </div>

                    <form onSubmit={handleLogin} className="p-8">
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Contraseña</label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full mt-1 px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full py-3 bg-gradient-to-r from-indigo-600 to-violet-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all"
                            >
                                Ingresar
                            </button>
                        </div>
                    </form>
                    <div className="bg-slate-50 p-4 text-center border-t border-slate-100">
                        <Link to="/portal" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">
                            &larr; Volver al Portal Público
                        </Link>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <AnimatePresence mode="wait">
                {isSidebarOpen && (
                    <motion.aside
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 280, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="fixed inset-y-0 left-0 z-50 bg-[#0f172a] text-white shadow-2xl overflow-hidden md:relative"
                    >
                        <div className="p-6 flex flex-col h-full">
                            <div className="flex items-center gap-3 mb-10">
                                <div className="p-2 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-lg">
                                    <ShieldCheck className="w-6 h-6 text-white" />
                                </div>
                                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                                    Panel Admin
                                </h1>
                            </div>

                            <nav className="flex-1 space-y-2">
                                {menuItems.map((item) => {
                                    const isActive = location.pathname === item.path;
                                    return (
                                        <Link
                                            key={item.path}
                                            to={item.path}
                                            className={cn(
                                                "flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 group",
                                                isActive
                                                    ? "bg-white/10 text-white shadow-lg backdrop-blur-sm border border-white/10"
                                                    : "text-slate-400 hover:text-white hover:bg-white/5"
                                            )}
                                        >
                                            <item.icon className={cn("w-5 h-5 transition-colors", isActive ? "text-indigo-400" : "group-hover:text-indigo-400")} />
                                            <span className="font-medium">{item.label}</span>
                                            {isActive && (
                                                <motion.div
                                                    layoutId="activeTab"
                                                    className="absolute left-0 w-1 h-8 bg-indigo-500 rounded-r-full"
                                                />
                                            )}
                                        </Link>
                                    );
                                })}
                            </nav>

                            <div className="mt-auto pt-6 border-t border-white/10">
                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 transition-colors"
                                >
                                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-xs font-bold">
                                        LO
                                    </div>
                                    <div className="text-left">
                                        <p className="text-sm font-medium">Cerrar Sesión</p>
                                    </div>
                                </button>
                            </div>
                        </div>
                    </motion.aside>
                )}
            </AnimatePresence>

            {/* Main Content */}
            <div className="flex-1 flex flex-col min-h-screen transition-all duration-300">
                <header className="h-16 bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-40 flex items-center justify-between px-6">
                    <button
                        onClick={toggleSidebar}
                        className="p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-600"
                    >
                        {isSidebarOpen ? <X size={20} /> : <Menu size={20} />}
                    </button>

                    <div className="flex items-center gap-4">
                        <Link to="/portal" className="text-sm font-medium text-indigo-600 hover:text-indigo-700">
                            Ir al Portal Público &rarr;
                        </Link>
                    </div>
                </header>

                <main className="flex-1 p-6 overflow-auto">
                    <Outlet />
                </main>
            </div>
        </div>
    );
}
