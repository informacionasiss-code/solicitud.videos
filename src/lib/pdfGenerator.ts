import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

interface PendingRequest {
    ppu: string;
    case_number: string;
    incident_at?: string;
}

export function generatePendingPPUsPDF(requests: PendingRequest[]) {
    const doc = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 15;
    const contentWidth = pageWidth - (margin * 2);

    // Colors
    const primaryColor: [number, number, number] = [59, 130, 246]; // Blue-500
    const darkColor: [number, number, number] = [30, 41, 59]; // Slate-800
    const lightGray: [number, number, number] = [241, 245, 249]; // Slate-100
    const mediumGray: [number, number, number] = [100, 116, 139]; // Slate-500

    // Header background gradient effect (rectangle)
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Header title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('PATENTES PENDIENTES', pageWidth / 2, 20, { align: 'center' });

    // Sub header
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Extracción de Video', pageWidth / 2, 28, { align: 'center' });

    // Date and count
    doc.setFontSize(10);
    const today = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });
    doc.text(`Generado: ${today} | Total: ${requests.length} buses`, pageWidth / 2, 38, { align: 'center' });

    // Content area
    let yPos = 55;

    // Calculate grid layout
    const columns = 4;
    const cellWidth = contentWidth / columns;
    const cellHeight = 22;
    const cellPadding = 3;

    // Draw PPU grid
    requests.forEach((req, index) => {
        const col = index % columns;
        const row = Math.floor(index / columns);
        const xPos = margin + (col * cellWidth);
        const currentY = yPos + (row * cellHeight);

        // Check if we need a new page
        if (currentY + cellHeight > pageHeight - 30) {
            doc.addPage();
            yPos = 20;
            return; // Skip this iteration as positioning needs recalculation
        }

        // Cell background - alternating colors
        if (row % 2 === 0) {
            doc.setFillColor(...lightGray);
        } else {
            doc.setFillColor(255, 255, 255);
        }
        doc.rect(xPos, currentY, cellWidth, cellHeight, 'F');

        // Cell border
        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.setLineWidth(0.3);
        doc.rect(xPos, currentY, cellWidth, cellHeight, 'S');

        // PPU text (main, bold)
        doc.setTextColor(...darkColor);
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text(req.ppu || 'N/A', xPos + cellPadding, currentY + 10);

        // Case number (smaller, gray)
        doc.setTextColor(...mediumGray);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text(`#${req.case_number}`, xPos + cellPadding, currentY + 17);
    });

    // Footer
    const footerY = pageHeight - 15;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    doc.setTextColor(...mediumGray);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Sistema de Gestión de Extracción de Videos', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Página 1 de 1`, pageWidth / 2, footerY + 5, { align: 'center' });

    // Download
    const filename = `patentes_pendientes_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);

    return filename;
}
