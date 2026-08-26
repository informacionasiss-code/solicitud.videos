// Importación con nombre: es la que jsPDF documenta para ESM y la única
// que resuelve igual en el navegador y en Node, donde corren las pruebas.
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

// ============================================================================
// Listado de patentes pendientes de extracción, para el inspector en terreno.
//
// Dos secciones, cada una en su propia página: las solicitudes de video y los
// requerimientos de impugnación. Se separan porque son dos trabajos distintos y
// el inspector recorre uno u otro.
//
// Regla que vale para todo el documento: un bus sin disco duro NUNCA aparece.
// No hay grabación que extraer, así que listarlo sólo consigue que alguien
// camine hasta el bus para descubrirlo en el terminal.
// ============================================================================

export interface PendingRequest {
    ppu: string;
    case_number?: string;
    incident_at?: string;
    /** Si es true, la fila se descarta: no hay nada que revisar. */
    sin_disco?: boolean | null;
}

interface Seccion {
    titulo: string;
    subtitulo: string;
    items: PendingRequest[];
}

interface PpuAgrupada {
    ppu: string;
    count: number;
}

const COLOR_PRIMARIO: [number, number, number] = [59, 130, 246];   // Blue-500
const COLOR_IMPUGNACION: [number, number, number] = [124, 58, 237]; // Violet-600
const COLOR_OSCURO: [number, number, number] = [30, 41, 59];        // Slate-800
const COLOR_GRIS: [number, number, number] = [100, 116, 139];       // Slate-500
const COLOR_AVISO: [number, number, number] = [245, 158, 11];       // Amber-500

/**
 * Descarta los buses sin disco y agrupa por patente contando los casos.
 *
 * El filtro se aplica aquí, y no sólo en la consulta que trae los datos, para
 * que la garantía no dependa de que cada sitio que genere el PDF se acuerde de
 * excluirlos. Es el documento el que no puede contenerlos.
 */
export function agruparPendientes(items: PendingRequest[]): { ppus: PpuAgrupada[]; casos: number; descartados: number } {
    const utiles = items.filter((r) => !r.sin_disco);
    const descartados = items.length - utiles.length;

    const conteo: Record<string, number> = {};
    for (const req of utiles) {
        const ppu = (req.ppu || 'SIN PPU').toUpperCase();
        conteo[ppu] = (conteo[ppu] || 0) + 1;
    }

    return {
        ppus: Object.entries(conteo)
            .map(([ppu, count]) => ({ ppu, count }))
            .sort((a, b) => a.ppu.localeCompare(b.ppu)),
        casos: utiles.length,
        descartados,
    };
}

/**
 * Construye el documento sin guardarlo.
 *
 * Separado del guardado para que las pruebas puedan inspeccionar el resultado:
 * un PDF que sólo se sabe escribir en disco no se puede verificar.
 */
export function construirPDFPendientes(
    solicitudes: PendingRequest[],
    impugnaciones: PendingRequest[] = []
): jsPDF {
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const anchoPagina = doc.internal.pageSize.getWidth();
    const altoPagina = doc.internal.pageSize.getHeight();
    const margen = 15;
    const anchoUtil = anchoPagina - margen * 2;

    const hoy = format(new Date(), "dd 'de' MMMM 'de' yyyy", { locale: es });

    const secciones: Seccion[] = [
        {
            titulo: 'PATENTES PENDIENTES',
            subtitulo: 'Solicitudes de Video',
            items: solicitudes,
        },
    ];
    if (impugnaciones.length > 0) {
        secciones.push({
            titulo: 'PATENTES PENDIENTES',
            subtitulo: 'Impugnación',
            items: impugnaciones,
        });
    }

    let esPrimera = true;

    for (const [indice, seccion] of secciones.entries()) {
        // Cada sección empieza en página nueva: son recorridos distintos.
        if (!esPrimera) doc.addPage();
        esPrimera = false;

        const color = indice === 0 ? COLOR_PRIMARIO : COLOR_IMPUGNACION;
        const { ppus, casos, descartados } = agruparPendientes(seccion.items);

        // ---- Cabecera ----
        doc.setFillColor(...color);
        doc.rect(0, 0, anchoPagina, 45, 'F');

        doc.setTextColor(255, 255, 255);
        doc.setFontSize(24);
        doc.setFont('helvetica', 'bold');
        doc.text(seccion.titulo, anchoPagina / 2, 20, { align: 'center' });

        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text(seccion.subtitulo, anchoPagina / 2, 28, { align: 'center' });

        doc.setFontSize(10);
        doc.text(
            `Generado: ${hoy}  |  ${ppus.length} buses  |  ${casos} ${indice === 0 ? 'casos' : 'requerimientos'}`,
            anchoPagina / 2,
            38,
            { align: 'center' }
        );

        let y = 55;

        // Constancia de lo excluido: el inspector debe saber que la lista es
        // más corta a propósito, no por un error.
        if (descartados > 0) {
            doc.setFillColor(254, 242, 242);
            doc.setDrawColor(252, 165, 165);
            doc.setLineWidth(0.3);
            doc.roundedRect(margen, y, anchoUtil, 9, 1.5, 1.5, 'FD');

            doc.setTextColor(185, 28, 28);
            doc.setFontSize(8.5);
            doc.setFont('helvetica', 'bold');
            doc.text(
                `${descartados} bus(es) sin disco duro excluidos de este listado: no tienen grabación que revisar.`,
                anchoPagina / 2,
                y + 6,
                { align: 'center' }
            );
            y += 14;
        }

        if (ppus.length === 0) {
            doc.setTextColor(...COLOR_GRIS);
            doc.setFontSize(11);
            doc.setFont('helvetica', 'italic');
            doc.text('No hay patentes pendientes en esta sección.', anchoPagina / 2, y + 10, {
                align: 'center',
            });
            continue;
        }

        // ---- Rejilla de patentes ----
        const columnas = 6;
        const anchoCelda = anchoUtil / columnas;
        const altoCelda = 12;
        let col = 0;

        for (const item of ppus) {
            if (y + altoCelda > altoPagina - 20) {
                doc.addPage();
                y = 20;
                col = 0;
            }

            const x = margen + col * anchoCelda;

            doc.setFillColor(255, 255, 255);
            doc.rect(x, y, anchoCelda, altoCelda, 'F');
            doc.setDrawColor(226, 232, 240);
            doc.setLineWidth(0.2);
            doc.rect(x, y, anchoCelda, altoCelda, 'S');

            doc.setTextColor(...COLOR_OSCURO);
            doc.setFontSize(10);
            doc.setFont('helvetica', 'bold');
            const anchoTexto = doc.getTextWidth(item.ppu);
            doc.text(item.ppu, x + (anchoCelda - anchoTexto) / 2, y + 6);

            if (item.count > 1) {
                doc.setTextColor(...COLOR_AVISO);
                doc.setFontSize(7);
                const texto = indice === 0 ? `(${item.count} casos)` : `(${item.count} req.)`;
                const ancho = doc.getTextWidth(texto);
                doc.text(texto, x + (anchoCelda - ancho) / 2, y + 10);
            }

            col++;
            if (col >= columnas) {
                col = 0;
                y += altoCelda;
            }
        }
    }

    // ---- Pie en TODAS las páginas, con numeración real ----
    // Antes se dibujaba una sola vez y decía siempre "Página 1 de 1", aunque el
    // listado ocupara varias.
    const totalPaginas = doc.getNumberOfPages();
    for (let p = 1; p <= totalPaginas; p++) {
        doc.setPage(p);
        const yPie = altoPagina - 15;

        doc.setDrawColor(...COLOR_PRIMARIO);
        doc.setLineWidth(0.5);
        doc.line(margen, yPie - 5, anchoPagina - margen, yPie - 5);

        doc.setTextColor(...COLOR_GRIS);
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.text('Extracción Videos El Roble', anchoPagina / 2, yPie, { align: 'center' });
        doc.text(`Página ${p} de ${totalPaginas}`, anchoPagina / 2, yPie + 5, { align: 'center' });
    }

    return doc;
}

export function generatePendingPPUsPDF(
    solicitudes: PendingRequest[],
    impugnaciones: PendingRequest[] = []
): string {
    const doc = construirPDFPendientes(solicitudes, impugnaciones);
    const filename = `patentes_pendientes_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
    doc.save(filename);
    return filename;
}
