import jsPDF from 'jspdf';
import { toDataUrl } from './image';

export interface PatientPdfPayload {
  patientName?: string;
  emailBody: string;
  beforeImageUrl?: string;
  afterImageUrl?: string; // legacy single image
  afterImageUrls?: string[]; // preferred multi-image gallery
  clinicName?: string;
  clinicTagline?: string;
  clinicLogoUrl?: string;
  clinicContactLines?: string[];
  preparedBy?: string;
}

const lineHeight = 16;

const resolveFormat = (dataUrl: string): 'PNG' | 'JPEG' | 'WEBP' => {
  if (dataUrl.startsWith('data:image/png')) return 'PNG';
  if (dataUrl.startsWith('data:image/webp')) return 'WEBP';
  return 'JPEG';
};

export async function generatePatientPdf(payload: PatientPdfPayload): Promise<Blob> {
  const {
    patientName,
    emailBody,
    beforeImageUrl,
    afterImageUrl,
    afterImageUrls,
    clinicName,
    clinicTagline,
    clinicLogoUrl,
    clinicContactLines = [],
    preparedBy,
  } = payload;

  const doc = new jsPDF({ orientation: 'p', unit: 'pt', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 56;
  const marginY = 56;
  const footerY = pageHeight - marginY;

  let logoDataUrl: string | undefined;
  if (clinicLogoUrl) {
    try {
      logoDataUrl = await toDataUrl(clinicLogoUrl);
    } catch {
      logoDataUrl = undefined;
    }
  }

  const drawHeader = () => {
    let top = marginY;
    const logoSize = 64;
    if (logoDataUrl) {
      doc.addImage(logoDataUrl, resolveFormat(logoDataUrl), marginX, top, logoSize, logoSize, undefined, 'FAST');
    }

    const textX = logoDataUrl ? marginX + logoSize + 18 : marginX;
    let textY = marginY + 20;

    if (clinicName) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(20);
      doc.setTextColor(20);
      doc.text(clinicName, textX, textY);
      textY += 18;
    }

    if (clinicTagline) {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(11);
      doc.setTextColor(90);
      doc.text(clinicTagline, textX, textY);
      textY += 16;
    }

    if (clinicContactLines.length > 0) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      doc.setTextColor(110);
      clinicContactLines.forEach((line) => {
        doc.text(line, textX, textY);
        textY += 14;
      });
    }

    const headerBottom = Math.max(marginY + logoSize, textY - 8);
    doc.setDrawColor(210);
    doc.setLineWidth(0.8);
    doc.line(marginX, headerBottom + 12, pageWidth - marginX, headerBottom + 12);
    doc.setTextColor(0);
    return headerBottom + 32;
  };

  const drawFooter = () => {
    const contact = [clinicName, ...clinicContactLines].filter(Boolean).join(' • ');
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(120);
    doc.text(contact || 'Confidential consultation document', marginX, footerY);
    doc.setTextColor(0);
  };

  const writeBodyText = (startY: number) => {
    const maxWidth = pageWidth - marginX * 2;
    const lines = doc.splitTextToSize(emailBody, maxWidth);
    let cursorY = startY;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(12);
    doc.setTextColor(34);

    lines.forEach((line: string) => {
      if (cursorY + lineHeight > footerY - 30) {
        drawFooter();
        doc.addPage();
        const newStart = drawHeader();
        cursorY = newStart;
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(12);
        doc.setTextColor(34);
      }
      doc.text(line, marginX, cursorY);
      cursorY += lineHeight;
    });

    doc.setTextColor(0);
    return cursorY;
  };

  let bodyStart = drawHeader();

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(`Prepared for: ${patientName || 'Patient'}`, marginX, bodyStart);
  doc.text(`Prepared on: ${new Date().toLocaleDateString()}`, pageWidth - marginX, bodyStart, { align: 'right' });
  bodyStart += 24;

  if (preparedBy) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.text(`Clinician: ${preparedBy}`, marginX, bodyStart);
    bodyStart += 20;
  }

  writeBodyText(bodyStart + 4);
  drawFooter();

  const gallerySources: Array<{ label: string; url: string }> = [];
  if (beforeImageUrl) {
    gallerySources.push({ label: 'Before Consultation Image', url: beforeImageUrl });
  }

  const mergedAfterUrls = afterImageUrls && afterImageUrls.length > 0 ? afterImageUrls : afterImageUrl ? [afterImageUrl] : [];
  mergedAfterUrls.slice(0, 4).forEach((url, idx) => {
    gallerySources.push({ label: `AI Simulation ${idx + 1}`, url });
  });

  if (gallerySources.length > 0) {
    const galleryItems: Array<{ label: string; dataUrl: string }> = [];
    for (const source of gallerySources) {
      try {
        const dataUrl = await toDataUrl(source.url);
        galleryItems.push({ label: source.label, dataUrl });
      } catch {
        // Skip images that fail to load
      }
    }

    if (galleryItems.length > 0) {
      doc.addPage();
      let contentY = drawHeader();

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(16);
      doc.text('Treatment Simulation Preview', marginX, contentY);
      contentY += 28;

      const columns = 2;
      const gap = 24;
      const baseWidth = (pageWidth - marginX * 2 - gap * (columns - 1)) / columns;
      const aspectRatio = 4 / 3; // portrait orientation
      const baseHeight = baseWidth * aspectRatio;
      const rows = Math.ceil(galleryItems.length / columns);
      const labelSpace = 34;
      const availableHeight = footerY - contentY - 48;
      const availableForImages = availableHeight - rows * labelSpace - (rows - 1) * gap;
      const totalBaseHeight = rows * baseHeight;
      const scale = totalBaseHeight > 0 && availableForImages < totalBaseHeight
        ? Math.max(0.55, availableForImages / totalBaseHeight)
        : 1;

      const itemWidth = baseWidth * scale;
      const itemHeight = baseHeight * scale;
      const totalGalleryWidth = columns * itemWidth + (columns - 1) * gap;
      const galleryStartX = marginX + Math.max(0, (pageWidth - marginX * 2 - totalGalleryWidth) / 2);

      doc.setFont('helvetica', 'normal');
      doc.setTextColor(0);

      galleryItems.forEach((item, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);
        const x = galleryStartX + column * (itemWidth + gap);
        const y = contentY + row * (itemHeight + labelSpace + gap);

        doc.setDrawColor(210);
        doc.setLineWidth(1);
        doc.roundedRect(x, y, itemWidth, itemHeight + labelSpace, 10, 10);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.text(item.label, x + 12, y + 20);

        const imageHeight = itemHeight - 18;
        const imageWidth = itemWidth - 24;
        doc.addImage(
          item.dataUrl,
          resolveFormat(item.dataUrl),
          x + 12,
          y + labelSpace - 4,
          imageWidth,
          imageHeight,
          undefined,
          'FAST'
        );
      });

      drawFooter();
    }
  }

  const blob = doc.output('blob');
  return blob;
}
