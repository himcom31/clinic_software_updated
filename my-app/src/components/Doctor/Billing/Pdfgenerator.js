/**
 * pdfGenerator.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Builds jsPDF invoices matching "Docedge" template.pdf layout EXACTLY:
 *   • Thin navy top strip
 *   • Circle logo (cross icon) + Clinic name + tagline  |  "INVOICE" title (right, navy, blue underline)
 *   • Invoice No. / Invoice Date (right)
 *   • Address / Phone / Email (left, with bullet icons)
 *   • BILL TO (left) | CONSULTATION DETAILS (right)
 *   • Navy-header items table: # | DESCRIPTION | QTY | UNIT PRICE | AMOUNT (₹)
 *   • NOTES (left) | Subtotal / Discount / Tax / TOTAL AMOUNT box (right)
 *   • Amount in Words
 *   • Navy footer band: "THANK YOU FOR YOUR TRUST IN US" + "We Wish You Good Health!"
 * ─────────────────────────────────────────────────────────────────────────────
 */

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

/* ── Colour palette (matched to template) ──────────────────────────────── */
const NAVY      = [22, 41, 74];     // #16294A — headers, footer band, titles
const NAVY_DARK = [15, 28, 51];     // #0F1C33 — very top strip
const BLUE      = [41, 128, 195];   // #2980C3 — icons, underline accent
const GRAY      = [110, 118, 130];  // secondary text
const LIGHT_GRAY= [245, 247, 250];  // alternating row tint
const WHITE     = [255, 255, 255];
const RED       = [200, 40, 40];    // discount
const TOTAL_BG  = [232, 242, 250];  // light blue highlight for total row

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

const ddmmyyyyStr = (dateVal) => {
  const d = new Date(dateVal);
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d.getDate().toString().padStart(2, '0')} ${months[d.getMonth()]} ${d.getFullYear()}`;
};

/* ── Number → Words (Indian numbering system) ──────────────────────────── */
const ONES = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
  'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen',
  'Eighteen', 'Nineteen'];
const TENS = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

function twoDigits(n) {
  if (n < 20) return ONES[n];
  const t = Math.floor(n / 10), o = n % 10;
  return TENS[t] + (o ? ' ' + ONES[o] : '');
}
function threeDigits(n) {
  const h = Math.floor(n / 100), r = n % 100;
  let out = '';
  if (h) out += ONES[h] + ' Hundred' + (r ? ' ' : '');
  if (r) out += twoDigits(r);
  return out;
}
export const numberToWordsINR = (amount) => {
  let num = Math.round(Number(amount || 0));
  if (num === 0) return 'Zero Only';
  const crore = Math.floor(num / 10000000); num %= 10000000;
  const lakh  = Math.floor(num / 100000);    num %= 100000;
  const thousand = Math.floor(num / 1000);   num %= 1000;
  const hundred = num;

  let parts = [];
  if (crore)    parts.push(threeDigits(crore) + ' Crore');
  if (lakh)     parts.push(threeDigits(lakh) + ' Lakh');
  if (thousand) parts.push(threeDigits(thousand) + ' Thousand');
  if (hundred)  parts.push(threeDigits(hundred));
  return parts.join(' ').trim() + ' Only';
};

/* ── Small decorative shapes (icons are hand-drawn, no external assets) ── */
function drawHeart(doc, cx, cy, size, color) {
  doc.setFillColor(...color);
  const r = size / 2.6;
  doc.circle(cx - r * 0.6, cy - r * 0.3, r, 'F');
  doc.circle(cx + r * 0.6, cy - r * 0.3, r, 'F');
  doc.triangle(
    cx - r * 1.5, cy - r * 0.1,
    cx + r * 1.5, cy - r * 0.1,
    cx, cy + r * 1.6,
    'F'
  );
}

function drawLogo(doc, x, y, d, logoBase64) {
  if (logoBase64) {
    try {
      const mimeMatch = logoBase64.match(/^data:image\/(\w+);base64,/);
      const imgFormat = mimeMatch ? mimeMatch[1].toUpperCase().replace('JPG', 'JPEG') : 'JPEG';
      doc.addImage(logoBase64, imgFormat, x, y, d, d);
      return;
    } catch {
      /* fall through to drawn placeholder */
    }
  }
  // Circle badge with a cross — matches the template's default logo mark
  const cx = x + d / 2, cy = y + d / 2, r = d / 2;
  doc.setFillColor(230, 236, 244).circle(cx, cy, r, 'F');
  doc.setFillColor(...NAVY);
  const armW = d * 0.16, armL = d * 0.52;
  doc.roundedRect(cx - armW / 2, cy - armL / 2, armW, armL, 0.6, 0.6, 'F');
  doc.roundedRect(cx - armL / 2, cy - armW / 2, armL, armW, 0.6, 0.6, 'F');
}

function bulletLine(doc, x, y, text, color = BLUE) {
  doc.setFillColor(...color).circle(x + 1, y - 1.3, 1, 'F');
  doc.text(text, x + 5, y);
}

/* ═══════════════════════════════════════════════════════════════════════
   MAIN PDF BUILDER
   @param {object} inv        — invoice data
   @param {object} clinicInfo — { clinicName, tagline, doctorName, email, mobile, address, logoBase64 }
═══════════════════════════════════════════════════════════════════════ */
export const buildPDF = (inv, clinicInfo = {}) => {
  const doc = new jsPDF({ putOnlyUsedFonts: true, compress: true });
  doc.setFont('helvetica');

  const {
    clinicName = 'Clinic',
    degree = '', 
    email      = '',
    mobile     = '',
    address    = '',
    logoBase64 = null,
  } = clinicInfo;

  const isRevisit = inv.visitType === 'Revisit' || inv.isRevisit;
  const billDate  = new Date(inv.createdAt || inv.billingDate || Date.now());
  const visitDate = new Date(inv.visitDate || billDate);

  const ML = 14, MR = 196, W = MR - ML;

  /* ── Top navy strip ── */
  doc.setFillColor(...NAVY_DARK).rect(0, 0, 210, 4, 'F');

  /* ═══ SECTION 1 — Logo + clinic name (left) | INVOICE title (right) ═══ */
  drawLogo(doc, ML, 12, 34, logoBase64);

  

  
  doc.setFontSize(26).setFont('helvetica', 'bold').setTextColor(...NAVY);
  doc.text('INVOICE', MR, 24, { align: 'right' });
  doc.setDrawColor(...BLUE).setLineWidth(1);
  doc.line(MR - 42, 27, MR, 27);

  doc.setFontSize(8.5).setFont('helvetica', 'normal').setTextColor(...GRAY);
  doc.text('Invoice No.', MR - 42, 35);
  doc.setFont('helvetica', 'bold').setTextColor(...NAVY);
  doc.text(safePdfStr(inv.invoiceNo || '001'), MR, 35, { align: 'right' });

  doc.setFont('helvetica', 'normal').setTextColor(...GRAY);
  doc.text('Invoice Date', MR - 42, 41);
  doc.setFont('helvetica', 'bold').setTextColor(...NAVY);
  doc.text(ddmmyyyyStr(billDate), MR, 41, { align: 'right' });

  /* ═══ SECTION 2 — Address / Phone / Email ═══ */
  let contactY = 54;
  doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(...NAVY);
  if (address) { bulletLine(doc, ML, contactY, safePdfStr(address)); contactY += 6; }
  if (mobile)  { bulletLine(doc, ML, contactY, safePdfStr(mobile));  contactY += 6; }
  if (email)   { bulletLine(doc, ML, contactY, safePdfStr(email));   contactY += 6; }

  /* Separator */
  let sepY = contactY + 4;
  doc.setDrawColor(...BLUE).setLineWidth(0.4).line(ML, sepY, MR, sepY);

  /* ═══ SECTION 3 — BILL TO | CONSULTATION DETAILS ═══ */
  let colY = sepY + 10;

  doc.setFontSize(13).setFont('helvetica', 'bold').setTextColor(...NAVY);
  doc.text('BILL TO', ML, colY);
  doc.text('Billed From', MR, colY, { align: 'right' });
  colY += 7;

  doc.setFontSize(11.5).setFont('helvetica', 'bold').setTextColor(...NAVY);
  doc.text(safePdfStr(inv.patientName || ''), ML, colY);

  doc.setFontSize(11.5).setFont('helvetica', 'bold').setTextColor(...NAVY);
doc.text(safePdfStr(clinicName || inv.clinicName || ''), MR, colY, { align: 'right' });
colY += 6;

  doc.setFontSize(9);
  const docLabel = 'Doctor Name : ';
  const docValue = degree ? ` ${safePdfStr(degree)}` : '';
  doc.setFont('helvetica', 'bold');
  const docValueW = doc.getTextWidth(docValue);
  doc.setFont('helvetica', 'bold').setTextColor(...GRAY);
  const docLabelW = doc.getTextWidth(docLabel);
  const docLabelX = MR - docValueW - docLabelW;
  doc.setTextColor(...GRAY);
  doc.text(docLabel, docLabelX, colY - 0.5);
  doc.setFont('helvetica', 'bold').setTextColor(...NAVY);
  doc.text(docValue, MR, colY - 0.5, { align: 'right' });
  colY += 6;

  doc.setFontSize(9).setFont('helvetica', 'bold').setTextColor(...GRAY);
doc.text('Mobile', ML, colY);
doc.setFont('helvetica', 'bold').setTextColor(...NAVY);
doc.text(`: ${safePdfStr(inv.mobile || '')}`, ML + 22, colY);
colY += 6;

  doc.setFont('helvetica', 'bold').setTextColor(...GRAY);
  doc.text('Visit Type', ML, colY);
  doc.setFont('helvetica', 'bold').setTextColor(...NAVY);
  doc.text(isRevisit ? ': Revisit' : ': New', ML + 22, colY);
  colY += 6;

  doc.setFont('helvetica', 'bold').setTextColor(...GRAY);
  doc.text('Visit Date', ML, colY);
  doc.setFont('helvetica', 'bold').setTextColor(...NAVY);
  doc.text(': ' + ddmmyyyyStr(visitDate), ML + 22, colY);
  colY += 10;

  /* ═══ SECTION 4 — Items table ═══ */
  const items = inv.items || [];
  autoTable(doc, {
    startY: colY,
    head: [['#', 'DESCRIPTION', 'QTY', 'UNIT PRICE', 'AMOUNT (Rs.)']],
    body: items.map((item, i) => [
      String(i + 1),
      safePdfStr(item.name),
      item.qtyLabel ? safePdfStr(item.qtyLabel) : String(item.qty || 1),
      fmtNum(item.price),
      fmtNum(item.price * (item.qty || 1)),
    ]),
    headStyles: {
      fillColor: NAVY,
      textColor: WHITE,
      fontStyle: 'bold',
      fontSize: 8.5,
      font: 'helvetica',
      cellPadding: { top: 4, bottom: 4, left: 4, right: 4 },
    },
    bodyStyles: {
      fontSize: 9,
      font: 'helvetica',
      textColor: NAVY,
      cellPadding: { top: 3.5, bottom: 3.5, left: 4, right: 4 },
    },
    alternateRowStyles: { fillColor: LIGHT_GRAY },
    theme: 'plain',
    tableWidth: W,
    margin: { left: ML, right: ML },
    columnStyles: {
      0: { cellWidth: 10,  halign: 'left'   },
      1: { cellWidth: 76,  halign: 'left'   },
      2: { cellWidth: 28,  halign: 'center' },
      3: { cellWidth: 32,  halign: 'right'  },
      4: { cellWidth: 36,  halign: 'right'  },
    },
    didParseCell: (data) => {
      if (data.section === 'head') {
        const aligns = ['left', 'left', 'center', 'right', 'right'];
        data.cell.styles.halign = aligns[data.column.index];
      }
    },
  });

  /* ═══ SECTION 5 — NOTES (left) | Summary box (right) ═══ */
  const tableEndY = doc.lastAutoTable.finalY;
  let notesY = tableEndY + 12;

  doc.setFontSize(10).setFont('helvetica', 'bold').setTextColor(...NAVY);
  doc.text('NOTES', ML, notesY);
  notesY += 6;

  const notes = inv.notes && inv.notes.length ? inv.notes : [
    'Please carry this invoice for your next visit.',
    'Medicines once sold will not be returned.',
    'Report any adverse reaction to medication immediately.',
    `Thank you for choosing ${safePdfStr(clinicName)}.`,
  ];

  doc.setFontSize(8.2).setFont('helvetica', 'normal').setTextColor(...GRAY);
  const noteWidth = 100;
  notes.forEach((n) => {
    const lines = doc.splitTextToSize(`•  ${safePdfStr(n)}`, noteWidth);
    doc.text(lines, ML, notesY);
    notesY += 4.6 * lines.length;
  });

  /* Summary box (right) */
  const subTotal = inv.subTotal != null ? inv.subTotal
    : items.reduce((s, it) => s + it.price * (it.qty || 1), 0);
  const discountAmt = inv.discountAmount != null ? inv.discountAmount
    : (inv.discount ? subTotal * (inv.discount / 100) : 0);
  const taxPercent = inv.taxPercent != null ? inv.taxPercent : 0;
  const taxAmt = inv.taxAmount != null ? inv.taxAmount
    : (subTotal - discountAmt) * (taxPercent / 100);
  const grandTotal = inv.grandTotal != null ? inv.grandTotal
    : subTotal - discountAmt + taxAmt;

  const sLabelX = 138, sValueX = MR;
  let sumY = tableEndY + 12;

  doc.setFontSize(9);
  const rows = [
    ['Subtotal', pdfRs(subTotal), NAVY],
    ['Discount', discountAmt ? `- Rs. ${fmtNum(discountAmt)}` : 'Rs. 0.00', RED],
  ];
  if (taxPercent || taxAmt) {
    rows.push([`Tax (${fmtNum(taxPercent).replace(/\.00$/, '')}%)`, pdfRs(taxAmt), NAVY]);
  }

  rows.forEach(([label, value, color]) => {
    doc.setFont('helvetica', 'normal').setTextColor(...GRAY);
    doc.text(label, sLabelX, sumY);
    doc.setFont('helvetica', 'normal').setTextColor(...color);
    doc.text(value, sValueX, sumY, { align: 'right' });
    sumY += 6.5;
  });

  sumY += 2;
  doc.setFillColor(...TOTAL_BG).rect(sLabelX - 4, sumY - 5, MR - sLabelX + 8, 11, 'F');
  doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(...NAVY);
  doc.text('TOTAL AMOUNT', sLabelX, sumY + 2);
  doc.text(pdfRs(grandTotal), sValueX, sumY + 2, { align: 'right' });
  sumY += 10;

  const paidAmount = inv.paidAmount != null ? inv.paidAmount : 0;
  const dueAmount  = inv.dueAmount != null ? inv.dueAmount : Math.max(grandTotal - paidAmount, 0);

  doc.setFontSize(9).setFont('helvetica', 'normal').setTextColor(...GRAY);
  doc.text('Amount paid', sLabelX, sumY);
  doc.setFont('helvetica', 'bold').setTextColor(22, 163, 74);
  doc.text(pdfRs(paidAmount), sValueX, sumY, { align: 'right' });
  sumY += 7;

  doc.setFont('helvetica', 'normal').setTextColor(...GRAY);
  doc.text('Balance Due', sLabelX, sumY);
  const dueColor = dueAmount > 0 ? RED : [22, 163, 74];
  doc.setFont('helvetica', 'bold').setTextColor(...dueColor);
  doc.text(pdfRs(dueAmount), sValueX, sumY, { align: 'right' });
  sumY += 10;

  doc.setFontSize(8).setFont('helvetica', 'bold').setTextColor(...NAVY);
  doc.text('Amount in Words:', sLabelX, sumY);
  sumY += 5;
  doc.setFont('helvetica', 'italic').setTextColor(...GRAY);
  const wordsLines = doc.splitTextToSize(numberToWordsINR(grandTotal), MR - sLabelX);
  doc.text(wordsLines, sLabelX, sumY);
  sumY += 4.6 * wordsLines.length;

  /* ═══ SECTION 6 — Footer band (navy) ═══ */
  const footerH = 20;
  const footerY = Math.max(notesY, sumY) + 12;
  const bandTop = Math.max(footerY, 262);

  doc.setFillColor(...NAVY).rect(0, bandTop, 210, footerH, 'F');

  doc.setFontSize(11).setFont('helvetica', 'bold').setTextColor(255, 255, 255);
  const thankYouText = 'THANK YOU FOR YOUR TRUST IN US';
  const thankYouW = doc.getTextWidth(thankYouText);
  doc.text(thankYouText, 105, bandTop + 11, { align: 'center' });

  const heartGap = 8;
  drawHeart(doc, 105 - thankYouW / 2 - heartGap, bandTop + 9, 4, [235, 245, 255]);
  drawHeart(doc, 105 + thankYouW / 2 + heartGap, bandTop + 9, 4, [235, 245, 255]);

  doc.setFontSize(8.5).setFont('helvetica', 'normal').setTextColor(210, 224, 240);
  doc.text('We Wish You Good Health!', 105, bandTop + 17, { align: 'center' });

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