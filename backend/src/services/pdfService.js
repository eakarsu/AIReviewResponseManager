const PDFDocument = require('pdfkit');

const generatePDF = (title, columns, rows, res) => {
  const doc = new PDFDocument({ margin: 40, size: 'A4', layout: 'landscape' });

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="${title.replace(/\s+/g, '_')}.pdf"`);
  doc.pipe(res);

  // Title
  doc.fontSize(18).font('Helvetica-Bold').text(title, { align: 'center' });
  doc.moveDown(0.5);
  doc.fontSize(10).font('Helvetica').text(`Generated: ${new Date().toLocaleString()}`, { align: 'center' });
  doc.moveDown(1);

  // Table
  const tableTop = doc.y;
  const colWidth = (doc.page.width - 80) / columns.length;

  // Header row
  doc.font('Helvetica-Bold').fontSize(9);
  columns.forEach((col, i) => {
    doc.text(col.label || col.key, 40 + i * colWidth, tableTop, {
      width: colWidth - 5,
      ellipsis: true
    });
  });

  doc.moveTo(40, tableTop + 15).lineTo(doc.page.width - 40, tableTop + 15).stroke();

  // Data rows
  doc.font('Helvetica').fontSize(8);
  let y = tableTop + 22;

  rows.forEach((row) => {
    if (y > doc.page.height - 60) {
      doc.addPage();
      y = 40;
    }

    columns.forEach((col, i) => {
      let value = row[col.key];
      if (value === null || value === undefined) value = '';
      if (Array.isArray(value)) value = value.join(', ');
      if (typeof value === 'object') value = JSON.stringify(value);
      value = String(value).substring(0, 50);

      doc.text(value, 40 + i * colWidth, y, {
        width: colWidth - 5,
        ellipsis: true
      });
    });

    y += 18;
  });

  doc.end();
};

module.exports = { generatePDF };
