/**
 * InvoiceTemplate.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure HTML/CSS invoice template — renders the exact same layout as the
 * Nirogyam 828×468 design.
 *
 * Usage (same as before, drop-in for pdfGenerator.js):
 *   import { buildPDF, downloadPDF, openPDFInNewTab } from './InvoiceTemplate';
 *
 * How it works:
 *   buildPDF(inv, clinicInfo) → renders hidden <div> → html2pdf → jsPDF doc
 *   All other helpers (downloadPDF, openPDFInNewTab, fmt, paymentStatusBadge)
 *   keep EXACTLY the same signature as pdfGenerator.js — BillingModule.jsx
 *   needs zero changes.
 *
 * Install dependency (if not already):
 *   npm install html2pdf.js
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import html2pdf from 'html2pdf.js';

/* ─────────────────────────────────────────────────────────────────────────────
   HELPERS  (same exports as pdfGenerator.js)
───────────────────────────────────────────────────────────────────────────── */
export const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

export const fmtNum = (n) => {
  const num = Number(n || 0);
  const str = Math.abs(num).toFixed(2);
  const [intPart, decPart] = str.split('.');
  let result = '';
  const len = intPart.length;
  for (let i = 0; i < len; i++) {
    if (i > 0) {
      const fromRight = len - i;
      if (fromRight === 3 || (fromRight > 3 && (fromRight - 3) % 2 === 0)) result += ',';
    }
    result += intPart[i];
  }
  return (num < 0 ? '-' : '') + result + '.' + decPart;
};

export const safePdfStr = (str) => {
  if (!str) return '';
  return String(str).replace(/[^\x00-\xFF]/g, '?');
};

const ddmmmyyyy = (dateVal) => {
  const d = dateVal ? new Date(dateVal) : new Date();
  const M = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${String(d.getDate()).padStart(2,'0')} ${M[d.getMonth()]} ${d.getFullYear()}`;
};

/* Number → Words (Indian system) */
const ONES = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine',
  'Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
const TENS = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];
const _two  = (n) => n < 20 ? ONES[n] : TENS[Math.floor(n/10)] + (n%10 ? ' '+ONES[n%10] : '');
const _three= (n) => {
  const h = Math.floor(n/100), r = n%100;
  return (h ? ONES[h]+' Hundred'+(r?' ':'') : '') + (r ? _two(r) : '');
};
export const numberToWordsINR = (amount) => {
  let num = Math.round(Number(amount || 0));
  if (!num) return 'Zero Only';
  const cr = Math.floor(num/10000000); num %= 10000000;
  const lk = Math.floor(num/100000);   num %= 100000;
  const th = Math.floor(num/1000);     num %= 1000;
  const parts = [];
  if (cr)  parts.push(_three(cr)  + ' Crore');
  if (lk)  parts.push(_three(lk)  + ' Lakh');
  if (th)  parts.push(_three(th)  + ' Thousand');
  if (num) parts.push(_three(num));
  return parts.join(' ').trim() + ' Only';
};

export const paymentStatusBadge = (paid, grand) => {
  if (paid <= 0)    return { label:'Unpaid',  cls:'bg-red-50 text-red-600 border-red-200',           dot:'bg-red-500'     };
  if (paid < grand) return { label:'Partial', cls:'bg-amber-50 text-amber-600 border-amber-200',     dot:'bg-amber-500'   };
  return                   { label:'Paid',    cls:'bg-emerald-50 text-emerald-700 border-emerald-200',dot:'bg-emerald-500' };
};

/* ─────────────────────────────────────────────────────────────────────────────
   INVOICE REACT COMPONENT  (renders the HTML invoice — not shown in UI)
───────────────────────────────────────────────────────────────────────────── */
const InvoiceHTML = ({ inv, clinicInfo }) => {
  const {
    clinicName  = 'Clinic',
    degree      = '',
    email       = '',
    mobile      = '',
    address     = '',
    logoBase64  = null,
  } = clinicInfo || {};

  /* Doctor name — strip duplicate "Dr." */
  const cleanDegree   = degree.replace(/^(Dr\.\s*)+/i, '').trim();
  const doctorDisplay = cleanDegree ? `Dr. ${cleanDegree}` : '';

  const isRevisit = inv.visitType === 'Revisit' || inv.isRevisit;
  const billDate  = new Date(inv.createdAt || inv.billingDate || Date.now());
  const visitDate = new Date(inv.visitDate  || billDate);

  /* Calculations */
  const items       = inv.items || [];
  const subTotal    = inv.subTotal      ?? items.reduce((s,it) => s + it.price*(it.qty||1), 0);
  const discountAmt = inv.discountAmount ?? (inv.discount ? subTotal*(inv.discount/100) : 0);
  const taxPercent  = inv.taxPercent    ?? 0;
  const taxAmt      = inv.taxAmount     ?? (subTotal - discountAmt)*(taxPercent/100);
  const grandTotal  = inv.grandTotal    ?? (subTotal - discountAmt + taxAmt);
  const paidAmount  = inv.paidAmount    ?? 0;
  const dueAmount   = inv.dueAmount     ?? Math.max(grandTotal - paidAmount, 0);

  const notes = inv.notes?.length ? inv.notes : [
    'Please carry this invoice for your next visit.',
    'Medicines once sold will not be returned.',
    'Report any adverse reaction to medication immediately.',
    `Thank you for choosing ${clinicName}.`,
  ];

  /* Inline styles — no Tailwind/CSS modules needed, works in detached DOM */
  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family:'Segoe UI','Inter',Arial,sans-serif; }
    .inv-wrap { width:828px; background:#fff; font-family:'Segoe UI','Inter',Arial,sans-serif; font-size:13px; color:#111827; }
    .top-strip { height:4px; background:#0F1C33; }

    /* HEADER */
    .header { display:flex; justify-content:space-between; align-items:center; padding:10px 20px 8px; border-bottom:2px solid #16294A; }
    .logo-area { display:flex; align-items:center; gap:10px; }
    .logo-img { width:54px; height:54px; object-fit:contain; border-radius:50%; }
    .logo-placeholder { width:54px; height:54px; border-radius:50%; border:2px solid #16294A; display:flex; align-items:center; justify-content:center; background:#E6ECF4; flex-shrink:0; }
    .logo-cross-v { position:absolute; width:8px; height:22px; background:#16294A; border-radius:2px; }
    .logo-cross-h { position:absolute; width:22px; height:8px; background:#16294A; border-radius:2px; }
    .logo-inner { position:relative; width:30px; height:30px; display:flex; align-items:center; justify-content:center; }
    .clinic-contacts { font-size:8px; color:#444; line-height:1.9; }
    .brow { display:flex; align-items:center; gap:5px; }
    .brow::before { content:'●'; color:#2980C3; font-size:6px; flex-shrink:0; }
    .inv-block { text-align:right; }
    .inv-title { font-size:28px; font-weight:800; color:#16294A; letter-spacing:2px; line-height:1; }
    .inv-underline { height:2px; background:#2980C3; margin:3px 0 5px; }
    .inv-meta { font-size:8.5px; color:#6e7682; line-height:2; }
    .inv-meta strong { font-weight:700; color:#16294A; }

    /* BILL ROW */
    .bill-row { display:flex; background:#f7f9fc; border-bottom:0.5px solid #dce3ed; padding:8px 20px; }
    .bill-col { flex:1; }
    .bill-col.right { text-align:right; border-left:1px solid #dce3ed; padding-left:16px; }
    .bill-label { font-size:7px; font-weight:700; color:#2980C3; text-transform:uppercase; letter-spacing:0.6px; margin-bottom:2px; }
    .bill-name { font-size:12px; font-weight:700; color:#16294A; margin-bottom:3px; line-height:1.3; }
    .bill-meta { font-size:8px; color:#555; line-height:1.85; }
    .bill-meta strong { color:#16294A; font-weight:600; }

    /* TABLE */
    table { width:100%; border-collapse:collapse; }
    thead tr { background:#16294A; }
    thead th { padding:7px 12px; font-size:8px; font-weight:700; text-transform:uppercase; letter-spacing:0.4px; color:#fff; text-align:left; }
    thead th.c { text-align:center; }
    thead th.r { text-align:right; }
    tbody tr { border-bottom:0.5px solid #edf0f5; }
    tbody tr:nth-child(even) { background:#f7f9fc; }
    tbody td { padding:6px 12px; font-size:9px; color:#16294A; }
    tbody td.c { text-align:center; }
    tbody td.r { text-align:right; color:#2980C3; font-weight:600; }
    tbody td.rg { text-align:right; }
    tbody td.num { color:#888; font-weight:600; }

    /* BOTTOM */
    .bottom { display:flex; padding:10px 20px 14px; gap:14px; align-items:flex-start; }
    .notes { flex:1.3; }
    .notes h4 { font-size:9px; font-weight:700; color:#16294A; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:5px; }
    .notes ul { list-style:none; }
    .notes ul li { font-size:7.5px; color:#666; line-height:1.8; padding-left:10px; position:relative; }
    .notes ul li::before { content:'•'; position:absolute; left:0; color:#2980C3; font-weight:bold; }
    .summary { flex:1; font-size:8.5px; }
    .srow { display:flex; justify-content:space-between; padding:3px 0; border-bottom:0.5px solid #f0f0f0; color:#6e7682; }
    .srow .v { color:#16294A; }
    .disc .v { color:#C82828; }
    .srow.total { background:#16294A; color:#fff; padding:6px 10px; border-radius:3px; margin:4px 0; font-weight:700; font-size:10px; border:none; }
    .srow.total .v { color:#fff; }
    .paid .v { color:#16A34A; font-weight:700; }
    .due .v { color:#C82828; font-weight:700; }
    .due-zero .v { color:#16A34A; font-weight:700; }
    .amount-words { margin-top:5px; font-size:7px; color:#888; }
    .amount-words em { color:#555; font-weight:600; font-style:italic; }

    /* FOOTER */
    .footer { background:#16294A; padding:10px 0 8px; text-align:center; }
    .footer-title { font-size:11px; font-weight:700; color:#fff; letter-spacing:0.5px; }
    .footer-sub { font-size:8px; color:#D2E0F0; margin-top:3px; }
  `;

  return (
    <div className="inv-wrap">
      <style dangerouslySetInnerHTML={{ __html: css }} />

      {/* TOP STRIP */}
      <div className="top-strip" />

      {/* HEADER */}
      <div className="header">
        <div className="logo-area">
          {logoBase64 ? (
            <img src={logoBase64} className="logo-img" alt="logo" />
          ) : (
            <div className="logo-placeholder">
              <div className="logo-inner">
                <div className="logo-cross-v" />
                <div className="logo-cross-h" />
              </div>
            </div>
          )}
          <div className="clinic-contacts">
            {address && <div className="brow">{address}</div>}
            {mobile  && <div className="brow">{mobile}</div>}
            {email   && <div className="brow">{email}</div>}
          </div>
        </div>

        <div className="inv-block">
          <div className="inv-title">INVOICE</div>
          <div className="inv-underline" />
          <div className="inv-meta">
            Invoice No. &nbsp;&nbsp;<strong>{inv.invoiceNo || '001'}</strong><br />
            Invoice Date &nbsp;<strong>{ddmmmyyyy(billDate)}</strong>
          </div>
        </div>
      </div>

      {/* BILL TO / FROM */}
      <div className="bill-row">
        <div className="bill-col">
          <div className="bill-label">Bill To</div>
          <div className="bill-name">{inv.patientName || ''}</div>
          <div className="bill-meta">
            <strong>Mobile</strong> : {inv.mobile || ''}<br />
            <strong>Visit Type</strong> : {isRevisit ? 'Revisit' : 'New'}&nbsp;&nbsp;&nbsp;
            <strong>Visit Date</strong> : {ddmmmyyyy(visitDate)}
          </div>
        </div>
        <div className="bill-col right">
          <div className="bill-label">Billed From</div>
          <div className="bill-name">{clinicName}</div>
          {doctorDisplay && (
            <div className="bill-meta">Doctor Name : <strong>{doctorDisplay}</strong></div>
          )}
        </div>
      </div>

      {/* ITEMS TABLE */}
      <table>
        <thead>
          <tr>
            <th style={{ width:32 }}>#</th>
            <th>DESCRIPTION</th>
            <th className="c" style={{ width:60 }}>QTY</th>
            <th className="r" style={{ width:100 }}>UNIT PRICE</th>
            <th className="r" style={{ width:110 }}>AMOUNT (Rs.)</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i}>
              <td className="num">{i + 1}</td>
              <td>{item.name}</td>
              <td className="c">{item.qtyLabel || (item.qty || 1)}</td>
              <td className="rg">{fmtNum(item.price)}</td>
              <td className="r">{fmtNum(item.price * (item.qty || 1))}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* BOTTOM — Notes + Summary */}
      <div className="bottom">
        <div className="notes">
          <h4>Notes</h4>
          <ul>
            {notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>

        <div className="summary">
          <div className="srow">
            <span>Subtotal</span>
            <span className="v">Rs. {fmtNum(subTotal)}</span>
          </div>
          <div className="srow disc">
            <span>Discount</span>
            <span className="v">{discountAmt ? `- Rs. ${fmtNum(discountAmt)}` : 'Rs. 0.00'}</span>
          </div>
          {(taxPercent > 0 || taxAmt > 0) && (
            <div className="srow">
              <span>Tax ({fmtNum(taxPercent).replace(/\.00$/, '')}%)</span>
              <span className="v">Rs. {fmtNum(taxAmt)}</span>
            </div>
          )}
          <div className="srow total">
            <span>TOTAL AMOUNT</span>
            <span className="v">Rs. {fmtNum(grandTotal)}</span>
          </div>
          <div className={`srow paid`}>
            <span>Amount Paid</span>
            <span className="v">Rs. {fmtNum(paidAmount)}</span>
          </div>
          <div className={`srow ${dueAmount > 0 ? 'due' : 'due-zero'}`}>
            <span>Balance Due</span>
            <span className="v">Rs. {fmtNum(dueAmount)}</span>
          </div>
          <div className="amount-words">
            Amount in Words: <em>{numberToWordsINR(grandTotal)}</em>
          </div>
        </div>
      </div>

      {/* FOOTER */}
      <div className="footer">
        <div className="footer-title">♥ &nbsp; THANK YOU FOR YOUR TRUST IN US &nbsp; ♥</div>
        <div className="footer-sub">We Wish You Good Health!</div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────────────────────────────────────
   CORE: Render InvoiceHTML → html2pdf → return jsPDF-compatible object
───────────────────────────────────────────────────────────────────────────── */

/**
 * Renders InvoiceHTML into a hidden off-screen div, converts to PDF via
 * html2pdf.js, and returns a pseudo-jsPDF object with .output() and .save().
 *
 * @param {object} inv        — invoice data (same shape as pdfGenerator.js)
 * @param {object} clinicInfo — clinic details (same shape as pdfGenerator.js)
 * @returns {Promise<PseudoPDFDoc>}
 */
const renderToPdfBlob = (inv, clinicInfo) => {
  return new Promise((resolve, reject) => {
    /* 1. Create hidden container */
    const container = document.createElement('div');
    container.style.cssText = 'position:fixed;left:-9999px;top:-9999px;z-index:-1;pointer-events:none;';
    document.body.appendChild(container);

    /* 2. Mount React component */
    const root = createRoot(container);
    root.render(<InvoiceHTML inv={inv} clinicInfo={clinicInfo} />);

    /* 3. Wait one tick for paint, then convert */
    setTimeout(async () => {
      try {
        const element = container.firstChild;

        const opt = {
          margin:       0,
          filename:     `Invoice_${inv.invoiceNo || 'draft'}.pdf`,
          image:        { type: 'jpeg', quality: 0.98 },
          html2canvas:  {
            scale:          2,          // retina-sharp
            useCORS:        true,
            logging:        false,
            windowWidth:    828,        // fixed canvas width
          },
          jsPDF: {
            unit:        'px',
            format:      [828, element.offsetHeight || 468],  // dynamic height!
            orientation: 'portrait',
            compress:    true,
          },
        };

        const pdfInstance = html2pdf().set(opt).from(element);
        const blob        = await pdfInstance.outputPdf('blob');

        resolve(blob);
      } catch (err) {
        reject(err);
      } finally {
        root.unmount();
        document.body.removeChild(container);
      }
    }, 120);
  });
};

/* ─────────────────────────────────────────────────────────────────────────────
   PUBLIC API — SAME SIGNATURES AS pdfGenerator.js
   BillingModule.jsx needs ZERO changes.
───────────────────────────────────────────────────────────────────────────── */

/**
 * buildPDF — async now, returns a pseudo-doc with .output() and .save()
 * BillingModule uses:  const doc = buildPDF(inv, clinicInfo)  →  setPreviewPdf(doc)
 * BillingPreviewModal renders: doc.output('bloburl')
 *
 * We return a Promise<PseudoDoc> — update the two call-sites below.
 */
export const buildPDF = async (inv, clinicInfo) => {
  const blob   = await renderToPdfBlob(inv, clinicInfo);
  const blobUrl = URL.createObjectURL(blob);

  /* PseudoDoc — matches what BillingPreviewModal expects */
  return {
    _blob:    blob,
    _blobUrl: blobUrl,
    _inv:     inv,

    /** output(type) — jsPDF-compatible */
    output(type) {
      if (type === 'blob')    return blob;
      if (type === 'bloburl') return blobUrl;
      if (type === 'datauristring' || type === 'datauri') {
        return new Promise(res => {
          const reader = new FileReader();
          reader.onload = () => res(reader.result);
          reader.readAsDataURL(blob);
        });
      }
      return blob;
    },

    /** save(filename) — jsPDF-compatible */
    save(filename) {
      const a     = document.createElement('a');
      a.href      = blobUrl;
      a.download  = filename || `Invoice_${inv.invoiceNo || 'draft'}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
    },
  };
};

/** Open PDF in new tab + trigger print dialog */
export const openPDFInNewTab = async (inv, clinicInfo) => {
  const blob = await renderToPdfBlob(inv, clinicInfo);
  const url  = URL.createObjectURL(blob);
  const win  = window.open(url, '_blank');
  if (win) win.onload = () => { win.focus(); win.print(); };
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

/** Download PDF as file */
export const downloadPDF = async (inv, clinicInfo) => {
  const blob = await renderToPdfBlob(inv, clinicInfo);
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `Invoice_${inv.invoiceNo || 'draft'}.pdf`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

export default InvoiceHTML;