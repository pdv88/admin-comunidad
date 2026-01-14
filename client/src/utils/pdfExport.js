import { jsPDF } from 'jspdf';

/**
 * Generates and downloads a branded PDF for a single report
 */
export const exportReportToPDF = async (report, notes = [], images = [], t, logoUrl = null, brandColor = '#3B82F6') => {
    if (!report) return;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pageWidth - (margin * 2);
    let yPosition = 0; // Starts at 0 for header

    // --- Helpers ---
    const hexToRgb = (hex) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 59, g: 130, b: 246 }; // Default Blue
    };

    const safeText = (text) => text === null || text === undefined ? '' : String(text);

    // Check new page
    const checkNewPage = (neededSpace) => {
        if (yPosition + neededSpace > pageHeight - margin) {
            doc.addPage();
            yPosition = margin + 10; // Reset margin for new page
        }
    };

    // Wrapped Text
    const addWrappedText = (text, x, y, maxWidth, fontSize = 10, textColor = [75, 85, 99], fontStyle = 'normal') => {
        doc.setFontSize(fontSize);
        doc.setFont('helvetica', fontStyle);
        doc.setTextColor(...textColor);

        const lines = doc.splitTextToSize(safeText(text), maxWidth);
        lines.forEach((line, index) => {
            // Check page break for inner lines
            if (y + (index * (fontSize * 0.5)) > pageHeight - margin) { // rough line height approx
                doc.addPage();
                y = margin;
            }
            doc.text(line, x, y + (index * (fontSize * 0.5))); // compact line height
        });
        return y + (lines.length * (fontSize * 0.5));
    };

    // Helper to get base64
    const getBase64FromUrl = async (url) => {
        try {
            const res = await fetch(url);
            const blob = await res.blob();
            return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
            });
        } catch (error) {
            return null;
        }
    };

    const primaryColor = hexToRgb(brandColor);

    // --- Header Section ---
    // Clean Minimalist Header
    // No background rect, just white page

    // Logo (Top Right) - No container needed on white bg
    if (logoUrl) {
        try {
            const logoBase64 = await getBase64FromUrl(logoUrl);
            if (logoBase64) {
                // Position: Top Right
                doc.addImage(logoBase64, 'PNG', pageWidth - margin - 20, 10, 20, 20);
            }
        } catch (e) { }
    }

    // Report Title (Dark Gray/Black)
    doc.setTextColor(31, 41, 55); // Dark Gray
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');

    // Ensure title wraps if it's too long (avoiding logo area)
    const titleMaxWidth = logoUrl ? contentWidth - 30 : contentWidth;
    doc.splitTextToSize(safeText(report.title), titleMaxWidth).forEach((line, i) => {
        doc.text(line, margin, 20 + (i * 10));
    });

    // Metadata in Header (Date)
    doc.setTextColor(107, 114, 128); // lighter gray
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text(`${t ? t('reports.date', 'Date') : 'Date'}: ${new Date(report.created_at).toLocaleDateString()}`, margin, 42);

    // Separator Line (in Brand Color)
    doc.setDrawColor(primaryColor.r, primaryColor.g, primaryColor.b);
    doc.setLineWidth(1);
    doc.line(margin, 48, pageWidth - margin, 48);

    yPosition = 60; // Start content below separator

    // --- Status & Category Badges ---
    const drawBadge = (text, x, y, color) => {
        doc.setFillColor(color.r, color.g, color.b);
        doc.setDrawColor(color.r, color.g, color.b);

        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        const textWidth = doc.getTextWidth(text);

        // Background Pill
        doc.roundedRect(x, y - 4, textWidth + 10, 7, 2, 2, 'F');

        // Text (White)
        doc.setTextColor(255, 255, 255);
        doc.text(text, x + 5, y + 1); // Centered vertically roughly

        return x + textWidth + 15; // Return next X
    };

    const statusText = (t ? t(`reports.status.${report.status}`, report.status) : report.status).toUpperCase();
    const categoryText = t ? t(`reports.categories.${report.category}`, report.category) : report.category;

    const getStatusColorStruct = (status) => {
        switch (status) {
            case 'pending': return { r: 234, g: 179, b: 8 };
            case 'in_progress': return { r: 59, g: 130, b: 246 };
            case 'resolved': return { r: 34, g: 197, b: 94 };
            case 'rejected': return { r: 239, g: 68, b: 68 };
            default: return { r: 107, g: 114, b: 128 };
        }
    };

    let currentX = margin;
    currentX = drawBadge(statusText, currentX, yPosition, getStatusColorStruct(report.status));
    currentX = drawBadge(safeText(categoryText), currentX, yPosition, { r: 107, g: 114, b: 128 }); // Gray for category

    yPosition += 15;

    // --- Info Grid (Reporter & Scope) ---
    doc.setFontSize(10);
    doc.setTextColor(75, 85, 99); // Dark Gray

    // Reporter
    const reporterName = report.profiles?.full_name || 'Unknown';
    doc.setFont('helvetica', 'bold');
    doc.text(`${t ? t('reports.reporter', 'Reporter') : 'Reporter'}:`, margin, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(reporterName, margin + 25, yPosition); // Alignment

    // Scope (Right side)
    let scopeLabel = t ? t('reports.scope_label', 'Scope') : 'Scope';
    let scopeVal = t ? t('reports.scope.community', 'Community') : 'Community';
    if (report.scope === 'block') scopeVal = `${report.blocks?.name || ''}`;
    if (report.scope === 'unit') scopeVal = `${report.blocks?.name || ''} - ${report.units?.unit_number || ''}`;

    doc.setFont('helvetica', 'bold');
    doc.text(`${scopeLabel}:`, margin + 80, yPosition);
    doc.setFont('helvetica', 'normal');
    doc.text(scopeVal, margin + 100, yPosition);

    yPosition += 15;

    // --- Description Box ---
    doc.setFillColor(243, 244, 246); // Light Gray
    doc.setDrawColor(229, 231, 235);
    // Draw background rect (calculate height first? Hard content flow in jsPDF is tricky)
    // We'll just draw a header for it or use simple text flow.
    // Let's draw a subheading with a line.

    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b); // Brand color title
    doc.text(t ? t('reports.description', 'Description') : 'Description', margin, yPosition);

    doc.setDrawColor(229, 231, 235);
    doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
    yPosition += 8;

    // Description Body
    // doc.rect(margin - 2, yPosition - 5, contentWidth + 4, 30, 'F'); // Background? Maybe too complex to predict height
    yPosition = addWrappedText(report.description || 'No description.', margin, yPosition, contentWidth, 10, [55, 65, 81], 'normal');
    yPosition += 15;

    // --- Notes Section ---
    if (notes && notes.length > 0) {
        checkNewPage(40);

        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
        doc.text(`${t ? t('reports.notes', 'Notes & Comments') : 'Notes & Comments'}`, margin, yPosition);
        doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
        yPosition += 10;

        notes.forEach((note, i) => {
            checkNewPage(30);

            // Note Header
            doc.setFontSize(9);
            doc.setFont('helvetica', 'bold');
            doc.setTextColor(31, 41, 55);
            doc.text(safeText(note.profiles?.full_name || 'System'), margin, yPosition);

            // Timestamp
            doc.setFont('helvetica', 'normal');
            doc.setTextColor(156, 163, 175);
            doc.text(new Date(note.created_at).toLocaleString(), pageWidth - margin - 50, yPosition);
            yPosition += 5;

            // Note Body
            // Add a subtle left border line
            doc.setDrawColor(209, 213, 219);
            doc.setLineWidth(1);
            // doc.line(margin, yPosition, margin, yPosition + 10); // Vertical line? Hard to anticipate height

            yPosition = addWrappedText(safeText(note.content), margin + 4, yPosition, contentWidth - 4, 10, [75, 85, 99]);
            doc.setLineWidth(0.5); // Reset
            yPosition += 8;
        });
        yPosition += 5;
    }

    // --- Images ---
    const allImages = [];
    if (report.image_url) allImages.push({ url: report.image_url, type: 'Primary' });
    if (images) images.forEach(img => allImages.push({ url: img.url, type: 'Gallery' }));

    if (allImages.length > 0) {
        checkNewPage(60);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(primaryColor.r, primaryColor.g, primaryColor.b);
        doc.text(t ? t('reports.images', 'Attached Images') : 'Attached Images', margin, yPosition);
        doc.line(margin, yPosition + 2, pageWidth - margin, yPosition + 2);
        yPosition += 10;

        const imgW = 80;
        const imgH = 60;
        const gap = 10;

        for (let i = 0; i < allImages.length; i++) {
            const col = i % 2;
            const row = Math.floor(i / 2);

            // Check page break on new row
            if (col === 0 && row > 0) {
                if (yPosition + imgH + 10 > pageHeight - margin) {
                    doc.addPage();
                    yPosition = margin;
                } else {
                    // Only increment Y if not the first row (logic handled inside loop? No, simplified:)
                }
            }
            // Use calculated positions based on a 'currentRowY'
            // To handle page breaks correctly, we should track yPosition dynamically
        }

        // Simpler loop
        let currentY = yPosition;
        for (let i = 0; i < allImages.length; i++) {
            // If even, we are at start of row. Check space.
            if (i % 2 === 0) {
                if (currentY + imgH + 20 > pageHeight - margin) {
                    doc.addPage();
                    currentY = margin;
                }
            }

            const x = (i % 2 === 0) ? margin : margin + imgW + gap;

            try {
                const imgData = await getBase64FromUrl(allImages[i].url);
                if (imgData) {
                    const format = imgData.startsWith('data:image/png') ? 'PNG' : 'JPEG';
                    // Draw Image
                    doc.addImage(imgData, format, x, currentY, imgW, imgH);
                    // Border
                    doc.setDrawColor(229, 231, 235);
                    doc.rect(x, currentY, imgW, imgH);
                    // Label
                    doc.setFontSize(8);
                    doc.setFont('helvetica', 'italic');
                    doc.setTextColor(107, 114, 128);
                    doc.text(allImages[i].type, x, currentY + imgH + 5);
                }
            } catch (e) {
                doc.rect(x, currentY, imgW, imgH);
                doc.text('Image Error', x + 5, currentY + 30);
            }

            // If odd (end of row) or last item, increment Y
            if (i % 2 !== 0 || i === allImages.length - 1) {
                if (i % 2 !== 0) currentY += imgH + 15; // Move down only after 2nd item
            }
        }
    }

    // --- Footer ---
    const totalPages = doc.internal.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(156, 163, 175);
        doc.text(
            `${t ? t('reports.generated_on', 'Generated on') : 'Generated on'}: ${new Date().toLocaleString()} | ${t ? t('common.page', 'Page') : 'Page'} ${i} / ${totalPages}`,
            margin,
            pageHeight - 10
        );
    }

    // Save
    const safeTitle = (report.title || 'report').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30);
    const filename = `report_${safeTitle}_${new Date().toISOString().split('T')[0]}.pdf`;

    try {
        const blob = doc.output('blob');
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    } catch (e) {
        doc.save(filename);
    }
};
