import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { STATUS_LABELS, FAILURE_TYPES } from './schemas';

interface ExportData {
    id?: string;
    case_number?: string;
    ppu?: string;
    incident_at?: string;
    ingress_at?: string;
    incident_point?: string;
    reason?: string;
    detail?: string;
    video_url?: string;
    obs?: string;
    operator_name?: string;
    operator_rut?: string;
    failure_type?: string;
    status?: string;
    sent_at?: string;
    created_at?: string;
}

export function exportToExcel(data: ExportData[], filename: string = 'solicitudes') {
    // Transform data for better readability
    const transformedData = data.map(row => ({
        'N° Caso': row.case_number || '',
        'PPU': row.ppu || '',
        'Fecha Incidente': row.incident_at ? format(new Date(row.incident_at), 'dd/MM/yyyy HH:mm', { locale: es }) : '',
        'Fecha Ingreso': row.ingress_at ? format(new Date(row.ingress_at), 'dd/MM/yyyy HH:mm', { locale: es }) : '',
        'Punto Incidente': row.incident_point || '',
        'Motivo': row.reason || '',
        'Detalle': row.detail || '',
        'URL Video': row.video_url || '',
        'Observaciones': row.obs || '',
        'Operador': row.operator_name || '',
        'RUT Operador': row.operator_rut || '',
        'Tipo Falla': row.failure_type ? (FAILURE_TYPES as any)[row.failure_type] || row.failure_type : '',
        'Estado': row.status ? (STATUS_LABELS as any)[row.status] || row.status : '',
        'Fecha Envío': row.sent_at ? format(new Date(row.sent_at), 'dd/MM/yyyy HH:mm', { locale: es }) : '',
        'Fecha Creación': row.created_at ? format(new Date(row.created_at), 'dd/MM/yyyy HH:mm', { locale: es }) : '',
    }));

    // Create workbook and worksheet
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(transformedData);

    // Set column widths
    const colWidths = [
        { wch: 12 }, // N° Caso
        { wch: 10 }, // PPU
        { wch: 18 }, // Fecha Incidente
        { wch: 18 }, // Fecha Ingreso
        { wch: 30 }, // Punto
        { wch: 25 }, // Motivo
        { wch: 50 }, // Detalle
        { wch: 50 }, // URL
        { wch: 30 }, // Obs
        { wch: 25 }, // Operador
        { wch: 15 }, // RUT
        { wch: 18 }, // Tipo Falla
        { wch: 15 }, // Estado
        { wch: 18 }, // Fecha Envío
        { wch: 18 }, // Fecha Creación
    ];
    ws['!cols'] = colWidths;

    XLSX.utils.book_append_sheet(wb, ws, 'Solicitudes');

    // Generate filename with date
    const dateStr = format(new Date(), 'yyyy-MM-dd');
    const fullFilename = `${filename}_${dateStr}.xlsx`;

    // Download
    XLSX.writeFile(wb, fullFilename);

    return fullFilename;
}

// Export CSV (keeping backward compatibility)
export function exportToCSV(data: any[], filename: string = 'export') {
    const headers = Object.keys(data[0] || {});
    const csvContent = [
        headers.join(','),
        ...data.map(row =>
            headers.map(header => {
                const value = row[header];
                // Handle values with commas or quotes
                if (value === null || value === undefined) return '';
                const stringVal = String(value);
                if (stringVal.includes(',') || stringVal.includes('"') || stringVal.includes('\n')) {
                    return `"${stringVal.replace(/"/g, '""')}"`;
                }
                return stringVal;
            }).join(',')
        )
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${filename}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
}
