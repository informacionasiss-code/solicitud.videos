import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export interface ExportableRequest {
    case_number: string;
    ppu: string;
    incident_at: string | null;
    ingress_at: string | null;
    incident_point: string | null;
    reason: string | null;
    detail: string | null;
    status: string;
    video_url: string | null;
    created_at: string;
}

const STATUS_MAP: Record<string, string> = {
    pendiente: 'Pendiente',
    en_revision: 'En Revisión',
    revisado: 'Revisado',
    pendiente_envio: 'Pendiente de Envío',
    enviado: 'Enviado'
};

export function exportToCSV(data: ExportableRequest[], filename: string = 'solicitudes') {
    const headers = [
        'Caso',
        'PPU',
        'Fecha Incidente',
        'Fecha Ingreso',
        'Punto del Incidente',
        'Motivo',
        'Detalle',
        'Estado',
        'Video URL',
        'Fecha Creación'
    ];

    const rows = data.map(row => [
        row.case_number || '',
        row.ppu || '',
        row.incident_at ? format(new Date(row.incident_at), 'dd/MM/yyyy HH:mm', { locale: es }) : '',
        row.ingress_at ? format(new Date(row.ingress_at), 'dd/MM/yyyy HH:mm', { locale: es }) : '',
        (row.incident_point || '').replace(/,/g, ';'),
        (row.reason || '').replace(/,/g, ';'),
        (row.detail || '').replace(/,/g, ';').replace(/\n/g, ' '),
        STATUS_MAP[row.status] || row.status,
        row.video_url || '',
        row.created_at ? format(new Date(row.created_at), 'dd/MM/yyyy HH:mm', { locale: es }) : ''
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
