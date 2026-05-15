import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
  Search, User, FileText, Printer, Plus, Trash2, History,
  Download, CheckCircle2, Percent, Loader2, X, Stethoscope,
  RefreshCw, AlertCircle, IndianRupee, Clock, Receipt, ChevronRight,
  Activity, Edit3, PlusCircle, ChevronDown, BadgeCheck, Calendar,
  Filter, CalendarDays, SlidersHorizontal, Wallet, XCircle, Eye
} from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

const API_BASE = import.meta.env.VITE_API_URL;

/* ─────────────────────────────────────────────
   EXTRACT PATIENT ID
───────────────────────────────────────────── */
const getPatientId = (appt) => {
  const raw = appt.patientId;
  if (!raw) return appt._id;
  if (typeof raw === 'string') return raw;
  if (typeof raw === 'object' && raw._id) return String(raw._id);
  return String(raw);
};

/* ─────────────────────────────────────────────
   SIMPLE 30-SECOND IN-MEMORY CACHE
───────────────────────────────────────────── */
const cache = new Map();
const CACHE_TTL = 30_000;
const getCache = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
  return entry.data;
};
const setCache = (key, data) => cache.set(key, { data, ts: Date.now() });
const clearCache = () => cache.clear();

/* ─────────────────────────────────────────────
   DATE HELPERS
───────────────────────────────────────────── */
const toLocalISO = (date) => {
  const d = new Date(date);
  const yyyy = d.getFullYear();
  const mm   = String(d.getMonth() + 1).padStart(2, '0');
  const dd   = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};
const today = toLocalISO(new Date());

const getMonthRange = (offset = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  const start = toLocalISO(d);
  d.setMonth(d.getMonth() + 1, 0);
  const end = toLocalISO(d);
  return { start, end };
};

/* ─────────────────────────────────────────────
   CONSTANTS
───────────────────────────────────────────── */
const STATUS_OPTIONS  = ['All', 'Pending', 'Billed'];
const VISIT_OPTIONS   = ['All', 'New', 'Revisit'];
const DATE_PRESET_OPTIONS = [
  { label: 'Today',        value: 'today'      },
  { label: 'Yesterday',    value: 'yesterday'  },
  { label: 'This Month',   value: 'this_month' },
  { label: 'Last Month',   value: 'last_month' },
  { label: 'Custom Range', value: 'custom'     },
];

/* ─────────────────────────────────────────────
   FIX: ASCII-safe number formatter (no locale)
───────────────────────────────────────────── */
const fmtNum = (n) => {
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

// For UI display
const fmt = (n) => Number(n || 0).toLocaleString('en-IN');

/* ─────────────────────────────────────────────
   Safe string for PDF — strip non-latin1 chars
───────────────────────────────────────────── */
const safePdfStr = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/₹/g, 'Rs.')
    .replace(/[^\x00-\xFF]/g, '?');
};

const pdfRs = (n) => `Rs. ${fmtNum(n)}`;

const paymentStatusBadge = (paid, grand) => {
  if (paid <= 0)    return { label: 'Unpaid',  cls: 'bg-red-50 text-red-600 border-red-200',         dot: 'bg-red-500'     };
  if (paid < grand) return { label: 'Partial', cls: 'bg-amber-50 text-amber-600 border-amber-200',   dot: 'bg-amber-500'   };
  return               { label: 'Paid',    cls: 'bg-emerald-50 text-emerald-700 border-emerald-200', dot: 'bg-emerald-500' };
};

/* ─────────────────────────────────────────────
   PDF GENERATOR
───────────────────────────────────────────── */
const buildPDF = (inv, slug) => {
  const doc = new jsPDF({ putOnlyUsedFonts: true, compress: true });
  doc.setFont('helvetica');

  const clinicTitle = safePdfStr(
    (slug || 'CLINIC').toUpperCase().replace(/-/g, ' ')
  );
  const isRevisit = inv.visitType === 'Revisit' || inv.isRevisit;

  // Header band
  doc.setFillColor(15, 118, 110).rect(0, 0, 210, 38, 'F');
  doc.setFontSize(22).setTextColor(255).setFont('helvetica', 'bold');
  doc.text(clinicTitle, 105, 17, { align: 'center' });
  doc.setFontSize(9).setFont('helvetica', 'normal');
  doc.text('Official Medical Invoice / Receipt', 105, 25, { align: 'center' });
  doc.setFontSize(8).setTextColor(180, 255, 240);
  doc.text(`Invoice No: ${safePdfStr(inv.invoiceNo)}`, 105, 32, { align: 'center' });

  // Patient info band
  doc.setFillColor(245, 250, 255).rect(0, 38, 210, 28, 'F');
  doc.setTextColor(30).setFontSize(10).setFont('helvetica', 'bold');
  doc.text(`Patient: ${safePdfStr(inv.patientName)}`, 14, 49);
  doc.text(`Mobile: ${safePdfStr(inv.mobile)}`, 14, 56);
  doc.setTextColor(100).setFont('helvetica', 'normal').setFontSize(9);
  const billDate = new Date(inv.createdAt || inv.billingDate);
  const dateStr  = `${billDate.getDate().toString().padStart(2,'0')}/${(billDate.getMonth()+1).toString().padStart(2,'0')}/${billDate.getFullYear()}`;
  doc.text(`Date: ${dateStr}`, 145, 49);
  doc.text(`Payment: ${safePdfStr(inv.paymentMode)}`, 145, 56);

  if (isRevisit) {
    doc.setFillColor(15, 118, 110).roundedRect(145, 60, 40, 6, 2, 2, 'F');
    doc.setTextColor(255).setFontSize(7).setFont('helvetica', 'bold');
    doc.text('REVISIT PATIENT', 165, 64.5, { align: 'center' });
  }

  let startY = 72;
  if (inv.appointmentFee) {
    doc.setFillColor(240, 253, 250).rect(14, startY - 4, 182, 10, 'F');
    doc.setTextColor(15, 118, 110).setFontSize(9).setFont('helvetica', 'bold');
    doc.text(
      `Appointment Fee Collected at Registration: ${pdfRs(inv.appointmentFee)}`,
      14, startY + 2
    );
    startY += 14;
  }

  // Items table
  autoTable(doc, {
    startY,
    head: [['#', 'Service / Description', 'Rate', 'Qty', 'Amount']],
    body: (inv.items || []).map((item, i) => [
      i + 1,
      safePdfStr(item.name),
      pdfRs(item.price),
      item.qty || 1,
      pdfRs(item.price * (item.qty || 1)),
    ]),
    headStyles: {
      fillColor: [15, 118, 110],
      textColor: 255,
      fontStyle: 'bold',
      fontSize: 9,
      font: 'helvetica',
    },
    bodyStyles: { fontSize: 9, font: 'helvetica' },
    alternateRowStyles: { fillColor: [245, 252, 250] },
    theme: 'striped',
    columnStyles: {
      0: { cellWidth: 10 },
      2: { halign: 'right' },
      3: { halign: 'center' },
      4: { halign: 'right' },
    },
  });

  // Summary section
  const fy = doc.lastAutoTable.finalY + 8;
  doc.setDrawColor(220).line(120, fy, 196, fy);

  const summaryRows = [
    ['Sub-Total',   pdfRs(inv.subTotal),   [60, 60, 60]],
    ['Discount',    `- ${pdfRs(inv.discount)}`, [200, 80, 80]],
    ['Grand Total', pdfRs(inv.grandTotal), [15, 118, 110]],
    ['Paid Amount', pdfRs(inv.paidAmount), [22, 163, 74]],
    ['Due Amount',  pdfRs(inv.dueAmount),  inv.dueAmount > 0 ? [220, 38, 38] : [22, 163, 74]],
  ];

  summaryRows.forEach(([label, value, color], i) => {
    const y = fy + 8 + i * 9;
    doc.setFontSize(i >= 2 ? 11 : 9);
    doc.setFont('helvetica', i >= 2 ? 'bold' : 'normal');
    doc.setTextColor(...color);
    doc.text(label, 122, y);
    doc.text(value, 196, y, { align: 'right' });
  });

  // Footer
  const footerY = Math.max(doc.lastAutoTable.finalY + 75, 260);
  doc.setDrawColor(15, 118, 110).setLineWidth(0.4).line(0, footerY, 210, footerY);
  doc.setFillColor(15, 118, 110).rect(0, footerY, 210, 16, 'F');
  doc.setFontSize(8).setTextColor(255).setFont('helvetica', 'normal');
  doc.text('Thank you for choosing our clinic. Get well soon!', 105, footerY + 6, { align: 'center' });

  const now = new Date();
  const nowStr = `${now.getDate().toString().padStart(2,'0')}/${(now.getMonth()+1).toString().padStart(2,'0')}/${now.getFullYear()} ${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`;
  doc.text(`Generated on ${nowStr}`, 105, footerY + 11, { align: 'center' });

  return doc;
};

/* Open PDF in new browser tab for print/preview */
const openPDFInNewTab = (inv, slug) => {
  const doc = buildPDF(inv, slug);
  const pdfBlob = doc.output('blob');
  const url = URL.createObjectURL(pdfBlob);
  const win = window.open(url, '_blank');
  if (win) {
    win.onload = () => {
      win.focus();
      win.print();
    };
  }
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
};

/* Download PDF as file */
const downloadPDF = (inv, slug) => {
  const doc = buildPDF(inv, slug);
  doc.save(`Invoice_${inv.invoiceNo}.pdf`);
};

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
const BillingModule = () => {
  const { slug } = useParams();

  /* ── View State ── */
  const [view, setView] = useState('queue'); // 'queue' | 'form' | 'history'

  /* ── Queue / Appointments ── */
  const [appointments, setAppointments] = useState([]);
  const [loading,      setLoading]      = useState(true);
  const abortRef = useRef(null);

  /* ── Filter State ── */
  const [showFilters,  setShowFilters]  = useState(false);
  const [searchText,   setSearchText]   = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [visitFilter,  setVisitFilter]  = useState('All');
  const [datePreset,   setDatePreset]   = useState('today');
  const [customStart,  setCustomStart]  = useState(today);
  const [customEnd,    setCustomEnd]    = useState(today);

  /* ── Billing Form State ── */
  const [searchQuery,     setSearchQuery]     = useState('');
  const [searchResults,   setSearchResults]   = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [items,           setItems]           = useState([]);
  const [discount,        setDiscount]        = useState(0);
  const [paidAmount,      setPaidAmount]      = useState(0);
  const [paymentMode,     setPaymentMode]     = useState('Cash');
  const [formLoading,     setFormLoading]     = useState(false);
  const [manualFeeName,   setManualFeeName]   = useState('');
  const [manualFeePrice,  setManualFeePrice]  = useState('');
  const [patientHistory,  setPatientHistory]  = useState([]);

  /* ── Edit Mode State ── */
  const [editMode,      setEditMode]      = useState(false);
  const [editInvoiceId, setEditInvoiceId] = useState(null);

  /* ── History State ── */
  const [allHistory,     setAllHistory]     = useState([]);
  const [historySearch,  setHistorySearch]  = useState('');
  const [historyLoading, setHistoryLoading] = useState(false);

  /* ── PDF Loading ── */
  const [pdfLoading,      setPdfLoading]      = useState(null);
  const [downloadLoading, setDownloadLoading] = useState(null);

  /* ── Derived Billing Calculations ── */
  const isRevisit = selectedPatient?.visitType === 'Revisit' ||
                    selectedPatient?.visitType === 'Revisit Patient' ||
                    selectedPatient?.type       === 'Revisit' ||
                    selectedPatient?.isRevisit  === true;

  const subTotal   = items.reduce((acc, i) => acc + i.price * (i.qty || 1), 0);
  const grandTotal = subTotal - Number(discount);
  const due        = grandTotal - Number(paidAmount);
  const effectiveDue = due;

  /* ── Reset form helper ── */
  const resetForm = () => {
    setSelectedPatient(null);
    setItems([]);
    setDiscount(0);
    setPaidAmount(0);
    setPaymentMode('Cash');
    setEditMode(false);
    setEditInvoiceId(null);
    setSearchQuery('');
    setSearchResults([]);
    setPatientHistory([]);
    setManualFeeName('');
    setManualFeePrice('');
  };

  /* ══════════════════════════════════════════════════════════════════════════
     FETCH QUEUE
  ══════════════════════════════════════════════════════════════════════════ */
  const fetchQueue = useCallback(async (force = false) => {
    const cacheKey = `billing-queue-${slug}`;
    const cached   = getCache(cacheKey);
    if (cached && !force) { setAppointments(cached); setLoading(false); return; }
    else setLoading(true);

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const res = await axios.get(
        `${API_BASE}/api/appointments/${slug}/live-queue`,
        {
          params: { page: 1, limit: 200, status: 'Completed' },
          signal: abortRef.current.signal,
          timeout: 8000,
        }
      );
      if (res.data.success) {
        const completedOnly = (res.data.data || []).filter(a => a.status === 'Completed');
        setCache(cacheKey, completedOnly);
        setAppointments(completedOnly);
      }
    } catch (err) {
      if (axios.isCancel(err) || err.code === 'ERR_CANCELED') return;
      console.error('Billing Queue Fetch Error:', err);
    } finally { setLoading(false); }
  }, [slug]);

  useEffect(() => {
    fetchQueue();
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [slug, fetchQueue]);

  /* ── Active Date Range ── */
  const activeDateRange = useMemo(() => {
    if (datePreset === 'today')     return { start: today, end: today };
    if (datePreset === 'yesterday') {
      const d = new Date(); d.setDate(d.getDate() - 1);
      const y = toLocalISO(d); return { start: y, end: y };
    }
    if (datePreset === 'this_month') return getMonthRange(0);
    if (datePreset === 'last_month') return getMonthRange(-1);
    if (datePreset === 'custom')     return { start: customStart, end: customEnd };
    return { start: null, end: null };
  }, [datePreset, customStart, customEnd]);

  /* ── Filtered Queue ── */
  const filteredQueue = useMemo(() => {
    return appointments.filter(appt => {
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const nameMatch   = appt.patientName?.toLowerCase().includes(q);
        const mobileMatch = appt.mobile?.includes(q);
        if (!nameMatch && !mobileMatch) return false;
      }
      if (visitFilter !== 'All') {
        const isRev = appt.visitType === 'Revisit' || appt.visitType === 'Revisit Patient' ||
                      appt.type === 'Revisit' || appt.isRevisit;
        if (visitFilter === 'Revisit' && !isRev) return false;
        if (visitFilter === 'New'     &&  isRev) return false;
      }
      if (statusFilter !== 'All') {
        const billedStatus = appt.isBilled ? 'Billed' : 'Pending';
        if (billedStatus !== statusFilter) return false;
      }
      if (activeDateRange.start && activeDateRange.end) {
        const apptDate = toLocalISO(new Date(appt.appointmentDate));
        if (apptDate < activeDateRange.start || apptDate > activeDateRange.end) return false;
      }
      return true;
    });
  }, [appointments, searchText, visitFilter, statusFilter, activeDateRange]);

  /* ── Active filter count badge ── */
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchText.trim())      count++;
    if (statusFilter !== 'All') count++;
    if (visitFilter  !== 'All') count++;
    if (datePreset   !== 'today') count++;
    return count;
  }, [searchText, statusFilter, visitFilter, datePreset]);

  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('All');
    setVisitFilter('All');
    setDatePreset('today');
    setCustomStart(today);
    setCustomEnd(today);
  };

  /* ── Stats ── */
  const stats = useMemo(() => ({
    total:   filteredQueue.length,
    pending: filteredQueue.filter(a => !a.isBilled).length,
    billed:  filteredQueue.filter(a =>  a.isBilled).length,
  }), [filteredQueue]);

  /* ── Patient Search (form) ── */
  useEffect(() => {
    const t = setTimeout(async () => {
      if (searchQuery.length > 2) {
        try {
          const res = await axios.get(
            `${API_BASE}/api/appointments/search-billing/${slug}?query=${searchQuery}`
          );
          if (res.data.success) {
            const completedOnly = (res.data.data || []).filter(a => a.status === 'Completed');
            setSearchResults(completedOnly);
          }
        } catch (e) { console.error(e); }
      } else setSearchResults([]);
    }, 400);
    return () => clearTimeout(t);
  }, [searchQuery, slug]);

  /* ── Per-patient billing history ── */
  useEffect(() => {
    if (!selectedPatient) return;
    const pid = getPatientId(selectedPatient);
    (async () => {
      try {
        const res = await axios.get(`${API_BASE}/api/billings/${slug}/history/${pid}`);
        if (res.data.success) setPatientHistory(res.data.data);
      } catch (e) { console.error(e); }
    })();
  }, [selectedPatient, slug]);

  /* ── Auto-add appointment fee (only for new invoices, not edit mode) ── */
  useEffect(() => {
    if (editMode) return; // don't override pre-filled items in edit mode
    if (selectedPatient?.fees) {
      setItems([{
        name: isRevisit ? 'Follow-up / Revisit Fee' : 'Consultation / Appointment Fee',
        price: Number(selectedPatient.fees),
        qty: 1,
        isApptFee: true,
      }]);
      setPaidAmount(Number(selectedPatient.fees));
    } else {
      setItems([]);
      setPaidAmount(0);
    }
  }, [selectedPatient]);

  /* ── All history ── */
  const fetchAllHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const res = await axios.get(`${API_BASE}/api/billings/${slug}/all`);
      if (res.data.success) setAllHistory(res.data.data);
    } catch (e) { console.error(e); }
    finally { setHistoryLoading(false); }
  }, [slug]);

  useEffect(() => { if (view === 'history') fetchAllHistory(); }, [view, fetchAllHistory]);

  /* ══════════════════════════════════════════════════════════════════════════
     BILLING ACTIONS
  ══════════════════════════════════════════════════════════════════════════ */

  /* ── Create new billing ── */
  const handleCreateBilling = (appt) => {
    resetForm();
    setSelectedPatient(appt);
    setView('form');
  };

  /* ── Update billing — opens form in edit mode with pre-filled data ── */
  const handleUpdateBilling = async (appt) => {
    const pid = getPatientId(appt);
    try {
      const res = await axios.get(`${API_BASE}/api/billings/${slug}/history/${pid}`);
      if (res.data.success && res.data.data.length > 0) {
        const inv = res.data.data[0];
        resetForm();
        setSelectedPatient(appt);
        setItems(inv.items || []);
        setDiscount(inv.discount || 0);
        setPaidAmount(inv.paidAmount || 0);
        setPaymentMode(inv.paymentMode || 'Cash');
        setEditMode(true);
        setEditInvoiceId(inv._id);
        setView('form');
      } else {
        alert('No existing invoice found. Please create one first.');
      }
    } catch (e) { alert('Error fetching invoice: ' + e.message); }
  };

  /* ── Download from queue row ── */
  const handleDownloadForAppt = async (appt) => {
    const pid = getPatientId(appt);
    setDownloadLoading(appt._id);
    try {
      const res = await axios.get(
        `${API_BASE}/api/billings/${slug}/history/${pid}`,
        { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }
      );
      if (res.data.success && res.data.data.length > 0) {
        downloadPDF(res.data.data[0], slug);
      } else {
        alert(`No invoice found to download (patientId: ${pid}).`);
      }
    } catch (e) {
      alert('Download failed: ' + e.message);
    } finally {
      setDownloadLoading(null);
    }
  };

  /* ── Generate new invoice ── */
  const handleGenerateInvoice = async () => {
    if (!selectedPatient || items.length === 0) {
      return alert('Select patient and add at least one item.');
    }
    setFormLoading(true);
    try {
      const payload = {
        patientId:      getPatientId(selectedPatient),
        appointmentId:  selectedPatient._id,
        patientName:    selectedPatient.patientName,
        mobile:         selectedPatient.mobile,
        visitType:      selectedPatient.visitType || selectedPatient.type,
        isRevisit,
        appointmentFee: selectedPatient.fees || 0,
        items,
        subTotal,
        discount:   Number(discount),
        grandTotal,
        paidAmount: Number(paidAmount),
        dueAmount:  effectiveDue,
        paymentMode,
      };

      const res = await axios.post(`${API_BASE}/api/billings/${slug}/create`, payload);

      if (res.data.success) {
        openPDFInNewTab(res.data.data, slug);
        resetForm();
        clearCache();
        fetchQueue(true);
        setView('queue');
      }
    } catch (e) {
      alert('Server Error: ' + e.message);
    } finally {
      setFormLoading(false);
    }
  };

  /* ── Update existing invoice and print ── */
  const handleUpdateAndPrint = async () => {
    if (!editInvoiceId) return;
    setFormLoading(true);
    try {
      const payload = {
        items,
        subTotal,
        discount:   Number(discount),
        grandTotal,
        paidAmount: Number(paidAmount),
        dueAmount:  Math.max(0, effectiveDue),
        paymentMode,
      };

      const res = await axios.put(
        `${API_BASE}/api/billings/${slug}/update/${editInvoiceId}`,
        payload
      );

      if (res.data.success) {
        openPDFInNewTab(res.data.data, slug);
        // update allHistory in place so history view is fresh
        setAllHistory(prev =>
          prev.map(inv => inv._id === res.data.data._id ? res.data.data : inv)
        );
        resetForm();
        clearCache();
        fetchQueue(true);
        setView('queue');
      }
    } catch (e) {
      alert('Update failed: ' + e.message);
    } finally {
      setFormLoading(false);
    }
  };

  /* ── Helpers ── */
  const statusTabColors = {
    'All':     { active: 'bg-slate-900 text-white',         inactive: 'text-slate-500 hover:text-slate-800'   },
    'Pending': { active: 'bg-blue-500 text-white',          inactive: 'text-blue-600 hover:bg-blue-50'        },
    'Billed':  { active: 'bg-emerald-500 text-white',       inactive: 'text-emerald-600 hover:bg-emerald-50'  },
  };

  const getBillingStatus = (appt) => {
    if (appt.isBilled) return { label: 'Billed',  bar: 'bg-emerald-100 text-emerald-600', dot: 'bg-emerald-600', pulse: false };
    return                    { label: 'Pending', bar: 'bg-blue-100 text-blue-600',       dot: 'bg-blue-600',    pulse: true  };
  };

  const isRev = (appt) =>
    appt.visitType === 'Revisit' || appt.visitType === 'Revisit Patient' ||
    appt.type === 'Revisit' || appt.isRevisit;

  const filteredHistory = allHistory.filter(inv =>
    inv.patientName?.toLowerCase().includes(historySearch.toLowerCase()) ||
    inv.invoiceNo?.toLowerCase().includes(historySearch.toLowerCase()) ||
    inv.mobile?.includes(historySearch)
  );

  /* ══════════════════════════════════════════════════════════════════════════
     RENDER
  ══════════════════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans text-slate-900">

      {/* ── HEADER ── */}
      <div className="p-6 md:p-10 pb-0">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">Billing System</span>
            </div>
            <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-800 flex items-center gap-3">
              Billing Studio <Receipt className="text-[#18afb1]" size={24} />
            </h1>
            <p className="text-[11px] font-semibold text-slate-400 mt-1">
              Showing only <span className="text-emerald-600 font-black">Completed</span> appointments
            </p>
          </div>

          <div className="flex items-center gap-3 ml-auto">
            <button
              onClick={() => fetchQueue(true)}
              disabled={loading}
              className="p-3 rounded-xl border border-slate-200 text-slate-400 hover:text-[#18afb1] hover:border-[#18afb1] transition-all disabled:opacity-40"
              title="Refresh Queue"
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
            </button>
            <button
              onClick={() => setView('history')}
              className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center gap-2"
            >
              <History size={16} /> History
            </button>
            <button
              onClick={() => { resetForm(); setView('form'); }}
              className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl hover:shadow-slate-200 transition-all active:scale-95 flex items-center gap-2"
            >
              <Plus size={16} /> New Invoice
            </button>
          </div>
        </div>
      </div>

      {/* ══════════════════════════════
          QUEUE VIEW
      ══════════════════════════════ */}
      {view === 'queue' && (
        <div className="px-6 md:px-10 pb-10">

          {/* ── FILTER PANEL ── */}
          <div className="mb-6 space-y-3">

            {/* Row 1 */}
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
              <div className="relative flex-1 max-w-sm">
                <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  placeholder="Search by name or mobile…"
                  className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-semibold text-slate-700 placeholder-slate-300 outline-none focus:border-[#18afb1] focus:shadow-[0_0_0_4px_rgba(24,175,177,0.08)] transition-all"
                />
                {searchText && (
                  <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                    <X size={14} />
                  </button>
                )}
              </div>

              <button
                onClick={() => setShowFilters(v => !v)}
                className={`flex items-center gap-2 px-5 py-3 rounded-2xl border-2 font-black text-[11px] uppercase tracking-widest transition-all
                  ${showFilters ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
              >
                <SlidersHorizontal size={14} />
                Filters
                {activeFilterCount > 0 && (
                  <span className={`w-5 h-5 rounded-full text-[9px] font-black flex items-center justify-center
                    ${showFilters ? 'bg-white text-slate-900' : 'bg-[#18afb1] text-white'}`}>
                    {activeFilterCount}
                  </span>
                )}
              </button>

              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border-2 border-red-100 text-red-400 bg-red-50 font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
                >
                  <X size={12} /> Reset
                </button>
              )}

              <div className="flex items-center gap-3 ml-auto">
                {[
                  { label: 'Total',   val: stats.total,   color: 'text-slate-600 bg-slate-100'    },
                  { label: 'Pending', val: stats.pending, color: 'text-blue-600 bg-blue-50'       },
                  { label: 'Billed',  val: stats.billed,  color: 'text-emerald-600 bg-emerald-50' },
                ].map(s => (
                  <div key={s.label} className={`px-3 py-1.5 rounded-xl ${s.color} text-center hidden sm:block`}>
                    <p className="text-lg font-black leading-none">{s.val}</p>
                    <p className="text-[8px] font-black uppercase tracking-wider opacity-70">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Row 2: Status + Visit tabs */}
            <div className="flex items-center gap-2 flex-wrap">
              {STATUS_OPTIONS.map(status => {
                const colors   = statusTabColors[status];
                const isActive = statusFilter === status;
                const count    = status === 'All'
                  ? appointments.length
                  : appointments.filter(a => (a.isBilled ? 'Billed' : 'Pending') === status).length;
                return (
                  <button
                    key={status}
                    onClick={() => setStatusFilter(status)}
                    className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border-2
                      ${isActive
                        ? `${colors.active} border-transparent shadow-md`
                        : `${colors.inactive} border-transparent bg-white`
                      }`}
                  >
                    {status}
                    <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black
                      ${isActive ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>
                      {count}
                    </span>
                  </button>
                );
              })}

              <div className="ml-auto flex items-center gap-1.5">
                <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Visit:</span>
                {VISIT_OPTIONS.map(v => (
                  <button
                    key={v}
                    onClick={() => setVisitFilter(v)}
                    className={`px-3 py-1.5 rounded-lg font-black text-[9px] uppercase tracking-wider border-2 transition-all
                      ${visitFilter === v
                        ? v === 'Revisit' ? 'bg-violet-600 text-white border-violet-600' : 'bg-[#18afb1] text-white border-[#18afb1]'
                        : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                      }`}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </div>

            {/* Row 3: Date filter panel */}
            {showFilters && (
              <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 space-y-5 shadow-sm">
                <div className="flex items-center gap-2 mb-1">
                  <CalendarDays size={15} className="text-[#18afb1]" />
                  <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date Filter</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {DATE_PRESET_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setDatePreset(opt.value)}
                      className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border-2
                        ${datePreset === opt.value
                          ? 'bg-[#18afb1] text-white border-[#18afb1] shadow-md shadow-[#18afb1]/20'
                          : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-[#18afb1] hover:text-[#18afb1]'
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {datePreset === 'custom' && (
                  <div className="flex flex-col sm:flex-row gap-4 pt-1">
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">From</label>
                      <input type="date" value={customStart} max={customEnd}
                        onChange={e => setCustomStart(e.target.value)} className="billing-input" />
                    </div>
                    <div className="flex-1 space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">To</label>
                      <input type="date" value={customEnd} min={customStart}
                        onChange={e => setCustomEnd(e.target.value)} className="billing-input" />
                    </div>
                  </div>
                )}
                {activeDateRange.start && (
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-4 py-2 rounded-xl w-fit">
                    <CalendarDays size={11} />
                    Showing: {activeDateRange.start === activeDateRange.end
                      ? activeDateRange.start
                      : `${activeDateRange.start} to ${activeDateRange.end}`}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* ── QUEUE TABLE ── */}
          <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {['Token', 'Patient Details', 'Mobile', 'Visit Date', 'Status', 'Actions'].map((h, i) => (
                    <th key={h} className={`p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest ${i >= 4 ? 'text-center' : ''} ${i === 5 ? 'text-right' : ''}`}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-50">
                {loading && appointments.length === 0 ? (
                  [...Array(5)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="p-5"><div className="w-10 h-10 bg-slate-100 rounded-xl" /></td>
                      <td className="p-5">
                        <div className="h-3.5 bg-slate-100 rounded w-32 mb-2" />
                        <div className="h-2.5 bg-slate-50 rounded w-20" />
                      </td>
                      <td className="p-4"><div className="h-3 bg-slate-100 rounded w-24" /></td>
                      <td className="p-4"><div className="h-3 bg-slate-100 rounded w-16" /></td>
                      <td className="p-5 text-center"><div className="h-6 bg-slate-100 rounded-full w-20 mx-auto" /></td>
                      <td className="p-5"><div className="h-8 bg-slate-100 rounded-lg w-36 ml-auto" /></td>
                    </tr>
                  ))
                ) : filteredQueue.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                          <Search size={20} className="text-slate-300" />
                        </div>
                        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">
                          {appointments.length > 0 ? 'No Records Match Filters' : 'No Completed Appointments Found'}
                        </p>
                        {appointments.length > 0 && (
                          <button onClick={resetFilters} className="text-[10px] font-black text-[#18afb1] uppercase tracking-widest hover:underline">
                            Clear Filters
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredQueue.map((appt) => {
                    const bs  = getBillingStatus(appt);
                    const rev = isRev(appt);

                    return (
                      <tr
                        key={appt._id}
                        className={`group hover:bg-slate-50/50 transition-colors ${appt.isBilled ? 'bg-emerald-50/20' : ''}`}
                      >
                        {/* Token */}
                        <td className="p-5">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm
                            ${appt.isBilled ? 'bg-emerald-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
                            {appt.tokenNumber ?? appt.patientId?._id?.slice(-4).toUpperCase() ?? '—'}
                          </div>
                        </td>

                        {/* Patient Info */}
                        <td className="p-5">
                          <span className="font-bold text-slate-800 text-sm uppercase tracking-tight block">
                            {searchText.trim() && appt.patientName?.toLowerCase().includes(searchText.toLowerCase())
                              ? appt.patientName.split(new RegExp(`(${searchText})`, 'gi')).map((part, i) =>
                                  part.toLowerCase() === searchText.toLowerCase()
                                    ? <mark key={i} className="bg-yellow-200 text-yellow-800 rounded px-0.5">{part}</mark>
                                    : part
                                )
                              : appt.patientName
                            }
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded
                              ${rev ? 'text-violet-500 bg-violet-50' : 'text-emerald-500 bg-emerald-50'}`}>
                              {rev ? 'REVISIT' : 'NEW'}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400">
                              ₹{appt.fees} • {appt.type || 'Walk-in'}
                            </span>
                          </div>
                        </td>

                        {/* Mobile */}
                        <td className="p-4">
                          <span className="text-[11px] font-bold text-slate-600">
                            {searchText.trim() && appt.mobile?.includes(searchText)
                              ? appt.mobile.split(new RegExp(`(${searchText})`, 'gi')).map((part, i) =>
                                  part === searchText
                                    ? <mark key={i} className="bg-yellow-200 text-yellow-800 rounded px-0.5">{part}</mark>
                                    : part
                                )
                              : appt.mobile
                            }
                          </span>
                        </td>

                        {/* Visit Date */}
                        <td className="p-4">
                          <span className="text-[11px] font-bold text-slate-600">
                            {new Date(appt.appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                          </span>
                        </td>

                        {/* Billing Status Badge */}
                        <td className="p-5 text-center">
                          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${bs.bar} ${bs.pulse ? 'animate-pulse' : ''}`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${bs.dot}`} />
                            {bs.label}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="p-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!appt.isBilled && (
                              <button
                                onClick={() => handleCreateBilling(appt)}
                                className="bg-[#18afb1] text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase flex items-center gap-1.5 shadow-lg shadow-[#18afb1]/20 hover:scale-105 transition-all"
                              >
                                <Receipt size={11} /> Create Invoice
                              </button>
                            )}
                            {appt.isBilled && (
                              <>
                                <button
                                  onClick={() => handleDownloadForAppt(appt)}
                                  disabled={downloadLoading === appt._id}
                                  className="billing-icon-btn text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 disabled:opacity-50"
                                  title="Download Latest Invoice PDF"
                                >
                                  {downloadLoading === appt._id
                                    ? <Loader2 size={13} className="animate-spin" />
                                    : <Download size={13} />
                                  }
                                </button>
                                <button
                                  onClick={() => handleUpdateBilling(appt)}
                                  className="billing-icon-btn text-violet-600 bg-violet-50 border-violet-100 hover:bg-violet-600 hover:text-white hover:border-violet-600"
                                  title="Edit / Update Invoice"
                                >
                                  <Edit3 size={13} />
                                </button>
                                <button
                                  onClick={() => handleCreateBilling(appt)}
                                  className="billing-icon-btn text-[#18afb1] bg-teal-50 border-teal-100 hover:bg-[#18afb1] hover:text-white hover:border-[#18afb1]"
                                  title="Create Additional Invoice"
                                >
                                  <PlusCircle size={13} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {/* Footer */}
            {!loading && filteredQueue.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  Showing {filteredQueue.length} of {appointments.length} completed records
                </span>
                {filteredQueue.length !== appointments.length && (
                  <button onClick={resetFilters} className="text-[10px] font-black text-[#18afb1] uppercase tracking-widest hover:underline">
                    Show All
                  </button>
                )}
              </div>
            )}

            {loading && appointments.length > 0 && (
              <div className="h-0.5 bg-slate-100 overflow-hidden">
                <div className="h-full bg-[#18afb1] animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: '40%' }} />
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          BILLING FORM VIEW
          (used for both Create & Edit)
      ══════════════════════════════ */}
      {view === 'form' && (
        <div className="px-6 md:px-10 pb-10">

          {/* Back button */}
          <button
            onClick={() => { resetForm(); setView('queue'); }}
            className="flex items-center gap-1.5 text-slate-500 hover:text-[#18afb1] text-[12px] font-black uppercase tracking-widest transition-colors mb-4"
          >
            <ChevronRight size={14} className="rotate-180" /> Back to Queue
          </button>

          {/* Edit mode banner */}
          {editMode && (
            <div className="flex items-center gap-3 mb-6 px-5 py-4 bg-violet-50 border-2 border-violet-100 rounded-2xl">
              <div className="w-9 h-9 rounded-xl bg-violet-100 flex items-center justify-center shrink-0">
                <Edit3 size={15} className="text-violet-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-violet-600 uppercase tracking-widest">Edit Mode — Updating Existing Invoice</p>
                <p className="text-[11px] text-violet-400 font-medium mt-0.5">All fields pre-filled from the latest invoice. Make changes and click Update &amp; Print.</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* LEFT */}
            <div className="lg:col-span-8 space-y-4">

              {/* Patient Search — hidden in edit mode since patient is already set */}
              {!editMode && (
                <div className="bg-white border border-slate-200 rounded-[24px] p-6 relative shadow-sm">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Search Patient / Appointment</p>
                  <div className="relative">
                    <Search size={15} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      className="billing-input pl-10"
                      placeholder="Search completed appointments by name or mobile..."
                      value={searchQuery}
                      onChange={e => setSearchQuery(e.target.value)}
                    />
                  </div>

                  {searchResults.length > 0 && (
                    <div className="absolute left-6 right-6 top-full mt-1 bg-white shadow-2xl rounded-2xl z-50 border border-slate-100 overflow-hidden">
                      {searchResults.map(app => {
                        const rev = app.visitType === 'Revisit' || app.visitType === 'Revisit Patient' || app.type === 'Revisit' || app.isRevisit;
                        return (
                          <div
                            key={app._id}
                            onClick={() => {
                              setSelectedPatient(app);
                              setSearchResults([]);
                              setSearchQuery('');
                              setDiscount(0);
                            }}
                            className="px-5 py-3.5 hover:bg-slate-50 cursor-pointer flex justify-between items-center border-b border-slate-50 last:border-0 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                                <User size={14} className="text-slate-500" />
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-bold text-slate-800">{app.patientName}</p>
                                  {rev && <span className="text-[8px] font-black bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded uppercase">Revisit</span>}
                                </div>
                                <p className="text-[10px] font-medium text-slate-400 mt-0.5">{app.mobile} · {app.visitType || app.type} · ₹{app.fees}</p>
                              </div>
                            </div>
                            <ChevronRight size={14} className="text-slate-300" />
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {selectedPatient && (
                <div className="space-y-4">
                  {/* Profile Banner */}
                  <div className={`rounded-[24px] p-6 flex justify-between items-center border-2 ${
                    isRevisit ? 'bg-violet-50 border-violet-100' : 'bg-[#f0fffe] border-teal-100'
                  }`}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isRevisit ? 'bg-violet-200' : 'bg-[#18afb1]/20'}`}>
                        <User size={20} className={isRevisit ? 'text-violet-600' : 'text-[#18afb1]'} />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Patient</span>
                          {isRevisit && (
                            <span className="text-[8px] font-black bg-violet-600 text-white px-2 py-0.5 rounded uppercase">Revisit</span>
                          )}
                          {editMode && (
                            <span className="text-[8px] font-black bg-violet-100 text-violet-700 px-2 py-0.5 rounded uppercase border border-violet-200">Editing Invoice</span>
                          )}
                        </div>
                        <h3 className="text-base font-black text-slate-800 uppercase tracking-tight">{selectedPatient.patientName}</h3>
                        <p className="text-[10px] font-medium text-slate-500 mt-0.5">{selectedPatient.mobile} · {selectedPatient.visitType || selectedPatient.type}</p>
                      </div>
                    </div>
                    {!editMode && (
                      <button
                        onClick={() => { setSelectedPatient(null); setItems([]); setDiscount(0); setPaidAmount(0); }}
                        className="p-2 rounded-xl border border-slate-200 bg-white text-slate-400 hover:text-slate-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>

                  {/* Fee Banner */}
                  {selectedPatient.fees > 0 && !editMode && (
                    <div className="bg-amber-50 border-2 border-amber-100 rounded-[24px] p-5 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
                        <Wallet size={16} className="text-amber-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">Appointment Fee Already Collected</p>
                        <p className="text-sm font-black text-amber-800 mt-0.5">
                          ₹{fmt(selectedPatient.fees)}
                          <span className="text-[10px] font-medium text-amber-500 ml-1">— paid at registration</span>
                        </p>
                      </div>
                    </div>
                  )}

                  {/* Add Service */}
                  <div className="bg-white border border-slate-200 rounded-[24px] p-6 shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-1 h-5 bg-[#18afb1] rounded-full" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                        {editMode ? 'Add / Modify Service Items' : 'Add Additional Service / Fee'}
                      </p>
                    </div>
                    <div className="flex flex-col md:flex-row gap-2.5">
                      <div className="flex-[2] relative">
                        <Stethoscope size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="text"
                          placeholder="Service name..."
                          className="billing-input pl-10"
                          value={manualFeeName}
                          onChange={e => setManualFeeName(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && manualFeeName && manualFeePrice) {
                              setItems([...items, { name: manualFeeName, price: Number(manualFeePrice), qty: 1 }]);
                              setManualFeeName(''); setManualFeePrice('');
                            }
                          }}
                        />
                      </div>
                      <div className="flex-1 relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-sm">₹</span>
                        <input
                          type="number"
                          placeholder="Price"
                          className="billing-input pl-8 font-black"
                          value={manualFeePrice}
                          onChange={e => setManualFeePrice(e.target.value)}
                          onKeyDown={e => {
                            if (e.key === 'Enter' && manualFeeName && manualFeePrice) {
                              setItems([...items, { name: manualFeeName, price: Number(manualFeePrice), qty: 1 }]);
                              setManualFeeName(''); setManualFeePrice('');
                            }
                          }}
                        />
                      </div>
                      <button
                        onClick={() => {
                          if (!manualFeeName || !manualFeePrice) return alert('Enter service name and price.');
                          setItems([...items, { name: manualFeeName, price: Number(manualFeePrice), qty: 1 }]);
                          setManualFeeName(''); setManualFeePrice('');
                        }}
                        className="flex items-center gap-1.5 bg-slate-900 hover:bg-[#18afb1] text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                      >
                        <CheckCircle2 size={13} /> Add
                      </button>
                    </div>
                  </div>

                  {/* Items Table */}
                  <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm overflow-hidden">
                    <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <FileText size={13} className="text-slate-400" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Billing Items</p>
                      </div>
                      <span className="text-[10px] font-black text-slate-300 uppercase">{items.length} item{items.length !== 1 ? 's' : ''}</span>
                    </div>
                    {items.length === 0 ? (
                      <p className="text-center text-slate-300 text-sm py-10">No items added yet</p>
                    ) : (
                      <table className="w-full">
                        <thead className="bg-slate-50/50 border-b border-slate-100">
                          <tr>
                            {['Description', 'Rate', 'Total', ''].map((h, i) => (
                              <th key={i} className={`p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest ${i > 0 ? 'text-right' : ''}`}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                          {items.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                              <td className="px-5 py-4 text-sm font-bold text-slate-700 flex items-center gap-2">
                                {item.isApptFee && (
                                  <span className="text-[8px] font-black bg-teal-50 text-[#18afb1] border border-teal-100 px-1.5 py-0.5 rounded uppercase">Appt</span>
                                )}
                                {item.name}
                              </td>
                              <td className="px-5 py-4 text-right text-sm font-bold text-slate-600">₹{fmt(item.price)}</td>
                              <td className="px-5 py-4 text-right text-sm font-black text-[#18afb1]">₹{fmt(item.price * (item.qty || 1))}</td>
                              <td className="py-4 pr-5 text-right">
                                <button
                                  onClick={() => setItems(items.filter((_, i) => i !== idx))}
                                  className="text-slate-300 hover:text-red-500 transition-colors"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>

                  {/* Previous Invoices */}
                  {patientHistory.length > 0 && (
                    <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm">
                      <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2">
                        <History size={13} className="text-slate-400" />
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Previous Invoices</p>
                      </div>
                      <div className="p-4 space-y-2">
                        {patientHistory.map(inv => {
                          const badge = paymentStatusBadge(inv.paidAmount, inv.grandTotal);
                          return (
                            <div key={inv._id} className="flex justify-between items-center px-4 py-3 bg-slate-50 rounded-2xl border border-slate-100 hover:border-[#18afb1]/30 transition-colors">
                              <div>
                                <span className="text-[12px] font-black text-slate-700">{inv.invoiceNo}</span>
                                <div className="flex items-center gap-2 mt-0.5">
                                  <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-full border uppercase flex items-center gap-1 ${badge.cls}`}>
                                    <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                                    {badge.label}
                                  </span>
                                  <span className="text-[10px] font-medium text-slate-400">₹{fmt(inv.grandTotal)} · {new Date(inv.createdAt).toLocaleDateString('en-IN')}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => openPDFInNewTab(inv, slug)}
                                  className="flex items-center gap-1 text-slate-500 hover:text-white text-[10px] font-black border border-slate-200 hover:bg-slate-700 hover:border-slate-700 px-2.5 py-1 rounded-lg bg-slate-50 transition-all uppercase tracking-widest"
                                >
                                  <Eye size={10} /> View
                                </button>
                                <button
                                  onClick={() => downloadPDF(inv, slug)}
                                  className="flex items-center gap-1 text-[#18afb1] hover:text-white text-[10px] font-black border border-teal-200 hover:bg-[#18afb1] hover:border-[#18afb1] px-2.5 py-1 rounded-lg bg-teal-50 transition-all uppercase tracking-widest"
                                >
                                  <Download size={10} /> PDF
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* RIGHT: Payment Panel */}
            <div className="lg:col-span-4">
              <div className="bg-white border border-slate-200 rounded-[24px] shadow-sm sticky top-6">
                <div className={`px-6 py-5 border-b border-slate-100 ${editMode ? 'bg-violet-50' : ''}`}>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    {editMode ? '✏️ Update Payment Summary' : 'Payment Summary'}
                  </p>
                </div>

                <div className="p-6 space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider">Sub-total</span>
                    <span className="text-sm font-black text-slate-700">₹{fmt(subTotal)}</span>
                  </div>

                  {selectedPatient?.fees > 0 && !editMode && (
                    <div className="flex justify-between items-center text-amber-600">
                      <span className="text-[10px] font-black uppercase tracking-wider flex items-center gap-1.5">
                        <Clock size={10} /> Appt. fee
                      </span>
                      <span className="text-[11px] font-black">₹{fmt(selectedPatient.fees)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      <Percent size={11} /> Discount
                    </span>
                    <input
                      type="number"
                      className="text-sm font-black text-[#18afb1] text-right w-24 py-1.5 px-2.5 border-2 border-slate-100 rounded-xl bg-slate-50 outline-none focus:border-[#18afb1] transition-all"
                      value={discount}
                      onChange={e => setDiscount(e.target.value)}
                    />
                  </div>

                  <div className="border-t-2 border-slate-100" />

                  <div className={`border-2 rounded-2xl p-5 text-center ${editMode ? 'bg-violet-50 border-violet-100' : 'bg-[#f0fffe] border-teal-100'}`}>
                    <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${editMode ? 'text-violet-600' : 'text-[#18afb1]'}`}>
                      Payable Amount
                    </p>
                    <p className={`text-4xl font-black ${editMode ? 'text-violet-600' : 'text-[#18afb1]'}`}>
                      ₹{fmt(grandTotal)}
                    </p>
                  </div>

                  {/* Payment Mode */}
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Payment Mode</p>
                    <div className="grid grid-cols-3 gap-1.5">
                      {['Cash', 'UPI', 'Card'].map(m => (
                        <button
                          key={m}
                          onClick={() => setPaymentMode(m)}
                          className={`py-2 rounded-xl text-[10px] font-black uppercase tracking-wider border-2 transition-all
                            ${paymentMode === m
                              ? editMode
                                ? 'bg-violet-600 border-violet-600 text-white shadow-md'
                                : 'bg-slate-900 border-slate-900 text-white shadow-md'
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                            }`}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Received Payment */}
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">
                      Received Payment
                      {isRevisit && !editMode && (
                        <span className="ml-2 text-violet-500 normal-case font-semibold">(pre-filled for revisit)</span>
                      )}
                    </p>
                    <input
                      type="number"
                      className="billing-input text-center text-xl font-black"
                      placeholder="0"
                      value={paidAmount}
                      onChange={e => setPaidAmount(e.target.value)}
                    />
                  </div>

                  <div className="bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 space-y-2">
                    <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      <span>Paid</span>
                      <span className="text-emerald-600">₹{fmt(paidAmount)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] font-black text-slate-500 uppercase tracking-wider">
                      <span>Balance Due</span>
                      <span className={effectiveDue > 0 ? 'text-red-500' : 'text-emerald-600'}>
                        ₹{fmt(Math.max(0, effectiveDue))}
                      </span>
                    </div>
                  </div>

                  {effectiveDue > 0 && (
                    <div className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-2xl border-2 border-red-100 text-red-500 text-[10px] font-black uppercase tracking-wider">
                      <AlertCircle size={12} />
                      Remaining Due: ₹{fmt(Math.max(0, effectiveDue))}
                    </div>
                  )}

                  <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 rounded-2xl border-2 border-blue-100 text-blue-500 text-[10px] font-semibold">
                    <Eye size={12} className="mt-0.5 shrink-0" />
                    {editMode
                      ? 'Invoice will be updated and opened in a new tab for printing.'
                      : 'Invoice saves to database and opens in a new tab for preview & printing.'
                    }
                  </div>

                  {/* ── Action Button(s) ── */}
                  {editMode ? (
                    <div className="flex flex-col gap-3">
                      <button
                        disabled={formLoading || items.length === 0}
                        onClick={handleUpdateAndPrint}
                        className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-[3px] shadow-2xl shadow-violet-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        {formLoading
                          ? <><Loader2 className="animate-spin" size={15} /> Updating...</>
                          : <><CheckCircle2 size={14} /> Update &amp; Print</>
                        }
                      </button>
                      <button
                        disabled={formLoading}
                        onClick={() => { resetForm(); setView('queue'); }}
                        className="w-full bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-500 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      disabled={formLoading || !selectedPatient || items.length === 0}
                      onClick={handleGenerateInvoice}
                      className="w-full bg-slate-900 hover:bg-[#18afb1] disabled:opacity-60 disabled:cursor-not-allowed text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-[4px] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {formLoading
                        ? <><Loader2 className="animate-spin" size={15} /> Processing...</>
                        : <><Printer size={14} /> Generate &amp; Save</>
                      }
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════
          HISTORY VIEW
      ══════════════════════════════ */}
      {view === 'history' && (
        <div className="px-6 md:px-10 pb-10">
          <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between mb-6">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-2 h-2 rounded-full bg-slate-300" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">All Records</span>
              </div>
              <h2 className="text-2xl font-black tracking-tighter uppercase text-slate-800">Invoice History</h2>
            </div>
            <div className="flex gap-3 items-center">
              <div className="relative">
                <Search size={13} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  className="pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-semibold text-slate-700 placeholder-slate-300 outline-none focus:border-[#18afb1] transition-all w-64"
                  placeholder="Search name / invoice / mobile..."
                  value={historySearch}
                  onChange={e => setHistorySearch(e.target.value)}
                />
              </div>
              <button
                onClick={fetchAllHistory}
                className="p-3 rounded-xl border border-slate-200 text-slate-400 hover:text-[#18afb1] hover:border-[#18afb1] transition-all"
              >
                <RefreshCw size={16} className={historyLoading ? 'animate-spin' : ''} />
              </button>
              <button
                onClick={() => setView('queue')}
                className="bg-slate-900 text-white px-6 py-3 rounded-2xl font-black text-[11px] uppercase tracking-widest hover:bg-[#18afb1] transition-all flex items-center gap-2"
              >
                <Activity size={14} /> Queue
              </button>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/50 border-b border-slate-100">
                  {['#', 'Invoice No.', 'Patient', 'Mobile', 'Type', 'Total', 'Paid', 'Due', 'Status', 'Date', 'Actions'].map((h, i) => (
                    <th key={h} className={`p-5 text-[10px] font-black text-slate-400 uppercase tracking-widest ${i >= 5 && i <= 7 ? 'text-right' : i >= 8 ? 'text-center' : ''}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historyLoading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      {[...Array(11)].map((_, j) => (
                        <td key={j} className="p-4"><div className="h-3 bg-slate-100 rounded w-full" /></td>
                      ))}
                    </tr>
                  ))
                ) : filteredHistory.length === 0 ? (
                  <tr>
                    <td colSpan="11" className="py-20 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center">
                          <Receipt size={20} className="text-slate-300" />
                        </div>
                        <p className="text-xs font-bold text-slate-300 uppercase tracking-widest">No Invoices Found</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredHistory.map((inv, idx) => {
                    const badge = paymentStatusBadge(inv.paidAmount, inv.grandTotal);
                    const rev   = inv.isRevisit || inv.visitType === 'Revisit' || inv.visitType === 'Revisit Patient';
                    return (
                      <tr key={inv._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="p-4 text-[10px] font-black text-slate-400">{idx + 1}</td>
                        <td className="p-4 text-[11px] font-black text-slate-700">{inv.invoiceNo}</td>
                        <td className="p-4">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
                              <User size={11} className="text-slate-500" />
                            </div>
                            <span className="text-[12px] font-bold text-slate-700">{inv.patientName}</span>
                          </div>
                        </td>
                        <td className="p-4 text-[11px] font-bold text-slate-500">{inv.mobile}</td>
                        <td className="p-4">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase
                            ${rev ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-teal-50 text-[#18afb1] border-teal-200'}`}>
                            {rev ? 'Revisit' : 'New'}
                          </span>
                        </td>
                        <td className="p-4 text-right text-[12px] font-black text-slate-700">₹{fmt(inv.grandTotal)}</td>
                        <td className="p-4 text-right text-[12px] font-black text-emerald-600">₹{fmt(inv.paidAmount)}</td>
                        <td className="p-4 text-right text-[12px] font-black">
                          <span className={inv.dueAmount > 0 ? 'text-red-500' : 'text-emerald-600'}>₹{fmt(inv.dueAmount)}</span>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`text-[8px] font-black px-2 py-0.5 rounded-full border uppercase inline-flex items-center gap-1 ${badge.cls}`}>
                            <span className={`w-1 h-1 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        </td>
                        <td className="p-4 text-center text-[10px] font-bold text-slate-400">
                          {new Date(inv.createdAt).toLocaleDateString('en-IN')}
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => openPDFInNewTab(inv, slug)}
                              className="billing-icon-btn text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-700 hover:text-white hover:border-slate-700"
                              title="Preview in new tab"
                            >
                              <Eye size={12} />
                            </button>
                            <button
                              onClick={() => downloadPDF(inv, slug)}
                              className="billing-icon-btn text-[#18afb1] bg-teal-50 border-teal-100 hover:bg-[#18afb1] hover:text-white hover:border-[#18afb1]"
                              title="Download PDF"
                            >
                              <Download size={12} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>

            {!historyLoading && filteredHistory.length > 0 && (
              <div className="px-6 py-4 border-t border-slate-50">
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
                  {filteredHistory.length} record{filteredHistory.length !== 1 ? 's' : ''}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        .billing-input {
          width: 100%;
          background: #f8fafc;
          border: 2px solid #f1f5f9;
          border-radius: 20px;
          padding: 16px 22px;
          font-size: 14px;
          font-weight: 800;
          color: #1e293b;
          outline: none;
          transition: 0.3s;
        }
        .billing-input:focus {
          border-color: #18afb1;
          background: #fff;
          box-shadow: 0 10px 30px -10px rgba(24, 175, 177, 0.15);
        }
        .billing-icon-btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border-radius: 8px;
          border-width: 1px;
          border-style: solid;
          transition: all 0.18s ease;
          flex-shrink: 0;
        }
        .billing-icon-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        @keyframes loading {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%);  }
        }
        mark { background: #fef08a; color: #854d0e; border-radius: 3px; padding: 0 2px; }
      `}</style>
    </div>
  );
};

export default BillingModule;