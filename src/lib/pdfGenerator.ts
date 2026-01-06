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
    const mediumGray: [number, number, number] = [100, 116, 139]; // Slate-500
    const warningColor: [number, number, number] = [245, 158, 11]; // Amber-500

    // Group by unique PPU and count cases
    const ppuMap: Record<string, number> = {};
    requests.forEach(req => {
        const ppu = req.ppu || 'SIN PPU';
        ppuMap[ppu] = (ppuMap[ppu] || 0) + 1;
    });

    // Convert to array and sort alphabetically
    const uniquePPUs = Object.entries(ppuMap)
        .map(([ppu, count]) => ({ ppu, count }))
        .sort((a, b) => a.ppu.localeCompare(b.ppu));

    const totalBuses = uniquePPUs.length;
    const totalCases = requests.length;

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
    doc.text(`Generado: ${today} | ${totalBuses} buses | ${totalCases} casos`, pageWidth / 2, 38, { align: 'center' });

    // Content area
    let yPos = 55;
    let col = 0;

    // Calculate grid layout
    const columns = 6; // Increased columns for clearer fit
    const cellWidth = contentWidth / columns;
    const cellHeight = 12; // Reduced height for compactness

    // Draw PPU grid (unique PPUs only)
    uniquePPUs.forEach((item) => {
        // Check availability strictly before drawing
        if (yPos + cellHeight > pageHeight - 10) {
            doc.addPage();
            yPos = 20;
            col = 0;
        }

        const xPos = margin + (col * cellWidth);

        // Cell background - alternating colors based on absolute index is tricky with pagination
        // Simple alternate based on col/row visualization
        // We can just use white for cleaner compact look or very light gray
        doc.setFillColor(255, 255, 255);
        doc.rect(xPos, yPos, cellWidth, cellHeight, 'F');

        // Cell border
        doc.setDrawColor(226, 232, 240); // Slate-200
        doc.setLineWidth(0.2);
        doc.rect(xPos, yPos, cellWidth, cellHeight, 'S');

        // PPU text (main, bold)
        doc.setTextColor(...darkColor);
        doc.setFontSize(10); // Slightly smaller font
        doc.setFont('helvetica', 'bold');
        const textWidth = doc.getTextWidth(item.ppu);
        const textX = xPos + (cellWidth - textWidth) / 2; // Center horizontally
        doc.text(item.ppu, textX, yPos + 6); // Center vertically approx

        // Show case count if more than 1
        if (item.count > 1) {
            doc.setTextColor(...warningColor);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            const countText = `(${item.count} casos)`;
            const countWidth = doc.getTextWidth(countText);
            const countX = xPos + (cellWidth - countWidth) / 2;
            doc.text(countText, countX, yPos + 10);
        }

        // Increment cursor
        col++;
        if (col >= columns) {
            col = 0;
            yPos += cellHeight;
        }
    });

    // Footer
    const footerY = pageHeight - 15;
    doc.setDrawColor(...primaryColor);
    doc.setLineWidth(0.5);
    doc.line(margin, footerY - 5, pageWidth - margin, footerY - 5);

    doc.setTextColor(...mediumGray);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('Extracción Videos El Roble', pageWidth / 2, footerY, { align: 'center' });
    doc.text(`Página 1 de 1`, pageWidth / 2, footerY + 5, { align: 'center' });

    // Download
    const filename = `patentes_pendientes_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);

    return filename;
}

