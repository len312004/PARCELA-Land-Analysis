interface Coordinate {
  x: number;
  y: number;
}

interface Lot {
  lotNumber: number;
  polygon: any;
  area: number;
}

interface ExportData {
  title: string;
  totalArea: number;
  lotSize: number;
  numberOfLots: number;
  coordinates: Coordinate[];
  lots: Lot[];
  timestamp: string;
}

export function exportAsJSON(data: ExportData) {
  const jsonString = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonString], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `parcela-layout-${Date.now()}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSVGAsPNG(svgElement: SVGSVGElement) {
  const svgData = new XMLSerializer().serializeToString(svgElement);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    alert('Canvas not supported');
    return;
  }

  const img = new Image();
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);

  img.onload = () => {
    canvas.width = svgElement.width.baseVal.value;
    canvas.height = svgElement.height.baseVal.value;
    ctx.drawImage(img, 0, 0);
    URL.revokeObjectURL(url);

    canvas.toBlob((blob) => {
      if (blob) {
        const pngUrl = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = pngUrl;
        link.download = `parcela-layout-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(pngUrl);
      }
    });
  };

  img.src = url;
}

export async function exportLeafletMapAsPNG(mapContainer: HTMLElement) {
  try {
    const { default: html2canvas } = await import('html2canvas');

    const canvas = await html2canvas(mapContainer, {
      useCORS: true,
      backgroundColor: '#ffffff'
    });

    canvas.toBlob((blob) => {
      if (blob) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `parcela-layout-${Date.now()}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }
    });
  } catch (error) {
    console.error('Error exporting map:', error);
    alert('Error exporting map. Please try again.');
  }
}

export async function exportAsPDF(data: ExportData, mapContainer: HTMLElement) {
  try {
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');

    const canvas = await html2canvas(mapContainer, {
      useCORS: true,
      backgroundColor: '#ffffff',
      scale: 2
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();

    pdf.setFillColor(125, 29, 29);
    pdf.rect(0, 0, pageWidth, 40, 'F');

    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(24);
    pdf.setFont('helvetica', 'bold');
    pdf.text('PARCELA', 15, 20);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text('Land Subdivision Analysis Report', 15, 28);
    pdf.text(`Generated: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}`, 15, 35);

    pdf.setTextColor(0, 0, 0);
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text(data.title || 'Untitled Subdivision', 15, 52);

    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Summary', 15, 62);

    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    const summaryY = 70;
    pdf.text(`Total Area: ${data.totalArea.toFixed(2)} m²`, 15, summaryY);
    pdf.text(`Number of Lots: ${data.numberOfLots}`, 15, summaryY + 6);
    pdf.text(`Lot Size: ${data.lotSize.toFixed(2)} m² (per lot)`, 15, summaryY + 12);

    const mapY = summaryY + 22;
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Subdivision Map', 15, mapY);

    const imgWidth = pageWidth - 30;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    const maxImgHeight = 100;

    let finalImgWidth = imgWidth;
    let finalImgHeight = imgHeight;

    if (imgHeight > maxImgHeight) {
      finalImgHeight = maxImgHeight;
      finalImgWidth = (canvas.width * maxImgHeight) / canvas.height;
    }

    pdf.addImage(imgData, 'PNG', 15, mapY + 5, finalImgWidth, finalImgHeight);

    const lotsTableY = mapY + finalImgHeight + 15;

    if (lotsTableY + 40 > pageHeight) {
      pdf.addPage();
      pdf.setFillColor(125, 29, 29);
      pdf.rect(0, 0, pageWidth, 15, 'F');
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Individual Lot Details', 15, 10);

      drawLotsTable(pdf, data.lots, 20);
    } else {
      pdf.setTextColor(0, 0, 0);
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Individual Lot Details', 15, lotsTableY);

      drawLotsTable(pdf, data.lots, lotsTableY + 8);
    }

    pdf.setFontSize(8);
    pdf.setTextColor(128, 128, 128);
    const footerY = pageHeight - 10;
    pdf.text('PARCELA - For conceptual planning purposes only', pageWidth / 2, footerY, { align: 'center' });

    pdf.save(`parcela-subdivision-${Date.now()}.pdf`);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    alert('Error exporting PDF. Please try again.');
  }
}

function drawLotsTable(pdf: any, lots: Lot[], startY: number) {
  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginLeft = 15;
  const columnWidth = (pageWidth - 30) / 2;

  pdf.setFillColor(240, 240, 240);
  pdf.rect(marginLeft, startY, columnWidth, 8, 'F');
  pdf.rect(marginLeft + columnWidth, startY, columnWidth, 8, 'F');

  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Lot Number', marginLeft + 3, startY + 5);
  pdf.text('Area (m²)', marginLeft + columnWidth + 3, startY + 5);

  pdf.setFont('helvetica', 'normal');

  let currentY = startY + 8;
  lots.forEach((lot, index) => {
    if (currentY + 8 > pageHeight - 20) {
      pdf.addPage();
      currentY = 20;

      pdf.setFillColor(240, 240, 240);
      pdf.rect(marginLeft, currentY, columnWidth, 8, 'F');
      pdf.rect(marginLeft + columnWidth, currentY, columnWidth, 8, 'F');

      pdf.setFont('helvetica', 'bold');
      pdf.text('Lot Number', marginLeft + 3, currentY + 5);
      pdf.text('Area (m²)', marginLeft + columnWidth + 3, currentY + 5);
      pdf.setFont('helvetica', 'normal');
      currentY += 8;
    }

    if (index % 2 === 0) {
      pdf.setFillColor(250, 250, 250);
      pdf.rect(marginLeft, currentY, pageWidth - 30, 7, 'F');
    }

    pdf.text(`Lot ${lot.lotNumber}`, marginLeft + 3, currentY + 5);
    pdf.text(lot.area.toFixed(2), marginLeft + columnWidth + 3, currentY + 5);
    currentY += 7;
  });
}
