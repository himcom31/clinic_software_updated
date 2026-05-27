/**
 * pdfGenerator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds jsPDF invoices matching the "template.pdf" layout:
 *   • Logo top-left  |  "Invoice" title top-right (orange)
 *   • From block (clinic) left  |  Invoice meta right
 *   • To block (patient) right
 *   • Orange-header items table
 *   • Subtotal / Discount / Total / Paid / Due summary
 *   • Footer band (teal, from existing design) with thank-you note
 * ─────────────────────────────────────────────────────────────────────────────
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ── Colour palette ─────────────────────────────────────────────────────── */
const ORANGE   = [230, 126, 14];   // #E67E0E  — template accent
const TEAL     = [15, 118, 110];   // #0F766E  — footer band (existing design)
const TEAL_ALT = [180, 255, 240];  // subtle tint for footer sub-text
const CREAM    = [255, 248, 235];  // alternating row tint (warm, matches orange)
const DARK     = [30,  30,  30];
const MID      = [80,  80,  80];
const LIGHT    = [140, 140, 140];
const RED      = [220, 38, 38];
const GREEN    = [22, 163, 74];

/* ── Helpers ────────────────────────────────────────────────────────────── */
export const safePdfStr = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/₹/g, 'Rs.')
    .replace(/[^\x00-\xFF]/g, '?');
};

export const fmtNum = (n) => {
  const num = Number(n || 0);
  const str = Math.abs(num).toFixed(2);
  const [intPart, decPart] = str.split('.');
  let result = '';
  const len = intPart.length;
  for (let i = 0; i < len; i++) {
    if (i > 0) {
      const fromRight = len - i;
      if (fromRight === 3 || (fromRight > 3 && (fromRight - 3) % 2 === 0)) {
        result += ',';
      }
    }
    result += intPart[i];
  }
  return (num < 0 ? '-' : '') + result + '.' + decPart;
};

const pdfRs = (n) => `Rs. ${fmtNum(n)}`;

const ddmmyyyy = (dateVal) => {
  const d = new Date(dateVal);
  return [
    d.getDate().toString().padStart(2, '0'),
    (d.getMonth() + 1).toString().padStart(2, '0'),
    d.getFullYear(),
  ].join('/');
};

const mmddyyyy = (dateVal) => {
  const d = new Date(dateVal);
  return [
    (d.getMonth() + 1).toString().padStart(2, '0'),
    d.getDate().toString().padStart(2, '0'),
    d.getFullYear(),
  ].join('.');
};

/* ── Main PDF builder ───────────────────────────────────────────────────── */
/**
 * @param {object} inv       — invoice data object
 * @param {object} clinicInfo — { clinicName, doctorName, email, mobile, address, logoBase64 }
 */
export const buildPDF = (inv, clinicInfo = {}) => {
  const doc = new jsPDF({ putOnlyUsedFonts: true, compress: true });
  doc.setFont('helvetica');

  const {
    clinicName  = 'Clinic',
    doctorName  = '',
    email       = '',
    mobile      = '',
    address     = '',
    logoBase64  = null,
  } = clinicInfo;

  const isRevisit  = inv.visitType === 'Revisit' || inv.isRevisit;
  const billDate   = new Date(inv.createdAt || inv.billingDate || Date.now());
  const dueDateStr = mmddyyyy(billDate);  // template shows MM.DD.YYYY

  /* ── PAGE MARGINS ── */
  const ML = 14;   // margin-left
  const MR = 196;  // margin-right (210 - 14)
  const W  = MR - ML;

  /* ═══════════════════════════════════════════════════════════════════════
     SECTION 1 — Header row: Logo left | "Invoice" right
  ═══════════════════════════════════════════════════════════════════════ */
  const LOGO_X = ML;
  const LOGO_Y = 10;
  const LOGO_W = 38;
  const LOGO_H = 28;

  if (logoBase64) {
    try {
      // Auto-detect format from the data URL prefix: "data:image/jpeg;base64,…"
      // jsPDF accepts 'JPEG', 'PNG', 'WEBP' — default to 'JPEG' if unrecognised
      const mimeMatch  = logoBase64.match(/^data:image\/(\w+);base64,/);
      const imgFormat  = mimeMatch
        ? mimeMatch[1].toUpperCase().replace('JPG', 'JPEG')
        : 'JPEG';
      doc.addImage(logoBase64, imgFormat, LOGO_X, LOGO_Y, LOGO_W, LOGO_H);
    } catch {
      // fallback placeholder box
      doc.setFillColor(220, 220, 220).rect(LOGO_X, LOGO_Y, LOGO_W, LOGO_H, 'F');
      doc.setTextColor(...LIGHT).setFontSize(8).setFont('helvetica', 'bold');
      doc.text('LOGO', LOGO_X + LOGO_W / 2, LOGO_Y + LOGO_H / 2 + 3, { align: 'center' });
    }
  } else {
    doc.setFillColor(220, 220, 220).rect(LOGO_X, LOGO_Y, LOGO_W, LOGO_H, 'F');
    doc.setTextColor(...LIGHT).setFontSize(8).setFont('helvetica', 'bold');
    doc.text('LOGO', LOGO_X + LOGO_W / 2, LOGO_Y + LOGO_H / 2 + 3, { align: 'center' });
  }

  // "Invoice" large title — right aligned, orange
  doc.setFontSize(34).setFont('helvetica', 'bold').setTextColor(...ORANGE);
  doc.text('Invoice', MR, 26, { align: 'right' });

  /* ═══════════════════════════════════════════════════════════════════════
     SECTION 2 — Invoice meta (right side, below title)
  ═══════════════════════════════════════════════════════════════════════ */
  const metaLabelX = 140;
  const metaValueX = MR;
  let metaY = 36;

  const metaRows = [
    ['Invoice no.:', safePdfStr(inv.invoiceNo || '001')],
    ['Invoice date:', ddmmyyyy(billDate)],
    ['Due:', dueDateStr],
  ];

  doc.setFontSize(8.5).setFont('helvetica', 'normal').setTextColor(...MID);
  metaRows.forEach(([label, value]) => {
    doc.text(label, metaLabelX, metaY);
    doc.setFont('helvetica', 'normal').setTextColor(...DARK);
    doc.text(value, metaValueX, metaY, { align: 'right' });
    doc.setTextColor(...MID);
    metaY += 6;
  });

  /* ═══════════════════════════════════════════════════════════════════════
     SECTION 3 — From / To blocks
  ═══════════════════════════════════════════════════════════════════════ */
  let addrY = 55;

  // "From" — left column
  doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(...DARK);
  doc.text('From', ML, addrY);
  addrY += 5;

  doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(...DARK);
  doc.text(safePdfStr(clinicName), ML, addrY);
  addrY += 6;

  const fromLines = [
    doctorName ? `Dr. ${safePdfStr(doctorName)}` : null,
    email      ? safePdfStr(email)               : null,
    mobile     ? safePdfStr(mobile)              : null,
    address    ? safePdfStr(address)             : null,
  ].filter(Boolean);

  doc.setFontSize(8.5).setFont('helvetica', 'normal').setTextColor(...MID);
  fromLines.forEach((line) => {
    doc.text(line, ML, addrY);
    addrY += 5;
  });

  // "To" — right column (aligned to right margin, vertically starts same as "From")
  let toY = 55;
  doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(...DARK);
  doc.text('To', MR, toY, { align: 'right' });
  toY += 5;

  doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(...DARK);
  doc.text(safePdfStr(inv.patientName || ''), MR, toY, { align: 'right' });
  toY += 6;

  const toLines = [
    inv.email       ? safePdfStr(inv.email)                       : null,
    inv.mobile      ? safePdfStr(inv.mobile)                      : null,
    inv.paymentMode ? `Payment: ${safePdfStr(inv.paymentMode)}`   : null,
    isRevisit ? 'Revisit Patient' : 'New Patient',
  ].filter(Boolean);

  doc.setFontSize(8.5).setFont('helvetica', 'normal').setTextColor(...MID);
  toLines.forEach((line) => {
    doc.text(line, MR, toY, { align: 'right' });
    toY += 5;
  });

  /* Revisit badge (orange pill, matches template's visual language) */
  if (isRevisit) {
    doc.setFillColor(...ORANGE).roundedRect(MR - 30, toY, 30, 6, 2, 2, 'F');
    doc.setTextColor(255).setFontSize(6.5).setFont('helvetica', 'bold');
    doc.text('REVISIT', MR - 15, toY + 4, { align: 'center' });
    toY += 10;
  }

  /* ── Appointment fee notice (if any) ── */
  let sectionY = Math.max(addrY, toY) + 8;

  if (inv.appointmentFee) {
    doc.setFillColor(255, 243, 220)
       .roundedRect(ML, sectionY - 4, W, 10, 2, 2, 'F');
    doc.setTextColor(...ORANGE).setFontSize(8).setFont('helvetica', 'bold');
    doc.text(
      `Appointment Fee Collected at Registration: ${pdfRs(inv.appointmentFee)}`,
      ML + 3, sectionY + 2.5
    );
    sectionY += 14;
  }

  /* ═══════════════════════════════════════════════════════════════════════
     SECTION 4 — Items table  (orange header, cream alternate rows)
  ═══════════════════════════════════════════════════════════════════════ */

autoTable(doc, {
  startY: sectionY,
  head: [['DESCRIPTION', 'RATE', 'QTY', 'AMOUNT']],
  body: (inv.items || []).map((item) => [
    safePdfStr(item.name),
    pdfRs(item.price),
    item.qty || 1,
    pdfRs(item.price * (item.qty || 1)),
  ]),
  headStyles: {
    fillColor: ORANGE,
    textColor: [255, 255, 255],
    fontStyle: 'bold',
    fontSize: 8.5,
    font: 'helvetica',
    cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
  },
  bodyStyles: {
    fontSize: 9,
    font: 'helvetica',
    textColor: DARK,
    cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
  },
  alternateRowStyles: { fillColor: CREAM },
  theme: 'plain',
  tableWidth: 182,
  margin: { left: ML, right: ML },
  columnStyles: {
    0: { cellWidth: 88,  halign: 'left'   },
    1: { cellWidth: 38,  halign: 'right'  },
    2: { cellWidth: 28,  halign: 'center' },
    3: { cellWidth: 36,  halign: 'right'  },
  },
  // ← THIS is the actual fix — forces alignment on header cells too
  didParseCell: (data) => {
    if (data.section === 'head') {
      const aligns = ['left', 'right', 'center', 'right'];
      data.cell.styles.halign = aligns[data.column.index];
    }
  },
});
  /* ═══════════════════════════════════════════════════════════════════════
     SECTION 5 — Summary (right-aligned totals block)
     Left: Payment instruction  |  Right: totals
  ═══════════════════════════════════════════════════════════════════════ */
  const tableEndY = doc.lastAutoTable.finalY;
  let sumY = tableEndY + 8;

  /* Thin separator line */
  doc.setDrawColor(210, 210, 210).setLineWidth(0.3).line(ML, sumY - 2, MR, sumY - 2);

  /* Payment instruction block (left) */
  doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(...DARK);
  doc.text('Payment instruction', ML, sumY + 5);
  doc.setFontSize(8).setFont('helvetica', 'normal').setTextColor(...MID);
  doc.text(
    `Mode: ${safePdfStr(inv.paymentMode || 'Cash')}`,
    ML, sumY + 11
  );

  /* Summary rows (right side) */
  const summaryLabelX = 138;
  const summaryValueX = MR;

  const summaryRows = [
    { label: 'Subtotal, INR:',   value: pdfRs(inv.subTotal),   bold: false, color: DARK   },
    { label: 'Discount, INR:',   value: pdfRs(inv.discount),   bold: false, color: MID    },
  ];

  doc.setFontSize(9);
  summaryRows.forEach(({ label, value, color }) => {
    doc.setFont('helvetica', 'normal').setTextColor(...MID);
    doc.text(label, summaryLabelX, sumY + 5);
    doc.setTextColor(...color);
    doc.text(value, summaryValueX, sumY + 5, { align: 'right' });
    sumY += 7;
  });

  /* Separator before Total */
  sumY += 2;
  doc.setDrawColor(210, 210, 210).line(summaryLabelX, sumY, MR, sumY);
  sumY += 5;

  /* Total row — bold, slightly larger */
  doc.setFontSize(10.5).setFont('helvetica', 'bold').setTextColor(...DARK);
  doc.text('Total :', summaryLabelX, sumY);
  doc.text(pdfRs(inv.grandTotal), summaryValueX, sumY, { align: 'right' });
  sumY += 8;

  /* Amount paid */
  doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(...MID);
  doc.text('Amount paid:', summaryLabelX, sumY);
  doc.setTextColor(...GREEN);
  doc.text(pdfRs(inv.paidAmount), summaryValueX, sumY, { align: 'right' });
  sumY += 10;

  /* Balance Due — highlighted row (cream background) */
  doc.setFillColor(255, 243, 220).rect(summaryLabelX - 4, sumY - 5, MR - summaryLabelX + 8, 11, 'F');
  doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(...DARK);
  doc.text('Balance Due:', summaryLabelX, sumY + 2);
  const dueColor = (inv.dueAmount || 0) > 0 ? RED : GREEN;
  doc.setTextColor(...dueColor);
  doc.text(pdfRs(inv.dueAmount || 0), summaryValueX, sumY + 2, { align: 'right' });
  sumY += 14;

  /* ═══════════════════════════════════════════════════════════════════════
     SECTION 6 — Footer band (teal, from existing design)
  ═══════════════════════════════════════════════════════════════════════ */
  const footerY = Math.max(sumY + 10, 262);

  /* Top line */
  doc.setDrawColor(...TEAL).setLineWidth(0.5).line(0, footerY, 210, footerY);

  /* Teal band */
  doc.setFillColor(...TEAL).rect(0, footerY, 210, 18, 'F');

  /* Thank-you text */
  doc.setFontSize(8.5).setFont('helvetica', 'normal').setTextColor(255, 255, 255);
  doc.text(
    'Thank you for choosing our clinic. Get well soon!',
    105, footerY + 7, { align: 'center' }
  );

  /* Generated-on timestamp */
  const now = new Date();
  const nowStr = [
    now.getDate().toString().padStart(2, '0'),
    (now.getMonth() + 1).toString().padStart(2, '0'),
    now.getFullYear(),
  ].join('/') + ' ' + [
    now.getHours().toString().padStart(2, '0'),
    now.getMinutes().toString().padStart(2, '0'),
  ].join(':');

  doc.setFontSize(7.5).setTextColor(...TEAL_ALT);
  doc.text(`Generated on ${nowStr}`, 105, footerY + 13, { align: 'center' });

  return doc;
};

/* ── Public helpers ─────────────────────────────────────────────────────── */

/** Open PDF in new tab and trigger print dialog */
export const openPDFInNewTab = (inv, clinicInfo) => {
  const doc     = buildPDF(inv, clinicInfo);
  const pdfBlob = doc.output('blob');
  const url     = URL.createObjectURL(pdfBlob);
  const win     = window.open(url, '_blank');
  if (win) {
    win.onload = () => { win.focus(); win.print(); };
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

/** Download PDF as a file */
export const downloadPDF = (inv, clinicInfo) => {
  const doc = buildPDF(inv, clinicInfo);
  doc.save(`Invoice_${inv.invoiceNo}.pdf`);
};

/** Format number for UI display */
export const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

/** Payment status badge helper */
export const paymentStatusBadge = (paid, grand) => {
  if (paid <= 0)    return { label: 'Unpaid',  cls: 'bg-red-50 text-red-600 border-red-200',         dot: 'bg-red-500'     };
  if (paid < grand) return { label: 'Partial', cls: 'bg-amber-50 text-amber-600 border-amber-200',   dot: 'bg-amber-500'   };
  return               { label: 'Paid',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
};