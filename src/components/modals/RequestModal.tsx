import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { RequestForm } from "@/components/forms/RequestForm"
import { RequestFormValues } from "@/lib/schemas"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"

interface RequestModalProps {
    isOpen: boolean
    onClose: () => void
    request: any // Type this better with database types
    onSuccess: () => void
}

export function RequestModal({ isOpen, onClose, request, onSuccess }: RequestModalProps) {
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (values: RequestFormValues) => {
        try {
            setLoading(true)

            // Auto-update status logic
            let newStatus = request.status;
            if (values.video_url && values.video_url !== request.video_url) {
                if (['pendiente', 'en_revision'].includes(request.status)) {
                    newStatus = 'pendiente_envio';
                    toast.info("Estado actualizado a: Pendiente de Envío");
                }
            }

            const { error } = await supabase
                .from('solicitudes')
                .update({
                    case_number: values.case_number,
                    incident_at: values.incident_at ? new Date(values.incident_at).toISOString() : null,
                    ingress_at: values.ingress_at ? new Date(values.ingress_at).toISOString() : null,
                    ppu: values.ppu,
                    incident_point: values.incident_point,
                    reason: values.reason,
                    detail: values.detail,
                    video_url: values.video_url,
                    video_url_uploaded_at: (values.video_url && values.video_url !== request.video_url) ? new Date().toISOString() : request.video_url_uploaded_at,
                    updated_at: new Date().toISOString(),
                    status: newStatus
                })
                .eq('id', request.id)

            if (error) throw error

            toast.success("Solicitud actualizada")
            onSuccess()
            onClose()
        } catch (error: any) {
            console.error(error)
            toast.error("Error al actualizar: " + error.message)
        } finally {
            setLoading(false)
        }
    }

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle>Detalle Solicitud #{request?.case_number || ''}</DialogTitle>
                </DialogHeader>
                {request && (
                    <RequestForm
                        initialValues={{
                            ...request,
                            // Conversión de fechas para inputs type="datetime-local"
                            incident_at: request.incident_at ? new Date(request.incident_at).toISOString().slice(0, 16) : '',
                            ingress_at: request.ingress_at ? new Date(request.ingress_at).toISOString().slice(0, 16) : '',
                        }}
                        onSubmit={handleSubmit}
                        isLoading={loading}
                        title="Editar Información"
                        mode="edit"
                    />
                )}
            </DialogContent>
        </Dialog>
    )
}
