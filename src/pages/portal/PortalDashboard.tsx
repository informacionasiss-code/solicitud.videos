import { Search } from "lucide-react";
import { SmartRequestForm } from "./SmartRequestForm";

export function PortalDashboard() {
    return (
        <div className="space-y-8">
            {/* Hero Section */}
            <section className="text-center py-10">
                <h1 className="text-4xl md:text-5xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600 mb-4 animate-fade-in">
                    Portal de Solicitudes y Videos
                </h1>
                <p className="text-lg text-slate-600 max-w-2xl mx-auto mb-8 animate-fade-in delay-100">
                    Gestiona tus solicitudes de grabaciones de forma rápida y moderna.
                    Verifica patentes y estado de cámaras en tiempo real.
                </p>
            </section>

            {/* Main Action Area */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

                {/* Left Column: Form */}
                <div className="lg:col-span-2">
                    <SmartRequestForm />
                </div>

                {/* Right Column: Information / Quick Links (Future Expansion) */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xl hover-lift">
                        <h3 className="text-xl font-bold mb-2">Estado de Solicitudes</h3>
                        <p className="text-slate-300 mb-4 text-sm">Consulta el estado de tus tickets anteriores.</p>

                        <div className="relative">
                            <input
                                type="text"
                                placeholder="Buscar por N° Caso..."
                                className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
                            />
                            <button className="absolute right-2 top-2 text-slate-400 hover:text-white">
                                <Search className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl p-6 shadow-lg border border-slate-100">
                        <h3 className="font-bold text-slate-800 mb-4">Información Importante</h3>
                        <ul className="space-y-3 text-sm text-slate-600">
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                                Las solicitudes se procesan en orden de llegada.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                                Si el bus tiene reporte de "Sin Disco", la solicitud se ingresará pero con observación.
                            </li>
                            <li className="flex items-start gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                                El tiempo máximo de respuesta es de 48 horas hábiles.
                            </li>
                        </ul>
                    </div>
                </div>
            </div>
        </div>
    );
}
