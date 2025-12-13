import { Outlet, NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, FileInput, TableProperties, Send, Menu, Search, Video, Sparkles } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const Sidebar = ({ isOpen, setIsOpen }: { isOpen: boolean; setIsOpen: (v: boolean) => void }) => {
    const links = [
        { to: "/", label: "Dashboard", icon: LayoutDashboard },
        { to: "/ingresos", label: "Ingresos", icon: FileInput },
        { to: "/registros", label: "Registros", icon: TableProperties },
        { to: "/envios", label: "Envíos", icon: Send },
    ];

    return (
        <div
            className={cn(
                "sidebar fixed left-0 top-0 z-40 h-screen w-64 transform transition-transform duration-300 ease-out lg:translate-x-0",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}
        >
            {/* Logo Section */}
            <div className="flex h-20 items-center px-6 border-b border-white/10">
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center shadow-lg">
                            <Video className="h-5 w-5 text-white" />
                        </div>
                        <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-yellow-400 animate-pulse" />
                    </div>
                    <div>
                        <span className="text-lg font-bold text-white tracking-tight">VideoReq</span>
                        <p className="text-[10px] text-slate-400 uppercase tracking-widest">Pro</p>
                    </div>
                </div>
            </div>

            {/* Navigation */}
            <nav className="mt-6 flex flex-col space-y-1 px-3">
                <p className="px-3 mb-2 text-[10px] font-semibold text-slate-500 uppercase tracking-widest">Navegación</p>
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={() => setIsOpen(false)}
                        className={({ isActive }) =>
                            cn(
                                "sidebar-link",
                                isActive && "active"
                            )
                        }
                    >
                        <link.icon className="h-5 w-5" />
                        {link.label}
                    </NavLink>
                ))}
            </nav>

            {/* Footer */}
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-white/10">
                <div className="flex items-center gap-3 px-2">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-br from-blue-400 to-violet-500 flex items-center justify-center text-xs font-bold text-white shadow-lg">
                        IA
                    </div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-white">Isaac Avila</p>
                        <p className="text-[10px] text-slate-400">Administrador</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const Topbar = ({ onMenuClick }: { onMenuClick: () => void }) => {
    const location = useLocation();
    const getTitle = () => {
        switch (location.pathname) {
            case "/": return "Dashboard";
            case "/ingresos": return "Nuevo Ingreso";
            case "/registros": return "Gestión de Registros";
            case "/envios": return "Centro de Envíos";
            default: return "Video Request";
        }
    }
    const getSubtitle = () => {
        switch (location.pathname) {
            case "/": return "Vista general del sistema";
            case "/ingresos": return "Crea una nueva solicitud";
            case "/registros": return "Administra todas las solicitudes";
            case "/envios": return "Prepara y envía correos";
            default: return "";
        }
    }

    return (
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between bg-white/80 backdrop-blur-lg px-6 border-b border-slate-200/80">
            <div className="flex items-center">
                <Button variant="ghost" size="icon" className="mr-4 lg:hidden hover:bg-slate-100" onClick={onMenuClick}>
                    <Menu className="h-6 w-6 text-slate-600" />
                </Button>
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight">{getTitle()}</h1>
                    <p className="text-xs text-slate-500 hidden sm:block">{getSubtitle()}</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative hidden md:block">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                    <Input
                        type="search"
                        placeholder="Buscar caso, PPU..."
                        className="w-72 pl-10 pr-4 h-10 bg-slate-50 border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all"
                    />
                </div>
                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-violet-600 flex items-center justify-center text-sm font-bold text-white shadow-md cursor-pointer hover:scale-105 transition-transform">
                    IA
                </div>
            </div>
        </header>
    );
};

export const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-violet-50/30 font-sans text-slate-900">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            {/* Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/30 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <div className="lg:pl-64 flex flex-col min-h-screen">
                <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="flex-1 p-6 lg:p-8">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
