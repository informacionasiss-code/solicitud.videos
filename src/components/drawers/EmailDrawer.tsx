import { X, Mail, Copy, CheckCircle, FileText, Clipboard, Loader2, Send, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateEmailBody, generateEmailSubject, EMAIL_CONFIG, sendEmailViaResend } from "@/lib/email";
import { toast } from "sonner";
import { useCallback, useState, useEffect } from "react";

interface EmailDrawerProps {
    isOpen: boolean;
    onClose: () => void;
    request: any;
    onMarkSent: (id: string) => void;
}

export function EmailDrawer({ isOpen, onClose, request, onMarkSent }: EmailDrawerProps) {
    const [isSending, setIsSending] = useState(false);

    // Editable recipients
    const [toEmails, setToEmails] = useState<string[]>([]);
    const [ccEmails, setCcEmails] = useState<string[]>([]);
    const [newToEmail, setNewToEmail] = useState("");
    const [newCcEmail, setNewCcEmail] = useState("");

    // Reset to defaults when drawer opens
    useEffect(() => {
        if (isOpen) {
            setToEmails([...EMAIL_CONFIG.to]);
            setCcEmails([...EMAIL_CONFIG.cc]);
        }
    }, [isOpen]);

    // Simple close handler
    const handleClose = useCallback(() => {
        onClose();
    }, [onClose]);

    // Add email to TO list
    const addToEmail = useCallback(() => {
        if (newToEmail && newToEmail.includes('@') && !toEmails.includes(newToEmail)) {
            setToEmails(prev => [...prev, newToEmail.trim()]);
            setNewToEmail("");
        }
    }, [newToEmail, toEmails]);

    // Add email to CC list
    const addCcEmail = useCallback(() => {
        if (newCcEmail && newCcEmail.includes('@') && !ccEmails.includes(newCcEmail)) {
            setCcEmails(prev => [...prev, newCcEmail.trim()]);
            setNewCcEmail("");
        }
    }, [newCcEmail, ccEmails]);

    // Remove email from TO list
    const removeToEmail = useCallback((email: string) => {
        setToEmails(prev => prev.filter(e => e !== email));
    }, []);

    // Remove email from CC list
    const removeCcEmail = useCallback((email: string) => {
        setCcEmails(prev => prev.filter(e => e !== email));
    }, []);

    // Copy all email data to clipboard
    const handleCopyAll = useCallback(async () => {
        if (!request) return;

        try {
            const subject = generateEmailSubject(request?.case_number || '');
            const body = generateEmailBody(request || {});
            const to = toEmails.join('; ');
            const cc = ccEmails.join('; ');

            const fullText = `PARA: ${to}\n\nCC: ${cc}\n\nASUNTO: ${subject}\n\n${body}`;
            await navigator.clipboard.writeText(fullText);
            toast.success("✅ TODO COPIADO", { duration: 4000 });
        } catch (e) {
            console.error("Copy error:", e);
            toast.error("Error al copiar");
        }
    }, [request, toEmails, ccEmails]);

    // Send email via Resend API with custom recipients
    const handleSendEmail = useCallback(async () => {
        if (!request) return;
        if (toEmails.length === 0) {
            toast.error("Agrega al menos un destinatario");
            return;
        }

        setIsSending(true);
        toast.loading("Enviando correo...", { id: "sending-email" });

        try {
            // Create modified request with custom recipients
            const modifiedEmailConfig = {
                to: toEmails,
                cc: ccEmails,
            };

            const result = await sendEmailViaResend(request, modifiedEmailConfig);

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
    }, [request, toEmails, ccEmails, onMarkSent, handleClose]);

    // Copy individual field
    const handleCopy = useCallback((text: string, label: string) => {
        navigator.clipboard.writeText(text);
        toast.success(`${label} copiado`);
    }, []);

    // Don't render if not open
    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop - full screen */}
            <div
                className="fixed top-0 left-0 right-0 bottom-0 z-40 bg-black/50 backdrop-blur-sm"
                onClick={handleClose}
            />

            {/* Drawer Panel - full height from top */}
            <div className="fixed top-0 right-0 bottom-0 z-50 w-full max-w-xl bg-white shadow-2xl flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-blue-600 to-indigo-600 text-white shrink-0">
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

                    {/* EDITABLE Recipients TO */}
                    <div className="bg-white rounded-lg border p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-500 uppercase">Para (Destinatarios)</span>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 text-xs text-blue-600"
                                onClick={() => handleCopy(toEmails.join('; '), 'Destinatarios')}
                            >
                                <Copy className="h-3 w-3 mr-1" /> Copiar
                            </Button>
                        </div>

                        {/* Email chips */}
                        <div className="flex flex-wrap gap-2 mb-3">
                            {toEmails.map((email) => (
                                <div
                                    key={email}
                                    className="flex items-center gap-1 bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs font-medium"
                                >
                                    <span className="max-w-[150px] truncate">{email}</span>
                                    <button
                                        onClick={() => removeToEmail(email)}
                                        className="hover:bg-blue-200 rounded-full p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                            {toEmails.length === 0 && (
                                <span className="text-sm text-slate-400 italic">Sin destinatarios</span>
                            )}
                        </div>

                        {/* Add new email */}
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                placeholder="Agregar email..."
                                value={newToEmail}
                                onChange={(e) => setNewToEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addToEmail()}
                                className="flex-1 h-8 text-sm"
                            />
                            <Button
                                size="sm"
                                onClick={addToEmail}
                                className="h-8 px-3 bg-blue-600 hover:bg-blue-700"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* EDITABLE Recipients CC */}
                    <div className="bg-white rounded-lg border p-4 shadow-sm">
                        <div className="flex items-center justify-between mb-3">
                            <span className="text-xs font-bold text-slate-500 uppercase">CC (Copia)</span>
                            <div className="flex gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs text-red-600"
                                    onClick={() => setCcEmails([])}
                                >
                                    <Trash2 className="h-3 w-3 mr-1" /> Limpiar
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-6 text-xs text-blue-600"
                                    onClick={() => handleCopy(ccEmails.join('; '), 'CC')}
                                >
                                    <Copy className="h-3 w-3 mr-1" /> Copiar
                                </Button>
                            </div>
                        </div>

                        {/* Email chips */}
                        <div className="flex flex-wrap gap-2 mb-3 max-h-24 overflow-y-auto">
                            {ccEmails.map((email) => (
                                <div
                                    key={email}
                                    className="flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-1 rounded-full text-xs font-medium"
                                >
                                    <span className="max-w-[150px] truncate">{email}</span>
                                    <button
                                        onClick={() => removeCcEmail(email)}
                                        className="hover:bg-slate-200 rounded-full p-0.5"
                                    >
                                        <X className="h-3 w-3" />
                                    </button>
                                </div>
                            ))}
                            {ccEmails.length === 0 && (
                                <span className="text-sm text-slate-400 italic">Sin CC</span>
                            )}
                        </div>

                        {/* Add new CC email */}
                        <div className="flex gap-2">
                            <Input
                                type="email"
                                placeholder="Agregar CC..."
                                value={newCcEmail}
                                onChange={(e) => setNewCcEmail(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && addCcEmail()}
                                className="flex-1 h-8 text-sm"
                            />
                            <Button
                                size="sm"
                                onClick={addCcEmail}
                                className="h-8 px-3 bg-slate-600 hover:bg-slate-700"
                            >
                                <Plus className="h-4 w-4" />
                            </Button>
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
                        <div className="bg-slate-50 rounded p-3 max-h-40 overflow-y-auto">
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
                <div className="p-4 bg-white border-t space-y-3 shrink-0">

                    {/* Primary: Send via API */}
                    <Button
                        onClick={handleSendEmail}
                        disabled={isSending || toEmails.length === 0}
                        className="w-full h-14 text-lg font-bold bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-lg disabled:opacity-50"
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
