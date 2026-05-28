/**
 * BillingPreviewModal.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Invoice preview modal with WhatsApp, Email, and Print delivery options.
 * Mirrors the PreviewModal pattern from GeneratePrescription.jsx.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  X, Loader2, CheckCircle2, AlertCircle,
  Printer, Mail, Receipt,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL;

/* ── Tiny status badge ──────────────────────────────────────────────────── */
const StatusBadge = ({ status, error }) => {
  if (!status) return null;
  const cfg = {
    sending: { bg: 'bg-blue-50 text-blue-700',      icon: <Loader2 size={12} className="animate-spin" />, text: 'Sending…' },
    success: { bg: 'bg-emerald-50 text-emerald-700', icon: <CheckCircle2 size={12} />,                     text: 'Sent!'     },
    error:   { bg: 'bg-red-50 text-red-600',         icon: <AlertCircle size={12} />,                      text: error       },
  }[status];
  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-black ${cfg.bg}`}>
      {cfg.icon} {cfg.text}
    </div>
  );
};

/* ── WhatsApp SVG icon ──────────────────────────────────────────────────── */
const WhatsAppIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" className="shrink-0">
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

/* ══════════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
const BillingPreviewModal = ({ isOpen, onClose, pdfDoc, inv, slug }) => {
  const [pdfBlobUrl,   setPdfBlobUrl]   = useState(null);
  const [waSending,    setWaSending]    = useState(false);
  const [waStatus,     setWaStatus]     = useState(null);  // null|'sending'|'success'|'error'
  const [waError,      setWaError]      = useState('');
  const [emailSending, setEmailSending] = useState(false);
  const [emailStatus,  setEmailStatus]  = useState(null);
  const [emailError,   setEmailError]   = useState('');
  const emailGuardRef = useRef(false);

  /* ── Build blob URL whenever pdfDoc changes ── */
  useEffect(() => {
    if (isOpen && pdfDoc) {
      const blob = pdfDoc.output('blob');
      const url  = URL.createObjectURL(blob);
      setPdfBlobUrl(url);
      return () => URL.revokeObjectURL(url);
    }
    // reset everything on close
    setPdfBlobUrl(null);
    setWaStatus(null);    setWaError('');
    setEmailStatus(null); setEmailError('');
  }, [isOpen, pdfDoc]);

  /* ── Auto-open print tab once blob URL is ready ── */

  if (!isOpen) return null;

  /* ── Handlers ── */
  const handleWhatsApp = async () => {
    if (!inv?.mobile) { setWaStatus('error'); setWaError('Patient mobile not found.'); return; }
    setWaSending(true); setWaStatus('sending'); setWaError('');
    try {
      const res = await axios.post(
        `${API_BASE}/api/whatsapp/send-prescription/${slug}`,
        { pdfBase64: pdfDoc.output('datauristring'), patientName: inv.patientName, patientMobile: inv.mobile }
      );
      setWaStatus(res.data.success ? 'success' : 'error');
      if (!res.data.success) setWaError(res.data.message || 'Send failed');
    } catch (err) {
      setWaStatus('error');
      setWaError(err.response?.data?.message || err.message || 'WhatsApp send failed');
    } finally { setWaSending(false); }
  };

  const handleEmail = async () => {
    if (emailGuardRef.current) return;
    if (!inv?.email) { setEmailStatus('error'); setEmailError('Patient email not found.'); return; }
    emailGuardRef.current = true;
    setEmailSending(true); setEmailStatus('sending'); setEmailError('');
    try {
      const raw = pdfDoc.output('datauristring');
      const b64 = raw.substring(raw.indexOf(',') + 1);
      if (!b64.startsWith('JVBERi')) { setEmailStatus('error'); setEmailError('PDF generation failed.'); return; }
      const res = await axios.post(
        `${API_BASE}/api/notifications/send-email-invoice/${slug}`,
        { pdfBase64: b64, patientName: inv.patientName, patientEmail: inv.email, patientMobile: inv.mobile },
        { timeout: 60000 }
      );
      setEmailStatus(res.data.success ? 'success' : 'error');
      if (!res.data.success) setEmailError(res.data.message || 'Email send failed');
    } catch (err) {
      setEmailStatus('error');
      setEmailError(err.response?.data?.message || err.message || 'Email send failed');
    } finally { emailGuardRef.current = false; setEmailSending(false); }
  };

  const handlePrint = () => {
    if (!pdfBlobUrl) return;
    const win = window.open(pdfBlobUrl, '_blank');
    if (win) win.addEventListener('load', () => { win.focus(); win.print(); });
  };

  /* ── Render ── */
  return (
    <div className="fixed inset-0 z-[999] flex bg-black/80 backdrop-blur-sm">

      {/* ── Left: PDF preview ── */}
      <div className="flex-1 flex flex-col bg-slate-800">

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#18afb1] flex items-center justify-center shrink-0">
              <Receipt size={15} className="text-white" />
            </div>
            <div>
              <p className="text-white font-black text-sm">Invoice Preview</p>
              <p className="text-slate-400 text-[11px] font-medium">
                {inv?.patientName} · {inv?.mobile}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-700 transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* PDF iframe */}
        <div className="flex-1 p-4 overflow-hidden">
          {pdfBlobUrl
            ? <iframe
                src={`${pdfBlobUrl}#toolbar=0&navpanes=0`}
                className="w-full h-full rounded-lg shadow-2xl border-0 bg-white"
                title="Invoice Preview"
              />
            : <div className="flex items-center justify-center h-full gap-3 text-slate-400">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm font-medium">Generating PDF…</span>
              </div>
          }
        </div>
      </div>

      {/* ── Right: Action panel ── */}
      <div className="w-80 bg-white flex flex-col shadow-2xl shrink-0">

        {/* Panel header */}
        <div className="px-6 py-5 border-b border-slate-100 shrink-0">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">
            Invoice Saved ✓
          </p>
          <p className="text-sm font-black text-slate-800">Choose delivery method</p>
          <p className="text-[11px] text-slate-400 font-medium mt-1">
            PDF has been opened for printing automatically.
          </p>
        </div>

        {/* Actions */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3">

          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            disabled={waSending || !pdfBlobUrl}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-[#25D366] hover:bg-[#1ebe5d] disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-[11px] uppercase tracking-wider transition-all hover:translate-x-1 active:scale-95"
          >
            {waSending
              ? <Loader2 size={18} className="animate-spin shrink-0" />
              : <WhatsAppIcon />
            }
            Send via WhatsApp
          </button>
          <StatusBadge status={waStatus} error={waError} />

          {/* Email */}
          <button
            onClick={handleEmail}
            disabled={emailSending || !pdfBlobUrl}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-black text-[11px] uppercase tracking-wider transition-all hover:translate-x-1 active:scale-95"
          >
            {emailSending
              ? <Loader2 size={18} className="animate-spin shrink-0" />
              : <Mail size={18} className="shrink-0" />
            }
            Send via Email
          </button>
          <StatusBadge status={emailStatus} error={emailError} />

          {/* Print again */}
          <button
            onClick={handlePrint}
            disabled={!pdfBlobUrl}
            className="w-full flex items-center gap-3 px-4 py-4 rounded-2xl bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-black text-[11px] uppercase tracking-wider transition-all hover:translate-x-1 active:scale-95"
          >
            <Printer size={18} className="shrink-0" />
            Print Again
          </button>

          {/* Close */}
          <div className="border-t border-slate-100 pt-3 space-y-2">
            <button
              onClick={onClose}
              className="w-full px-4 py-3 rounded-2xl border-2 border-slate-200 text-slate-500 hover:bg-slate-50 font-black text-[11px] uppercase tracking-widest transition-all"
            >
              Close
            </button>
            <p className="text-[10px] text-slate-400 text-center font-medium">
              Invoice has been saved to the database.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BillingPreviewModal;