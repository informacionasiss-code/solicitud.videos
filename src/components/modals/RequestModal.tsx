import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { format } from "date-fns"
import { RequestForm } from "@/components/forms/RequestForm"
import { RequestFormValues } from "@/lib/schemas"
import { useState } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { normalizePpu } from "@/lib/fleet"
import { enviarSolicitudSinDisco } from "@/lib/envioAutomatico"

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

            // Editar una solicitud no puede desviarla a un bus ajeno.
            if (values.fleet_status === 'fuera_de_flota') {
                toast.error("PPU fuera de flota: no se guardan los cambios.")
                return
            }

            const sinDisco = Boolean(values.sin_disco)
            const ppu = normalizePpu(values.ppu)
            // Sin disco no hay video posible: se descarta cualquier URL previa
            // para que el correo no ofrezca una descarga inexistente.
            const videoUrl = sinDisco ? null : (values.video_url || null)

            // Auto-update status logic
            let newStatus = request.status;
            if (sinDisco) {
                if (request.status !== 'enviado') newStatus = 'pendiente_envio';
            } else if (videoUrl && videoUrl !== request.video_url) {
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
                    ppu,
                    incident_point: values.incident_point,
                    reason: values.reason,
                    detail: values.detail,
                    video_url: videoUrl,
                    video_url_uploaded_at: (videoUrl && videoUrl !== request.video_url) ? new Date().toISOString() : request.video_url_uploaded_at,
                    // Estos campos existían en el formulario pero no se
                    // guardaban; sin ellos la falla y las observaciones se
                    // perdían al editar.
                    failure_type: sinDisco ? 'bus_sin_disco' : (values.failure_type || null),
                    obs: values.obs || null,
                    fleet_status: values.fleet_status || request.fleet_status || 'desconocido',
                    sin_disco: sinDisco,
                    sin_disco_source: sinDisco ? (values.sin_disco_source || 'flota') : null,
                    updated_at: new Date().toISOString(),
                    status: newStatus
                })
                .eq('id', request.id)

            if (error) throw error

            // Si al editar resulta que el bus no tiene disco y el caso aún no
            // se ha respondido, se despacha en el momento: no hay nada que
            // esperar. Un caso ya enviado no se reenvía.
            if (sinDisco && request.status !== 'enviado') {
                toast.loading("Bus sin disco: enviando correo...", { id: "envio-auto" })
                const envio = await enviarSolicitudSinDisco({
                    ...request,
                    ...values,
                    id: request.id,
                    ppu,
                    sin_disco: true,
                    failure_type: 'bus_sin_disco',
                    video_url: null,
                })
                if (envio.enviado) {
                    toast.success(`✅ ${envio.mensaje}`, { id: "envio-auto", duration: 9000 })
                } else {
                    toast.error(`⚠️ ${envio.mensaje}`, { id: "envio-auto", duration: 12000 })
                }
            } else {
                toast.success("Solicitud actualizada")
            }
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
                            // Convert UTC timestamps to Local Literal strings for the form
                            incident_at: request.incident_at ? format(new Date(request.incident_at), "yyyy-MM-dd'T'HH:mm") : '',
                            ingress_at: request.ingress_at ? format(new Date(request.ingress_at), "yyyy-MM-dd'T'HH:mm") : '',
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
