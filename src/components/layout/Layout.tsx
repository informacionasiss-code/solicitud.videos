import { Outlet, NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, FileInput, TableProperties, Send, Menu, Search, Video } from "lucide-react";
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
                "fixed left-0 top-0 z-40 h-screen w-64 transform border-r bg-white transition-transform duration-200 ease-in-out lg:translate-x-0 dark:bg-slate-950 dark:border-slate-800",
                isOpen ? "translate-x-0" : "-translate-x-full"
            )}
        >
            <div className="flex h-16 items-center justify-center border-b px-6">
                <Video className="mx-2 h-6 w-6 text-blue-600" />
                <span className="text-lg font-bold text-slate-900 dark:text-white">VideoReq</span>
            </div>
            <nav className="mt-6 flex flex-col space-y-1 px-3">
                {links.map((link) => (
                    <NavLink
                        key={link.to}
                        to={link.to}
                        onClick={() => setIsOpen(false)}
                        className={({ isActive }) =>
                            cn(
                                "flex items-center rounded-lg px-4 py-3 text-sm font-medium transition-colors",
                                isActive
                                    ? "bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400"
                                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
                            )
                        }
                    >
                        <link.icon className="mr-3 h-5 w-5" />
                        {link.label}
                    </NavLink>
                ))}
            </nav>
        </div>
    );
};

const Topbar = ({ onMenuClick }: { onMenuClick: () => void }) => {
    const location = useLocation();
    const getTitle = () => {
        switch (location.pathname) {
            case "/": return "Dashboard";
            case "/ingresos": return "Nuevo Ingreso";
            case "/registros": return "Registros";
            case "/envios": return "Envíos Pendientes";
            default: return "Video Request";
        }
    }

    return (
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-white px-6 shadow-sm dark:bg-slate-950 dark:border-slate-800">
            <div className="flex items-center">
                <Button variant="ghost" size="icon" className="mr-4 lg:hidden" onClick={onMenuClick}>
                    <Menu className="h-6 w-6" />
                </Button>
                <h1 className="text-xl font-semibold text-slate-800 dark:text-white hidden sm:block">{getTitle()}</h1>
            </div>
            <div className="flex items-center gap-4">
                <div className="relative hidden sm:block">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                        type="search"
                        placeholder="Buscar caso, PPU..."
                        className="w-64 pl-9 bg-slate-50 dark:bg-slate-900"
                    />
                </div>
                <div className="h-8 w-8 rounded-full bg-slate-200 dark:bg-slate-800 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                    IA
                </div>
            </div>
        </header>
    );
};

export const Layout = () => {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans text-slate-900 dark:text-slate-100">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />

            {/* Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/20 lg:hidden"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            <div className="lg:pl-64 flex flex-col min-h-screen">
                <Topbar onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="flex-1 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};
