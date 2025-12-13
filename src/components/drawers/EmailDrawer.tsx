import { X, Mail, Copy, ExternalLink, CheckCircle, FileText, AlertCircle, Clipboard, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { generateEmailBody, generateEmailSubject, openMailClient, copyEmailToClipboard, EMAIL_CONFIG } from "@/lib/email";
import { toast } from "sonner";
import { useEffect, useState, useCallback } from "react";

interface EmailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    request: any;
    onMarkSent: (id: string) => void;
}

export function EmailDrawer({ isOpen, onClose, request, onMarkSent }: EmailDrawerProps) {
    const [isVisible, setIsVisible] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            document.body.style.overflow = 'hidden';
        } else {
            const timer = setTimeout(() => setIsVisible(false), 300);
            document.body.style.overflow = 'unset';
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    if (!isVisible && !isOpen) return null;

    const handleCopy = (text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado`);
    };

    const handleOpenEmail = useCallback(async () => {
        if (!request) return;

        setIsLoading(true);

        try {
            const result = openMailClient(request);

            // Give a moment for the mail client to potentially open
            await new Promise(resolve => setTimeout(resolve, 1000));

            if (result) {
                toast.success("¡Listo! Si no se abrió tu correo, usa 'COPIAR TODO' abajo.", {
                    duration: 5000,
                });
            } else {
                toast.error("No se pudo abrir el cliente de correo. Usa 'COPIAR TODO'.");
            }
        } catch (e) {
            console.error('[EMAIL] Error:', e);
            toast.error("Error al abrir correo. Usa 'COPIAR TODO'.");
        } finally {
            setIsLoading(false);
        }
    }, [request]);

    const handleCopyAll = useCallback(async () => {
        if (!request) return;

        const success = await copyEmailToClipboard(request);
        if (success) {
            toast.success("✅ TODO COPIADO - Ahora pega en tu correo (destinatarios, asunto y cuerpo incluidos)", {
                duration: 6000,
            });
        } else {
            toast.error("Error al copiar. Intenta copiar manualmente.");
        }
    }, [request]);

    return (
        <div className={cn(
            "fixed inset-0 z-50 flex justify-end transition-opacity duration-300",
            isOpen ? "bg-black/40 backdrop-blur-sm opacity-100" : "bg-transparent opacity-0 pointer-events-none"
        )} onClick={onClose}>
            <div
                className={cn(
                    "w-full max-w-2xl bg-white dark:bg-slate-900 h-full shadow-2xl transform transition-transform duration-300 ease-out flex flex-col",
                    isOpen ? "translate-x-0" : "translate-x-full"
                )}
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-600/20">
                            <Mail className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Preparar Envío</h2>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Revisa los datos antes de enviar</p>
                        </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800">
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content - Scrollable */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50 dark:bg-slate-950">

                    {/* Status Card */}
                    {request && (
                        <div className="flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg">
                                    <FileText className="h-4 w-4 text-slate-600 dark:text-slate-400" />
                                </div>
                                <div>
                                    <p className="text-xs font-semibold uppercase text-slate-500">Solicitud</p>
                                    <p className="font-bold text-slate-900 dark:text-white">Caso #{request.case_number}</p>
                                </div>
                            </div>
                            <div className="text-right border-l border-slate-100 dark:border-slate-800 pl-4">
                                <p className="text-xs font-semibold uppercase text-slate-500">PPU</p>
                                <p className="font-mono font-medium text-slate-900 dark:text-white">{request.ppu}</p>
                            </div>
                        </div>
                    )}

                    {/* Recipients Section */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Destinatarios</label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleCopy(EMAIL_CONFIG.to.join('; '), 'Destinatarios')}
                                className="h-6 text-[10px] uppercase font-bold text-blue-600 hover:bg-blue-50"
                            >
                                <Copy className="mr-1 h-3 w-3" /> Copiar
                            </Button>
                        </div>
                        <p className="text-sm text-slate-700 dark:text-slate-300 break-all">
                            {EMAIL_CONFIG.to.join('; ')}
                        </p>
                        <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center justify-between mb-1">
                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">CC</label>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleCopy(EMAIL_CONFIG.cc.join('; '), 'CC')}
                                    className="h-6 text-[10px] uppercase font-bold text-blue-600 hover:bg-blue-50"
                                >
                                    <Copy className="mr-1 h-3 w-3" /> Copiar
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500 dark:text-slate-400 break-all">
                                {EMAIL_CONFIG.cc.join('; ')}
                            </p>
                        </div>
                    </div>

                    {/* Subject Section */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm group hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Asunto</label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => request && handleCopy(generateEmailSubject(request.case_number), 'Asunto')}
                                className="h-6 text-[10px] uppercase font-bold text-blue-600 hover:bg-blue-50"
                            >
                                <Copy className="mr-1 h-3 w-3" /> Copiar
                            </Button>
                        </div>
                        <p className="text-sm font-medium text-slate-900 dark:text-white select-all">
                            {request && generateEmailSubject(request.case_number)}
                        </p>
                    </div>

                    {/* Body Section */}
                    <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col h-[300px] group hover:border-blue-400 dark:hover:border-blue-600 transition-colors">
                        <div className="flex items-center justify-between mb-3 border-b border-slate-100 dark:border-slate-800 pb-2">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Cuerpo del Mensaje</label>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => request && handleCopy(generateEmailBody(request), 'Cuerpo')}
                                className="h-6 text-[10px] uppercase font-bold text-blue-600 hover:bg-blue-50"
                            >
                                <Copy className="mr-1 h-3 w-3" /> Copiar
                            </Button>
                        </div>
                        <div className="flex-1 overflow-y-auto relative bg-slate-50 dark:bg-slate-950/50 rounded-lg p-3">
                            <pre className="text-sm font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed font-normal">
                                {request && generateEmailBody(request)}
                            </pre>
                        </div>
                    </div>

                    {/* IMPORTANT: Copy All Button - PROMINENT */}
                    <Button
                        onClick={handleCopyAll}
                        className="w-full h-14 text-lg font-bold bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/30 hover:shadow-emerald-500/50 transition-all hover:-translate-y-0.5"
                    >
                        <Clipboard className="mr-3 h-6 w-6" />
                        📋 COPIAR TODO (Destinatarios + Asunto + Cuerpo)
                    </Button>

                    {/* Tips */}
                    <div className="flex gap-3 p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-200 dark:border-amber-900/30">
                        <AlertCircle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                        <div className="text-sm text-amber-800 dark:text-amber-300">
                            <p className="font-semibold mb-1">💡 Método recomendado para correo corporativo:</p>
                            <p className="opacity-90 leading-relaxed">
                                1. Haz clic en <strong>"COPIAR TODO"</strong> arriba<br />
                                2. Abre Outlook y crea un nuevo correo<br />
                                3. Pega el contenido (Ctrl+V o Cmd+V)<br />
                                4. Ajusta los campos y envía
                            </p>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 grid gap-3 sm:grid-cols-2 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
                    <Button
                        onClick={() => request && onMarkSent(request.id)}
                        variant="outline"
                        className="h-12 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700 hover:border-emerald-300 dark:border-emerald-900/50 dark:hover:bg-emerald-900/20 text-emerald-600"
                    >
                        <CheckCircle className="mr-2 h-5 w-5" />
                        Marcar como Enviado
                    </Button>

                    {request && (
                        <Button
                            onClick={handleOpenEmail}
                            disabled={isLoading}
                            className="inline-flex items-center justify-center h-12 px-6 font-semibold text-white transition-all bg-gradient-to-r from-blue-600 to-indigo-600 rounded-lg hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-500/25 hover:shadow-blue-500/40 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50"
                        >
                            {isLoading ? (
                                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            ) : (
                                <ExternalLink className="mr-2 h-5 w-5" />
                            )}
                            Intentar Abrir Correo
                        </Button>
                    )}
                </div>
            </div>
        </div>
    );
}

