/**
 * BillingModule.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Root component for the billing system.
 * All business logic lives in useBillingData.js.
 * All PDF generation lives in pdfGenerator.js.
 *
 * Sub-views rendered inline (kept small and readable):
 *   • QueueView   — completed appointments table with filters
 *   • FormView    — create / edit invoice form
 *   • HistoryView — all invoices table
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { useParams } from 'react-router-dom';
import BillingPreviewModal from './BillingPreviewModal';

import {
  Search, User, FileText, Printer, Plus, Trash2, History,
  Download, CheckCircle2, Percent, Loader2, X, Stethoscope,
  RefreshCw, AlertCircle, Clock, Receipt, ChevronRight,
  Activity, Edit3, PlusCircle, BadgeCheck, Calendar,
  CalendarDays, SlidersHorizontal, Wallet, Eye,
} from 'lucide-react';

import { buildPDF, openPDFInNewTab, downloadPDF, fmt, paymentStatusBadge } from './pdfGenerator';

import useBillingData, {
  STATUS_OPTIONS, VISIT_OPTIONS, DATE_PRESET_OPTIONS,
  today, toLocalISO,
} from './useBillingData';


/* ══════════════════════════════════════════════════════════════════════════════
   TINY SHARED HELPERS (pure UI, no state)
══════════════════════════════════════════════════════════════════════════════ */

const getBillingStatus = (appt) =>
  appt.isBilled
    ? { label: 'Billed', bar: 'bg-emerald-100 text-emerald-600', dot: 'bg-emerald-600', pulse: false }
    : { label: 'Pending', bar: 'bg-blue-100 text-blue-600', dot: 'bg-blue-600', pulse: true };

const isRev = (appt) =>
  appt.visitType === 'Revisit' || appt.visitType === 'Revisit Patient' ||
  appt.type === 'Revisit' || appt.isRevisit;

const statusTabColors = {
  'All': { active: 'bg-slate-900 text-white', inactive: 'text-slate-500 hover:text-slate-800' },
  'Pending': { active: 'bg-blue-500 text-white', inactive: 'text-blue-600 hover:bg-blue-50' },
  'Billed': { active: 'bg-emerald-500 text-white', inactive: 'text-emerald-600 hover:bg-emerald-50' },
};

const Highlight = ({ text, query }) => {
  if (!query.trim()) return text;
  const parts = String(text).split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-yellow-200 text-yellow-800 rounded px-0.5">{part}</mark>
      : part
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   QUEUE VIEW
══════════════════════════════════════════════════════════════════════════════ */
const QueueView = ({ d }) => {
  const {
    appointments, loading, fetchQueue, filteredQueue, stats,
    showFilters, setShowFilters,
    searchText, setSearchText,
    statusFilter, setStatusFilter,
    visitFilter, setVisitFilter,
    datePreset, setDatePreset,
    customStart, setCustomStart,
    customEnd, setCustomEnd,
    activeDateRange, activeFilterCount, resetFilters,
    clinicInfo, downloadLoading,
    handleCreateBilling, handleUpdateBilling, handleDownloadForAppt,
    setView,
  } = d;

  const onPdf = (action, inv) => {
    if (action === 'download') downloadPDF(inv, clinicInfo);
    else openPDFInNewTab(inv, clinicInfo);
  };

  return (
    <div className="px-6 md:px-10 pb-10">

      {/* ── FILTER PANEL ── */}
      <div className="mb-6 space-y-3">

        {/* Row 1: search + filter toggle + stats */}
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
              { label: 'Total', val: stats.total, color: 'text-slate-600 bg-slate-100' },
              { label: 'Pending', val: stats.pending, color: 'text-blue-600 bg-blue-50' },
              { label: 'Billed', val: stats.billed, color: 'text-emerald-600 bg-emerald-50' },
            ].map(s => (
              <div key={s.label} className={`px-3 py-1.5 rounded-xl ${s.color} text-center hidden sm:block`}>
                <p className="text-lg font-black leading-none">{s.val}</p>
                <p className="text-[8px] font-black uppercase tracking-wider opacity-70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: status + visit tabs */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_OPTIONS.map(status => {
            const colors = statusTabColors[status];
            const isActive = statusFilter === status;
            const count = status === 'All'
              ? appointments.length
              : appointments.filter(a => (a.isBilled ? 'Billed' : 'Pending') === status).length;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider transition-all border-2
                  ${isActive ? `${colors.active} border-transparent shadow-md` : `${colors.inactive} border-transparent bg-white`}`}
              >
                {status}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${isActive ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>
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
                const bs = getBillingStatus(appt);
                const rev = isRev(appt);
                return (
                  <tr key={appt._id} className={`group hover:bg-slate-50/50 transition-colors ${appt.isBilled ? 'bg-emerald-50/20' : ''}`}>
                    <td className="p-5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm
                        ${appt.isBilled ? 'bg-emerald-500 text-white' : 'bg-blue-100 text-blue-600'}`}>
                        {appt.tokenNumber ?? appt.patientId?._id?.slice(-4).toUpperCase() ?? '—'}
                      </div>
                    </td>

                    <td className="p-5">
                      <span className="font-bold text-slate-800 text-sm uppercase tracking-tight block">
                        <Highlight text={appt.patientName} query={searchText} />
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${rev ? 'text-violet-500 bg-violet-50' : 'text-emerald-500 bg-emerald-50'}`}>
                          {rev ? 'REVISIT' : 'NEW'}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">₹{appt.fees} • {appt.type || 'Walk-in'}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <span className="text-[11px] font-bold text-slate-600">
                        <Highlight text={appt.mobile} query={searchText} />
                      </span>
                    </td>

                    <td className="p-4">
                      <span className="text-[11px] font-bold text-slate-600">
                        {new Date(appt.appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    </td>

                    <td className="p-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${bs.bar} ${bs.pulse ? 'animate-pulse' : ''}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${bs.dot}`} />
                        {bs.label}
                      </span>
                    </td>

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
                              onClick={() => handleDownloadForAppt(appt, onPdf)}
                              disabled={downloadLoading === appt._id}
                              className="billing-icon-btn text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600 disabled:opacity-50"
                              title="Download Latest Invoice PDF"
                            >
                              {downloadLoading === appt._id ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
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
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   FORM VIEW  (Create + Edit)
══════════════════════════════════════════════════════════════════════════════ */
const FormView = ({ d }) => {
  const {
    onPdfAction,clinicInfo,
    selectedPatient, setSelectedPatient,
    searchQuery, setSearchQuery,
    searchResults, setSearchResults,
    items, setItems,
    discount, setDiscount,
    paidAmount, setPaidAmount,
    paymentMode, setPaymentMode,
    formLoading,
    manualFeeName, setManualFeeName,
    manualFeePrice, setManualFeePrice,
    patientHistory,
    addManualItem,
    editMode,
    isRevisit, subTotal, grandTotal, due,
    handleGenerateInvoice, handleUpdateAndPrint,
    setView, resetForm,
  } = d;

  const onPdf =  onPdfAction;


  return (
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

        {/* ── LEFT COLUMN ── */}
        <div className="lg:col-span-8 space-y-4">

          {/* Patient search (new invoice only) */}
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

              {/* Profile banner */}
              <div className={`rounded-[24px] p-6 flex justify-between items-center border-2 ${isRevisit ? 'bg-violet-50 border-violet-100' : 'bg-[#f0fffe] border-teal-100'}`}>
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isRevisit ? 'bg-violet-200' : 'bg-[#18afb1]/20'}`}>
                    <User size={20} className={isRevisit ? 'text-violet-600' : 'text-[#18afb1]'} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active Patient</span>
                      {isRevisit && <span className="text-[8px] font-black bg-violet-600 text-white px-2 py-0.5 rounded uppercase">Revisit</span>}
                      {editMode && <span className="text-[8px] font-black bg-violet-100 text-violet-700 px-2 py-0.5 rounded uppercase border border-violet-200">Editing Invoice</span>}
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

              {/* Appointment fee notice */}
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

              {/* Add service */}
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
                      onKeyDown={e => { if (e.key === 'Enter') addManualItem(); }}
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
                      onKeyDown={e => { if (e.key === 'Enter') addManualItem(); }}
                    />
                  </div>
                  <button
                    onClick={addManualItem}
                    className="flex items-center gap-1.5 bg-slate-900 hover:bg-[#18afb1] text-white px-6 py-3 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all whitespace-nowrap"
                  >
                    <CheckCircle2 size={13} /> Add
                  </button>
                </div>
              </div>

              {/* Items table */}
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

              {/* Previous invoices */}
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
                                <span className={`w-1 h-1 rounded-full ${badge.dot}`} /> {badge.label}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400">₹{fmt(inv.grandTotal)} · {new Date(inv.createdAt).toLocaleDateString('en-IN')}</span>
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => openPDFInNewTab(inv, clinicInfo)}
                              className="flex items-center gap-1 text-slate-500 hover:text-white text-[10px] font-black border border-slate-200 hover:bg-slate-700 hover:border-slate-700 px-2.5 py-1 rounded-lg bg-slate-50 transition-all uppercase tracking-widest"
                            >
                              <Eye size={10} /> View
                            </button>
                            <button
                              onClick={() => downloadPDF(inv, clinicInfo)}
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

        {/* ── RIGHT COLUMN: Payment panel ── */}
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
                <p className={`text-[10px] font-black uppercase tracking-widest mb-1 ${editMode ? 'text-violet-600' : 'text-[#18afb1]'}`}>Payable Amount</p>
                <p className={`text-4xl font-black ${editMode ? 'text-violet-600' : 'text-[#18afb1]'}`}>₹{fmt(grandTotal)}</p>
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
                          ? editMode ? 'bg-violet-600 border-violet-600 text-white shadow-md' : 'bg-slate-900 border-slate-900 text-white shadow-md'
                          : 'bg-white border-slate-200 text-slate-500 hover:border-slate-400'
                        }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Received */}
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Received Payment</p>
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
                  <span className={due > 0 ? 'text-red-500' : 'text-emerald-600'}>₹{fmt(Math.max(0, due))}</span>
                </div>
              </div>

              {due > 0 && (
                <div className="flex items-center gap-2 px-4 py-3 bg-red-50 rounded-2xl border-2 border-red-100 text-red-500 text-[10px] font-black uppercase tracking-wider">
                  <AlertCircle size={12} />
                  Remaining Due: ₹{fmt(Math.max(0, due))}
                </div>
              )}

              <div className="flex items-start gap-2 px-4 py-3 bg-blue-50 rounded-2xl border-2 border-blue-100 text-blue-500 text-[10px] font-semibold">
                <Eye size={12} className="mt-0.5 shrink-0" />
                {editMode
                  ? 'Invoice will be updated and opened in a new tab for printing.'
                  : 'Invoice saves to database and opens in a new tab for preview & printing.'}
              </div>

              {/* Action button(s) */}
              {editMode ? (
                <div className="flex flex-col gap-3">
                  <button
                    disabled={formLoading || items.length === 0}
                    onClick={() => handleUpdateAndPrint(onPdf)}
                    className="w-full bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-[3px] shadow-2xl shadow-violet-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {formLoading ? <><Loader2 className="animate-spin" size={15} /> Updating...</> : <><CheckCircle2 size={14} /> Update &amp; Print</>}
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
                  onClick={() => handleGenerateInvoice(onPdf)}
                  className="w-full bg-slate-900 hover:bg-[#18afb1] disabled:opacity-60 disabled:cursor-not-allowed text-white py-4 rounded-2xl text-[11px] font-black uppercase tracking-[4px] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {formLoading ? <><Loader2 className="animate-spin" size={15} /> Processing...</> : <><Printer size={14} /> Generate &amp; Save</>}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   HISTORY VIEW
══════════════════════════════════════════════════════════════════════════════ */
const HistoryView = ({ d }) => {
  const {
    clinicInfo,
    filteredHistory, historySearch, setHistorySearch,
    historyLoading, fetchAllHistory,
    setView,
  } = d;

  return (
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
                  {[...Array(11)].map((_, j) => <td key={j} className="p-4"><div className="h-3 bg-slate-100 rounded w-full" /></td>)}
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
                const rev = inv.isRevisit || inv.visitType === 'Revisit' || inv.visitType === 'Revisit Patient';
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
                      <span className={`text-[8px] font-black px-2 py-0.5 rounded border uppercase ${rev ? 'bg-violet-50 text-violet-700 border-violet-200' : 'bg-teal-50 text-[#18afb1] border-teal-200'}`}>
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
                        <span className={`w-1 h-1 rounded-full ${badge.dot}`} /> {badge.label}
                      </span>
                    </td>
                    <td className="p-4 text-center text-[10px] font-bold text-slate-400">
                      {new Date(inv.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td className="p-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openPDFInNewTab(inv, clinicInfo)}
                          className="billing-icon-btn text-slate-500 bg-slate-50 border-slate-200 hover:bg-slate-700 hover:text-white hover:border-slate-700"
                          title="Preview in new tab"
                        >
                          <Eye size={12} />
                        </button>
                        <button
                          onClick={() => downloadPDF(inv, clinicInfo)}
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
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   ROOT COMPONENT
══════════════════════════════════════════════════════════════════════════════ */
const BillingModule = () => {
  const { slug } = useParams();
  const d = useBillingData(slug);
  const { view, setView, resetForm, loading, fetchQueue } = d;

  const [previewOpen, setPreviewOpen] = React.useState(false);
  const [previewPdf, setPreviewPdf] = React.useState(null);
  const [previewInv, setPreviewInv] = React.useState(null);

  const handlePdfAction = React.useCallback((action, inv) => {
    if (action === 'print') {
      const doc = buildPDF(inv, d.clinicInfo);
      setPreviewPdf(doc);
      setPreviewInv(inv);
      setPreviewOpen(true);
    } else {
      downloadPDF(inv, d.clinicInfo);
    }
  }, [d.clinicInfo]);

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

      {/* ── VIEWS ── */}
      {view === 'queue' && <QueueView d={d} />}
      {view === 'form' && <FormView d={{ ...d, onPdfAction: handlePdfAction }} />}
      {view === 'history' && <HistoryView d={d} />}



       <BillingPreviewModal
        isOpen={previewOpen}
        onClose={() => setPreviewOpen(false)}
        pdfDoc={previewPdf}
        inv={previewInv}
        slug={slug}
      />

      {/* ── GLOBAL STYLES ── */}
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