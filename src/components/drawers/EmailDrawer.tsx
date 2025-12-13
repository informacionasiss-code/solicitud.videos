import { X, Mail, Copy, CheckCircle, FileText, Clipboard, Loader2, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { generateEmailBody, generateEmailSubject, copyEmailToClipboard, EMAIL_CONFIG, sendEmailViaResend } from "@/lib/email";
import { toast } from "sonner";
import { useCallback, useState } from "react";

interface EmailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    request: any;
    onMarkSent: (id: string) => void;
}

export function EmailDrawer({ isOpen, onClose, request, onMarkSent }: EmailDrawerProps) {
    const [isSending, setIsSending] = useState(false);

    // Simple close handler
    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    // Copy all email data to clipboard
    const handleCopyAll = useCallback(async () => {
        if (!request) return;

        try {
            const success = await copyEmailToClipboard(request);
            if (success) {
                toast.success("✅ TODO COPIADO - Pega en tu correo", { duration: 4000 });
            } else {
                toast.error("Error al copiar");
            }
        } catch (e) {
            console.error("Copy error:", e);
            toast.error("Error al copiar");
        }
    }, [request]);

    // Send email via Resend API
    const handleSendEmail = useCallback(async () => {
        if (!request) return;

        setIsSending(true);
        toast.loading("Enviando correo...", { id: "sending-email" });

        try {
            const result = await sendEmailViaResend(request);

            if (result.success) {
                toast.success("✅ " + result.message, { id: "sending-email", duration: 5000 });
                onMarkSent(request.id);
                handleClose();
            } else {
                toast.error("❌ " + result.message, { id: "sending-email", duration: 5000 });
            }
        } catch (error: any) {
            console.error("[RESEND] Error:", error);
            toast.error("Error al enviar: " + (error.message || "Error desconocido"), { id: "sending-email" });
        } finally {
            setIsSending(false);
        }
    }, [request, onMarkSent, handleClose]);

    // Copy individual field
    const handleCopy = useCallback((text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado`);
    }, []);

    // Don't render if not open
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Drawer Panel */}
            <div className="fixed inset-y-0 right-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white">
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-white/20 flex items-center justify-center">
                            <Mail className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold">Preparar Envío</h2>
                            <p className="text-sm text-blue-100">Caso #{request?.case_number || 'N/A'}</p>
                        </div>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={handleClose}
                        className="text-white hover:bg-white/20 rounded-full"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">

                    {/* Case Info */}
                    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border shadow-sm">
                        <div className="h-12 w-12 rounded-lg bg-indigo-100 flex items-center justify-center">
                            <FileText className="h-6 w-6 text-indigo-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-xs text-slate-500 uppercase font-semibold">Solicitud</p>
                            <p className="text-lg font-bold text-slate-900">Caso #{request?.case_number}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-slate-500 uppercase font-semibold">PPU</p>
                            <p className="font-mono font-bold text-slate-900">{request?.ppu}</p>
                        </div>
                    </div>

                    {/* Recipients */}
                    <div className="bg-white rounded-lg border p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Destinatarios</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-blue-600"
                                onClick={() => handleCopy(EMAIL_CONFIG.to.join('; '), 'Destinatarios')}
                            >
                                <Copy className="h-3 w-3 mr-1" /> Copiar
                            </Button>
                        </div>
                        <p className="text-sm text-slate-700 break-all">{EMAIL_CONFIG.to.join('; ')}</p>

                        <div className="mt-3 pt-3 border-t">
                            <div className="flex items-center justify-between mb-1">
                                <span className="text-xs font-bold text-slate-500 uppercase">CC</span>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs text-blue-600"
                                    onClick={() => handleCopy(EMAIL_CONFIG.cc.join('; '), 'CC')}
                                >
                                    <Copy className="h-3 w-3 mr-1" /> Copiar
                                </Button>
                            </div>
                            <p className="text-xs text-slate-500 break-all">{EMAIL_CONFIG.cc.join('; ')}</p>
                        </div>
                    </div>

                    {/* Subject */}
                    <div className="bg-white rounded-lg border p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Asunto</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-blue-600"
                                onClick={() => request && handleCopy(generateEmailSubject(request.case_number), 'Asunto')}
                            >
                                <Copy className="h-3 w-3 mr-1" /> Copiar
                            </Button>
                        </div>
                        <p className="text-sm font-medium text-slate-900">
                            {request && generateEmailSubject(request.case_number)}
                        </p>
                    </div>

                    {/* Body */}
                    <div className="bg-white rounded-lg border p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">Cuerpo del Mensaje</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-blue-600"
                                onClick={() => request && handleCopy(generateEmailBody(request), 'Cuerpo')}
                            >
                                <Copy className="h-3 w-3 mr-1" /> Copiar
                            </Button>
                        </div>
                        <div className="bg-slate-50 rounded p-3 max-h-48 overflow-y-auto">
                            <pre className="text-sm text-slate-700 whitespace-pre-wrap font-sans">
                                {request && generateEmailBody(request)}
                            </pre>
                        </div>
                    </div>

                    {/* Quick Copy All */}
                    <Button
                        onClick={handleCopyAll}
                        className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                    >
                        <Clipboard className="mr-2 h-5 w-5" />
                        📋 COPIAR TODO
                    </Button>

                </div>

                {/* Footer Actions */}
                <div className="p-4 bg-white border-t space-y-3">

                    {/* Primary: Send via API */}
                    <Button
                        onClick={handleSendEmail}
                        disabled={isSending}
                        className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg"
                    >
                        {isSending ? (
                            <>
                                <Loader2 className="mr-2 h-6 w-6 animate-spin" />
                                Enviando...
                            </>
                        ) : (
                            <>
                                <Send className="mr-2 h-6 w-6" />
                                📧 ENVIAR CORREO AHORA
                            </>
                        )}
                    </Button>

                    {/* Secondary: Mark as sent */}
                    <Button
                        onClick={() => {
                            if (request) {
                                onMarkSent(request.id);
                                handleClose();
                            }
                        }}
                        variant="outline"
                        className="w-full h-10 text-emerald-600 border-emerald-300 hover:bg-emerald-50"
                    >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Marcar como Enviado (manual)
                    </Button>
                </div>
            </div>
        </>
    );
}
