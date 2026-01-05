import { Outlet, Link } from "react-router-dom";
import { Video } from "lucide-react";

export function PublicLayout() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 font-sans">
            <nav className="sticky top-0 z-50 w-full border-b border-white/20 bg-white/70 backdrop-blur-xl supports-[backdrop-filter]:bg-white/60">
                <div className="container mx-auto flex h-16 items-center justify-between px-4">
                    <div className="flex items-center gap-2">
                        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/20">
                            <Video className="h-5 w-5 text-white" />
                        </div>
                        <span className="hidden text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 sm:inline-block">
                            Portal Solicitudes
                        </span>
                    </div>

                    <div className="flex items-center gap-4">
                        {/* Future: Add User Menu or Auth Link */}
                        <Link to="/admin" className="text-xs text-slate-400 hover:text-indigo-500">
                            Acceso Admin
                        </Link>
                    </div>
                </div>
            </nav>
            <main className="container mx-auto p-4 md:py-8 animate-fade-in">
                <Outlet />
            </main>
        </div>
    );
}
