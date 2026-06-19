/**
 * BillingModule.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Root component for the billing system.
 * All business logic lives in useBillingData.js.
 * All PDF generation lives in pdfGenerator.js.
 *
 * Sub-views rendered inline:
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
  Activity, Edit3, PlusCircle, Calendar,
  CalendarDays, SlidersHorizontal, Wallet, Eye,
} from 'lucide-react';

import { buildPDF, openPDFInNewTab, downloadPDF, fmt, paymentStatusBadge } from './Pdfgenerator';

import useBillingData, {
  STATUS_OPTIONS, VISIT_OPTIONS, DATE_PRESET_OPTIONS,
  today, toLocalISO,
} from './Usebillingdata';

/* ─── Shared design tokens ─── */
const T = {
  border:    '1px solid #e5e7eb',
  borderFocus: '1px solid #6366f1',
  radius:    8,
  radiusLg:  10,
  bg:        '#ffffff',
  bgPage:    '#f9fafb',
  bgMuted:   '#f3f4f6',
  text:      '#111827',
  textMuted: '#6b7280',
  textXs:    '#9ca3af',
  accent:    '#4f46e5',
  accentBg:  '#eef2ff',
  success:   '#16a34a',
  successBg: '#f0fdf4',
  warning:   '#d97706',
  warningBg: '#fffbeb',
  danger:    '#dc2626',
  dangerBg:  '#fef2f2',
  violet:    '#7c3aed',
  violetBg:  '#f5f3ff',
};

const s = {
  /* Layout */
  page: {
    minHeight: '100vh',
    background: T.bgPage,
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", sans-serif',
    color: T.text,
    fontSize: 14,
  },
  pageInner: { padding: '24px 32px', maxWidth: 1400 },

  /* Header */
  header: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    paddingBottom: 20, borderBottom: T.border, marginBottom: 24,
  },
  headerLeft: {},
  pageTitle: { fontSize: 18, fontWeight: 600, color: T.text, margin: 0 },
  pageSubtitle: { fontSize: 12, color: T.textMuted, marginTop: 2 },
  headerActions: { display: 'flex', alignItems: 'center', gap: 8 },

  /* Buttons */
  btnPrimary: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', background: T.text, color: '#fff',
    border: 'none', borderRadius: T.radius, fontSize: 13, fontWeight: 500,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  btnSecondary: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', background: T.bg, color: T.text,
    border: T.border, borderRadius: T.radius, fontSize: 13, fontWeight: 500,
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  btnGhost: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 32, height: 32, padding: 0,
    background: T.bg, color: T.textMuted,
    border: T.border, borderRadius: T.radius,
    cursor: 'pointer',
  },
  btnDanger: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', background: '#fef2f2', color: T.danger,
    border: '1px solid #fecaca', borderRadius: T.radius, fontSize: 13, fontWeight: 500,
    cursor: 'pointer',
  },
  btnSuccess: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', background: T.successBg, color: T.success,
    border: '1px solid #bbf7d0', borderRadius: T.radius, fontSize: 13, fontWeight: 500,
    cursor: 'pointer',
  },
  btnAccent: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', background: T.accent, color: '#fff',
    border: 'none', borderRadius: T.radius, fontSize: 13, fontWeight: 500,
    cursor: 'pointer',
  },
  btnViolet: {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    padding: '7px 14px', background: T.violet, color: '#fff',
    border: 'none', borderRadius: T.radius, fontSize: 13, fontWeight: 500,
    cursor: 'pointer',
  },
  btnIconSm: {
    display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
    width: 28, height: 28, padding: 0,
    background: T.bg, color: T.textMuted,
    border: T.border, borderRadius: 6,
    cursor: 'pointer',
  },

  /* Card */
  card: {
    background: T.bg, border: T.border,
    borderRadius: T.radiusLg, overflow: 'hidden',
  },
  cardHeader: {
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    padding: '12px 16px', borderBottom: T.border,
  },
  cardHeaderTitle: { fontSize: 13, fontWeight: 500, color: T.text },
  cardBody: { padding: 16 },

  /* Form */
  field: { marginBottom: 14 },
  label: { display: 'block', fontSize: 12, color: T.textMuted, marginBottom: 5, fontWeight: 500 },
  input: {
    width: '100%', boxSizing: 'border-box',
    padding: '7px 10px', fontSize: 13,
    background: '#f9fafb', border: T.border,
    borderRadius: T.radius, color: T.text,
    outline: 'none', fontFamily: 'inherit',
  },
  textarea: {
    width: '100%', boxSizing: 'border-box',
    padding: '7px 10px', fontSize: 13,
    background: '#f9fafb', border: T.border,
    borderRadius: T.radius, color: T.text,
    outline: 'none', fontFamily: 'inherit',
    resize: 'none', lineHeight: 1.5,
  },

  /* Table */
  table: { width: '100%', borderCollapse: 'collapse' },
  th: {
    padding: '10px 14px', fontSize: 11, fontWeight: 600,
    color: T.textMuted, textAlign: 'left',
    borderBottom: T.border, background: '#f9fafb',
    textTransform: 'uppercase', letterSpacing: '0.04em',
  },
  td: {
    padding: '10px 14px', fontSize: 13,
    color: T.text, borderBottom: '1px solid #f3f4f6',
  },

  /* Badges */
  badgePending: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', fontSize: 11, fontWeight: 500,
    background: '#eff6ff', color: '#1d4ed8',
    borderRadius: 4, border: '1px solid #bfdbfe',
  },
  badgeBilled: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 8px', fontSize: 11, fontWeight: 500,
    background: T.successBg, color: T.success,
    borderRadius: 4, border: '1px solid #bbf7d0',
  },
  badgeNew: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 6px', fontSize: 10, fontWeight: 500,
    background: '#f0fdf4', color: '#15803d',
    borderRadius: 4,
  },
  badgeRevisit: {
    display: 'inline-flex', alignItems: 'center', gap: 4,
    padding: '2px 6px', fontSize: 10, fontWeight: 500,
    background: T.violetBg, color: T.violet,
    borderRadius: 4,
  },

  /* Divider */
  divider: { height: 1, background: '#f3f4f6', margin: '12px 0' },

  /* Stat pill */
  statPill: {
    padding: '4px 10px', borderRadius: 6,
    fontSize: 12, fontWeight: 500,
  },
};

/* ─── Tiny helpers ─── */
const getBillingStatus = (appt) =>
  appt.isBilled
    ? { label: 'Billed', style: s.badgeBilled }
    : { label: 'Pending', style: s.badgePending };

const isRev = (appt) =>
  appt.visitType === 'Revisit' || appt.visitType === 'Revisit Patient' ||
  appt.type === 'Revisit' || appt.isRevisit;

const Highlight = ({ text, query }) => {
  if (!query.trim()) return text;
  const parts = String(text).split(new RegExp(`(${query})`, 'gi'));
  return parts.map((part, i) =>
    part.toLowerCase() === query.toLowerCase()
      ? <mark key={i} style={{ background: '#fef9c3', color: '#854d0e', borderRadius: 2, padding: '0 2px' }}>{part}</mark>
      : part
  );
};

const Dot = ({ color }) => (
  <span style={{ display: 'inline-block', width: 6, height: 6, borderRadius: '50%', background: color, flexShrink: 0 }} />
);

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
    <div>
      {/* Filter bar */}
      <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Row 1 */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: '1 1 240px', maxWidth: 320 }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.textXs }} />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search by name or mobile…"
              style={{ ...s.input, paddingLeft: 32 }}
            />
            {searchText && (
              <button onClick={() => setSearchText('')} style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: T.textXs, display: 'flex' }}>
                <X size={13} />
              </button>
            )}
          </div>

          <button
            onClick={() => setShowFilters(v => !v)}
            style={{ ...s.btnSecondary, background: showFilters ? T.text : T.bg, color: showFilters ? '#fff' : T.text }}
          >
            <SlidersHorizontal size={13} />
            Filters
            {activeFilterCount > 0 && (
              <span style={{ background: showFilters ? 'rgba(255,255,255,0.2)' : T.accent, color: '#fff', borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 600 }}>
                {activeFilterCount}
              </span>
            )}
          </button>

          {activeFilterCount > 0 && (
            <button onClick={resetFilters} style={s.btnDanger}>
              <X size={12} /> Clear
            </button>
          )}

          {/* Stats */}
          <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
            {[
              { label: 'Total', val: stats.total, bg: T.bgMuted, color: T.textMuted },
              { label: 'Pending', val: stats.pending, bg: '#eff6ff', color: '#1d4ed8' },
              { label: 'Billed', val: stats.billed, bg: T.successBg, color: T.success },
            ].map(s2 => (
              <div key={s2.label} style={{ ...s.statPill, background: s2.bg, color: s2.color }}>
                <span style={{ fontWeight: 600 }}>{s2.val}</span>
                <span style={{ marginLeft: 4, fontSize: 11, opacity: 0.75 }}>{s2.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: status + visit tabs */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
          {STATUS_OPTIONS.map(status => {
            const isActive = statusFilter === status;
            const count = status === 'All'
              ? appointments.length
              : appointments.filter(a => (a.isBilled ? 'Billed' : 'Pending') === status).length;
            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                style={{
                  padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                  border: isActive ? 'none' : T.border,
                  background: isActive ? T.text : T.bg,
                  color: isActive ? '#fff' : T.textMuted,
                  cursor: 'pointer',
                }}
              >
                {status}
                <span style={{ marginLeft: 5, opacity: 0.65, fontSize: 11 }}>{count}</span>
              </button>
            );
          })}

          <div style={{ marginLeft: 'auto', display: 'flex', gap: 5, alignItems: 'center' }}>
            <span style={{ fontSize: 11, color: T.textXs }}>Visit:</span>
            {VISIT_OPTIONS.map(v => {
              const isActive = visitFilter === v;
              return (
                <button
                  key={v}
                  onClick={() => setVisitFilter(v)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                    border: isActive ? 'none' : T.border,
                    background: isActive ? (v === 'Revisit' ? T.violet : T.accent) : T.bg,
                    color: isActive ? '#fff' : T.textMuted,
                    cursor: 'pointer',
                  }}
                >
                  {v}
                </button>
              );
            })}
          </div>
        </div>

        {/* Date filter panel */}
        {showFilters && (
          <div style={{ ...s.card, padding: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              <CalendarDays size={13} style={{ color: T.textMuted }} />
              <span style={{ fontSize: 12, color: T.textMuted, fontWeight: 500 }}>Date range</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {DATE_PRESET_OPTIONS.map(opt => {
                const isActive = datePreset === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => setDatePreset(opt.value)}
                    style={{
                      padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                      border: isActive ? 'none' : T.border,
                      background: isActive ? T.accent : T.bg,
                      color: isActive ? '#fff' : T.textMuted,
                      cursor: 'pointer',
                    }}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {datePreset === 'custom' && (
              <div style={{ display: 'flex', gap: 12, marginTop: 12 }}>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>From</label>
                  <input type="date" value={customStart} max={customEnd} onChange={e => setCustomStart(e.target.value)} style={s.input} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={s.label}>To</label>
                  <input type="date" value={customEnd} min={customStart} onChange={e => setCustomEnd(e.target.value)} style={s.input} />
                </div>
              </div>
            )}
            {activeDateRange.start && (
              <div style={{ marginTop: 10, fontSize: 11, color: T.textMuted, background: T.bgMuted, padding: '5px 10px', borderRadius: 6, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                <CalendarDays size={11} />
                {activeDateRange.start === activeDateRange.end
                  ? activeDateRange.start
                  : `${activeDateRange.start} → ${activeDateRange.end}`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table */}
      <div style={s.card}>
        <table style={s.table}>
          <thead>
            <tr>
              {['Token', 'Patient', 'Mobile', 'Date', 'Status', 'Actions'].map((h, i) => (
                <th key={h} style={{ ...s.th, textAlign: i >= 4 ? 'center' : 'left', ...(i === 5 ? { textAlign: 'right' } : {}) }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading && appointments.length === 0 ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(6)].map((_, j) => (
                    <td key={j} style={s.td}>
                      <div style={{ height: 12, background: '#f3f4f6', borderRadius: 4, width: j === 1 ? 120 : 70 }} />
                    </td>
                  ))}
                </tr>
              ))
            ) : filteredQueue.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ ...s.td, textAlign: 'center', padding: '48px 16px', color: T.textXs }}>
                  <Search size={20} style={{ margin: '0 auto 8px', display: 'block', opacity: 0.3 }} />
                  {appointments.length > 0 ? 'No records match the current filters' : 'No completed appointments found'}
                  {appointments.length > 0 && (
                    <button onClick={resetFilters} style={{ display: 'block', margin: '6px auto 0', background: 'none', border: 'none', cursor: 'pointer', color: T.accent, fontSize: 12, fontWeight: 500 }}>
                      Clear filters
                    </button>
                  )}
                </td>
              </tr>
            ) : (
              filteredQueue.map((appt) => {
                const bs = getBillingStatus(appt);
                const rev = isRev(appt);
                return (
                  <tr key={appt._id} style={{ background: appt.isBilled ? '#fafffe' : 'transparent' }}>
                    <td style={s.td}>
                      <div style={{
                        width: 30, height: 30, borderRadius: 6,
                        background: appt.isBilled ? T.successBg : '#eff6ff',
                        color: appt.isBilled ? T.success : '#1d4ed8',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 11, fontWeight: 600,
                      }}>
                        {appt.tokenNumber ?? appt.patientId?._id?.slice(-3).toUpperCase() ?? '—'}
                      </div>
                    </td>

                    <td style={s.td}>
                      <div style={{ fontWeight: 500, fontSize: 13, color: T.text }}>
                        <Highlight text={appt.patientName} query={searchText} />
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                        <span style={rev ? s.badgeRevisit : s.badgeNew}>{rev ? 'Revisit' : 'New'}</span>
                        <span style={{ fontSize: 11, color: T.textXs }}>₹{appt.fees}</span>
                      </div>
                    </td>

                    <td style={{ ...s.td, color: T.textMuted, fontSize: 12 }}>
                      <Highlight text={appt.mobile} query={searchText} />
                    </td>

                    <td style={{ ...s.td, color: T.textMuted, fontSize: 12 }}>
                      {new Date(appt.appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>

                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <span style={bs.style}>
                        <Dot color={appt.isBilled ? T.success : '#1d4ed8'} />
                        {bs.label}
                      </span>
                    </td>

                    <td style={{ ...s.td, textAlign: 'right' }}>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 6 }}>
                        {!appt.isBilled && (
                          <button onClick={() => handleCreateBilling(appt)} style={s.btnPrimary}>
                            <Receipt size={12} /> Create invoice
                          </button>
                        )}
                        {appt.isBilled && (
                          <>
                            <button
                              onClick={() => handleDownloadForAppt(appt, onPdf)}
                              disabled={downloadLoading === appt._id}
                              style={s.btnIconSm}
                              title="Download PDF"
                            >
                              {downloadLoading === appt._id ? <Loader2 size={12} style={{ animation: 'spin 1s linear infinite' }} /> : <Download size={12} />}
                            </button>
                            <button onClick={() => handleUpdateBilling(appt)} style={s.btnIconSm} title="Edit invoice">
                              <Edit3 size={12} />
                            </button>
                            <button onClick={() => handleCreateBilling(appt)} style={s.btnIconSm} title="New invoice">
                              <PlusCircle size={12} />
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
          <div style={{ padding: '10px 16px', borderTop: T.border, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 11, color: T.textXs }}>
              Showing {filteredQueue.length} of {appointments.length} records
            </span>
            {filteredQueue.length !== appointments.length && (
              <button onClick={resetFilters} style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.accent, fontSize: 12, fontWeight: 500 }}>
                Show all
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════════════════════════════════
   FORM VIEW
══════════════════════════════════════════════════════════════════════════════ */
const FormView = ({ d }) => {
  const {
    onPdfAction, clinicInfo,
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

  return (
    <div>
      {/* Back */}
      <button
        onClick={() => { resetForm(); setView('queue'); }}
        style={{ ...s.btnGhost, width: 'auto', padding: '6px 12px', marginBottom: 16, fontSize: 12, color: T.textMuted }}
      >
        <ChevronRight size={13} style={{ transform: 'rotate(180deg)' }} />
        Back to queue
      </button>

      {/* Edit mode notice */}
      {editMode && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: T.violetBg, border: '1px solid #ddd6fe', borderRadius: T.radius, marginBottom: 16 }}>
          <Edit3 size={14} style={{ color: T.violet }} />
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: T.violet }}>Editing existing invoice</div>
            <div style={{ fontSize: 11, color: '#7c3aed99', marginTop: 1 }}>Fields pre-filled from latest invoice. Update and re-print when done.</div>
          </div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16, alignItems: 'start' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Patient search */}
          {!editMode && (
            <div style={{ ...s.card, position: 'relative' }}>
              <div style={s.cardHeader}>
                <span style={s.cardHeaderTitle}>Search patient</span>
              </div>
              <div style={{ padding: 16, position: 'relative' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.textXs }} />
                  <input
                    style={{ ...s.input, paddingLeft: 32 }}
                    placeholder="Name or mobile from completed appointments…"
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                  />
                </div>

                {searchResults.length > 0 && (
                  <div style={{
                    position: 'absolute', left: 16, right: 16, top: 'calc(100% - 4px)',
                    background: T.bg, border: T.border, borderRadius: T.radius,
                    boxShadow: '0 8px 24px rgba(0,0,0,0.08)', zIndex: 50, overflow: 'hidden',
                  }}>
                    {searchResults.map(app => {
                      const rev = app.visitType === 'Revisit' || app.visitType === 'Revisit Patient' || app.type === 'Revisit' || app.isRevisit;
                      return (
                        <div
                          key={app._id}
                          onClick={() => { setSelectedPatient(app); setSearchResults([]); setSearchQuery(''); setDiscount(0); }}
                          style={{ padding: '10px 14px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                          onMouseEnter={e => e.currentTarget.style.background = T.bgMuted}
                          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 6, background: T.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <User size={13} style={{ color: T.textMuted }} />
                            </div>
                            <div>
                              <div style={{ fontSize: 13, fontWeight: 500, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                                {app.patientName}
                                {rev && <span style={s.badgeRevisit}>Revisit</span>}
                              </div>
                              <div style={{ fontSize: 11, color: T.textXs, marginTop: 1 }}>{app.mobile} · {app.visitType || app.type} · ₹{app.fees}</div>
                            </div>
                          </div>
                          <ChevronRight size={13} style={{ color: T.textXs }} />
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {selectedPatient && (
            <>
              {/* Patient info */}
              <div style={{ ...s.card }}>
                <div style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: T.border }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 32, height: 32, borderRadius: 6, background: isRevisit ? T.violetBg : T.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <User size={14} style={{ color: isRevisit ? T.violet : T.accent }} />
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 500, color: T.text, display: 'flex', alignItems: 'center', gap: 6 }}>
                        {selectedPatient.patientName}
                        {isRevisit && <span style={s.badgeRevisit}>Revisit</span>}
                        {editMode && <span style={{ ...s.badgeRevisit, background: T.violetBg }}>Editing</span>}
                      </div>
                      <div style={{ fontSize: 11, color: T.textXs, marginTop: 1 }}>
                        {selectedPatient.mobile} · {selectedPatient.visitType || selectedPatient.type}
                      </div>
                    </div>
                  </div>
                  {!editMode && (
                    <button
                      onClick={() => { setSelectedPatient(null); setItems([]); setDiscount(0); setPaidAmount(0); }}
                      style={s.btnIconSm}
                    >
                      <X size={13} />
                    </button>
                  )}
                </div>

                {selectedPatient.fees > 0 && !editMode && (
                  <div style={{ padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, borderBottom: T.border, background: T.warningBg }}>
                    <Wallet size={13} style={{ color: T.warning }} />
                    <span style={{ fontSize: 12, color: T.warning }}>
                      Appointment fee of <strong>₹{fmt(selectedPatient.fees)}</strong> already collected at registration
                    </span>
                  </div>
                )}

                {/* Add service */}
                <div style={{ padding: 16 }}>
                  <div style={{ fontSize: 12, color: T.textMuted, fontWeight: 500, marginBottom: 10 }}>
                    {editMode ? 'Add / modify items' : 'Add service item'}
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <div style={{ flex: 2, position: 'relative' }}>
                      <Stethoscope size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.textXs }} />
                      <input
                        type="text"
                        placeholder="Service name"
                        style={{ ...s.input, paddingLeft: 30 }}
                        value={manualFeeName}
                        onChange={e => setManualFeeName(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addManualItem(); }}
                      />
                    </div>
                    <div style={{ flex: 1, position: 'relative' }}>
                      <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.textMuted, fontSize: 13, fontWeight: 500 }}>₹</span>
                      <input
                        type="number"
                        placeholder="Price"
                        style={{ ...s.input, paddingLeft: 22 }}
                        value={manualFeePrice}
                        onChange={e => setManualFeePrice(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') addManualItem(); }}
                      />
                    </div>
                    <button onClick={addManualItem} style={s.btnPrimary}>
                      <Plus size={13} /> Add
                    </button>
                  </div>
                </div>
              </div>

              {/* Items table */}
              <div style={s.card}>
                <div style={{ ...s.cardHeader }}>
                  <span style={s.cardHeaderTitle}>
                    <FileText size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: -1 }} />
                    Billing items
                  </span>
                  <span style={{ fontSize: 11, color: T.textXs }}>{items.length} item{items.length !== 1 ? 's' : ''}</span>
                </div>
                {items.length === 0 ? (
                  <div style={{ padding: '32px 16px', textAlign: 'center', color: T.textXs, fontSize: 13 }}>
                    No items added yet
                  </div>
                ) : (
                  <table style={s.table}>
                    <thead>
                      <tr>
                        <th style={s.th}>Description</th>
                        <th style={{ ...s.th, textAlign: 'right' }}>Rate</th>
                        <th style={{ ...s.th, textAlign: 'right' }}>Total</th>
                        <th style={{ ...s.th, width: 40 }} />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item, idx) => (
                        <tr key={idx}>
                          <td style={s.td}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              {item.isApptFee && (
                                <span style={{ ...s.badgeNew, fontSize: 10 }}>Appt</span>
                              )}
                              {item.name}
                            </div>
                          </td>
                          <td style={{ ...s.td, textAlign: 'right', color: T.textMuted }}>₹{fmt(item.price)}</td>
                          <td style={{ ...s.td, textAlign: 'right', fontWeight: 500 }}>₹{fmt(item.price * (item.qty || 1))}</td>
                          <td style={{ ...s.td, textAlign: 'right' }}>
                            <button
                              onClick={() => setItems(items.filter((_, i) => i !== idx))}
                              style={{ background: 'none', border: 'none', cursor: 'pointer', color: T.textXs, display: 'flex', alignItems: 'center' }}
                              onMouseEnter={e => e.currentTarget.style.color = T.danger}
                              onMouseLeave={e => e.currentTarget.style.color = T.textXs}
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
                <div style={s.card}>
                  <div style={s.cardHeader}>
                    <span style={s.cardHeaderTitle}>
                      <History size={13} style={{ display: 'inline', marginRight: 6, verticalAlign: -1 }} />
                      Previous invoices
                    </span>
                  </div>
                  <div style={{ padding: '8px 16px 16px' }}>
                    {patientHistory.map(inv => {
                      const badge = paymentStatusBadge(inv.paidAmount, inv.grandTotal);
                      return (
                        <div key={inv._id} style={{
                          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                          padding: '8px 12px', background: T.bgMuted, borderRadius: T.radius, marginTop: 8,
                        }}>
                          <div>
                            <div style={{ fontSize: 12, fontWeight: 500, color: T.text }}>{inv.invoiceNo}</div>
                            <div style={{ fontSize: 11, color: T.textXs, marginTop: 2 }}>
                              ₹{fmt(inv.grandTotal)} · {new Date(inv.createdAt).toLocaleDateString('en-IN')}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => openPDFInNewTab(inv, clinicInfo)} style={s.btnIconSm} title="Preview">
                              <Eye size={12} />
                            </button>
                            <button onClick={() => downloadPDF(inv, clinicInfo)} style={s.btnIconSm} title="Download">
                              <Download size={12} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Right column: Payment panel */}
        <div style={{ position: 'sticky', top: 20 }}>
          <div style={s.card}>
            <div style={{ ...s.cardHeader, background: editMode ? T.violetBg : T.bg }}>
              <span style={{ ...s.cardHeaderTitle, color: editMode ? T.violet : T.text }}>
                {editMode ? 'Update payment' : 'Payment summary'}
              </span>
            </div>
            <div style={{ padding: 16 }}>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <span style={{ fontSize: 12, color: T.textMuted }}>Subtotal</span>
                <span style={{ fontSize: 13, fontWeight: 500 }}>₹{fmt(subTotal)}</span>
              </div>

              {selectedPatient?.fees > 0 && !editMode && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontSize: 12, color: T.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                    <Clock size={11} /> Appt. fee
                  </span>
                  <span style={{ fontSize: 12, color: T.warning }}>₹{fmt(selectedPatient.fees)}</span>
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontSize: 12, color: T.textMuted, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Percent size={11} /> Discount (%)

                </span>
                <input
    type="number"
    min="0"
    max="100"
    style={{ ...s.input, width: 70, textAlign: 'right', padding: '5px 8px' }}
    value={discount}
    onChange={e => setDiscount(Math.min(100, Math.max(0, e.target.value)))}
  />
              </div>

              <div style={s.divider} />

              {/* Grand total */}
              <div style={{
                background: editMode ? T.violetBg : T.accentBg,
                borderRadius: T.radius, padding: '14px 16px', textAlign: 'center', marginBottom: 14,
              }}>
                <div style={{ fontSize: 11, color: editMode ? T.violet : T.accent, marginBottom: 4, fontWeight: 500 }}>Payable amount</div>
                <div style={{ fontSize: 26, fontWeight: 600, color: editMode ? T.violet : T.accent }}>₹{fmt(grandTotal)}</div>
              </div>

              {/* Payment mode */}
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6, fontWeight: 500 }}>Payment mode</div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6 }}>
                  {['Cash', 'UPI', 'Card'].map(m => (
                    <button
                      key={m}
                      onClick={() => setPaymentMode(m)}
                      style={{
                        padding: '6px 0', border: T.border, borderRadius: T.radius, fontSize: 12, fontWeight: 500,
                        cursor: 'pointer',
                        background: paymentMode === m ? T.text : T.bg,
                        color: paymentMode === m ? '#fff' : T.textMuted,
                        ...(paymentMode === m ? { border: 'none' } : {}),
                      }}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Received */}
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12, color: T.textMuted, marginBottom: 6, fontWeight: 500 }}>Amount received</div>
                <input
                  type="number"
                  style={{ ...s.input, textAlign: 'center', fontSize: 18, fontWeight: 600 }}
                  placeholder="0"
                  value={paidAmount}
                  onChange={e => setPaidAmount(e.target.value)}
                />
              </div>

              {/* Paid / Due summary */}
              <div style={{ background: T.bgMuted, borderRadius: T.radius, padding: '10px 12px', marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
                  <span style={{ color: T.textMuted }}>Paid</span>
                  <span style={{ color: T.success, fontWeight: 500 }}>₹{fmt(paidAmount)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                  <span style={{ color: T.textMuted }}>Balance due</span>
                  <span style={{ color: due > 0 ? T.danger : T.success, fontWeight: 500 }}>₹{fmt(Math.max(0, due))}</span>
                </div>
              </div>

              {due > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 12px', background: T.dangerBg, border: '1px solid #fecaca', borderRadius: T.radius, fontSize: 12, color: T.danger, marginBottom: 12 }}>
                  <AlertCircle size={12} />
                  Due: ₹{fmt(Math.max(0, due))}
                </div>
              )}

              {/* Info note */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 6, padding: '8px 12px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: T.radius, fontSize: 11, color: '#1d4ed8', marginBottom: 14 }}>
                <Eye size={11} style={{ marginTop: 1, flexShrink: 0 }} />
                {editMode
                  ? 'Invoice will be updated and opened for printing.'
                  : 'Invoice saves to database and opens for preview.'}
              </div>

              {/* Action buttons */}
              {editMode ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button
                    disabled={formLoading || items.length === 0}
                    onClick={() => handleUpdateAndPrint(onPdfAction)}
                    style={{ ...s.btnViolet, width: '100%', justifyContent: 'center', padding: '10px 0', fontSize: 13, opacity: formLoading || items.length === 0 ? 0.5 : 1, cursor: formLoading || items.length === 0 ? 'not-allowed' : 'pointer' }}
                  >
                    {formLoading
                      ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Updating…</>
                      : <><CheckCircle2 size={14} /> Update &amp; print</>
                    }
                  </button>
                  <button
                    disabled={formLoading}
                    onClick={() => { resetForm(); setView('queue'); }}
                    style={{ ...s.btnSecondary, width: '100%', justifyContent: 'center', padding: '9px 0', fontSize: 13 }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  disabled={formLoading || !selectedPatient || items.length === 0}
                  onClick={() => handleGenerateInvoice(onPdfAction)}
                  style={{
                    ...s.btnPrimary, width: '100%', justifyContent: 'center', padding: '10px 0', fontSize: 13,
                    opacity: formLoading || !selectedPatient || items.length === 0 ? 0.5 : 1,
                    cursor: formLoading || !selectedPatient || items.length === 0 ? 'not-allowed' : 'pointer',
                  }}
                >
                  {formLoading
                    ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Processing…</>
                    : <><Printer size={14} /> Generate &amp; save</>
                  }
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
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ fontSize: 16, fontWeight: 600, margin: 0, color: T.text }}>Invoice history</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ position: 'relative' }}>
            <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: T.textXs }} />
            <input
              style={{ ...s.input, paddingLeft: 30, width: 240 }}
              placeholder="Name, invoice no., mobile…"
              value={historySearch}
              onChange={e => setHistorySearch(e.target.value)}
            />
          </div>
          <button onClick={fetchAllHistory} style={s.btnGhost} title="Refresh">
            <RefreshCw size={14} style={historyLoading ? { animation: 'spin 1s linear infinite' } : {}} />
          </button>
          <button onClick={() => setView('queue')} style={s.btnSecondary}>
            <Activity size={13} /> Queue
          </button>
        </div>
      </div>

      <div style={s.card}>
        <table style={s.table}>
          <thead>
            <tr>
              {['#', 'Invoice', 'Patient', 'Mobile', 'Type', 'Total', 'Paid', 'Due', 'Status', 'Date', 'Actions'].map((h, i) => (
                <th key={h} style={{ ...s.th, textAlign: i >= 5 && i <= 7 ? 'right' : i >= 8 ? 'center' : 'left' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {historyLoading ? (
              [...Array(4)].map((_, i) => (
                <tr key={i}>
                  {[...Array(11)].map((_, j) => (
                    <td key={j} style={s.td}><div style={{ height: 11, background: '#f3f4f6', borderRadius: 4 }} /></td>
                  ))}
                </tr>
              ))
            ) : filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={11} style={{ ...s.td, textAlign: 'center', padding: '48px 16px', color: T.textXs }}>
                  <Receipt size={20} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.3 }} />
                  No invoices found
                </td>
              </tr>
            ) : (
              filteredHistory.map((inv, idx) => {
                const badge = paymentStatusBadge(inv.paidAmount, inv.grandTotal);
                const rev = inv.isRevisit || inv.visitType === 'Revisit' || inv.visitType === 'Revisit Patient';
                return (
                  <tr key={inv._id}>
                    <td style={{ ...s.td, color: T.textXs, fontSize: 11 }}>{idx + 1}</td>
                    <td style={{ ...s.td, fontSize: 12, fontWeight: 500 }}>{inv.invoiceNo}</td>
                    <td style={s.td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ width: 26, height: 26, borderRadius: 6, background: T.bgMuted, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <User size={11} style={{ color: T.textMuted }} />
                        </div>
                        <span style={{ fontSize: 13, fontWeight: 500 }}>{inv.patientName}</span>
                      </div>
                    </td>
                    <td style={{ ...s.td, color: T.textMuted, fontSize: 12 }}>{inv.mobile}</td>
                    <td style={s.td}>
                      <span style={rev ? s.badgeRevisit : s.badgeNew}>{rev ? 'Revisit' : 'New'}</span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'right', fontWeight: 500 }}>₹{fmt(inv.grandTotal)}</td>
                    <td style={{ ...s.td, textAlign: 'right', color: T.success, fontWeight: 500 }}>₹{fmt(inv.paidAmount)}</td>
                    <td style={{ ...s.td, textAlign: 'right', fontWeight: 500, color: inv.dueAmount > 0 ? T.danger : T.success }}>
                      ₹{fmt(inv.dueAmount)}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <span style={{
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                        padding: '2px 8px', fontSize: 11, fontWeight: 500,
                        background: badge.bg, color: badge.color,
                        borderRadius: 4,
                      }}>
                        <Dot color={badge.dotColor} />
                        {badge.label}
                      </span>
                    </td>
                    <td style={{ ...s.td, textAlign: 'center', fontSize: 12, color: T.textMuted }}>
                      {new Date(inv.createdAt).toLocaleDateString('en-IN')}
                    </td>
                    <td style={{ ...s.td, textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: 5, justifyContent: 'center' }}>
                        <button onClick={() => openPDFInNewTab(inv, clinicInfo)} style={s.btnIconSm} title="Preview">
                          <Eye size={12} />
                        </button>
                        <button onClick={() => downloadPDF(inv, clinicInfo)} style={s.btnIconSm} title="Download">
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
          <div style={{ padding: '10px 16px', borderTop: T.border }}>
            <span style={{ fontSize: 11, color: T.textXs }}>{filteredHistory.length} record{filteredHistory.length !== 1 ? 's' : ''}</span>
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

  const navItems = [
    { key: 'queue', label: 'Queue', icon: <Activity size={13} /> },
    { key: 'history', label: 'History', icon: <History size={13} /> },
  ];

  return (
    <div style={s.page}>
      <div style={s.pageInner}>

        {/* Header */}
        <div style={s.header}>
          <div style={s.headerLeft}>
            <h1 style={s.pageTitle}>
              Billing
              <span style={{ display: 'inline-flex', alignItems: 'center', marginLeft: 8, padding: '2px 8px', background: '#f0fdf4', color: T.success, borderRadius: 4, fontSize: 11, fontWeight: 500, verticalAlign: 'middle' }}>
                <Dot color={T.success} />
                <span style={{ marginLeft: 4 }}>Live</span>
              </span>
            </h1>
            <p style={s.pageSubtitle}>Showing completed appointments only</p>
          </div>

          <div style={s.headerActions}>
            {/* Nav tabs */}
            <div style={{ display: 'flex', background: T.bgMuted, borderRadius: T.radius, padding: 3, gap: 2, marginRight: 8 }}>
              {navItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => { if (item.key === 'queue') resetForm(); setView(item.key); }}
                  style={{
                    display: 'inline-flex', alignItems: 'center', gap: 5,
                    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
                    border: 'none', cursor: 'pointer',
                    background: view === item.key ? T.bg : 'transparent',
                    color: view === item.key ? T.text : T.textMuted,
                    boxShadow: view === item.key ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => fetchQueue(true)}
              disabled={loading}
              style={{ ...s.btnGhost, opacity: loading ? 0.4 : 1 }}
              title="Refresh"
            >
              <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            </button>

            <button
              onClick={() => { resetForm(); setView('form'); }}
              style={s.btnPrimary}
            >
              <Plus size={13} /> New invoice
            </button>
          </div>
        </div>

        {/* Views */}
        {view === 'queue'   && <QueueView d={d} />}
        {view === 'form'    && <FormView d={{ ...d, onPdfAction: handlePdfAction }} />}
        {view === 'history' && <HistoryView d={d} />}

        <BillingPreviewModal
          isOpen={previewOpen}
          onClose={() => setPreviewOpen(false)}
          pdfDoc={previewPdf}
          inv={previewInv}
          slug={slug}
        />
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        * { box-sizing: border-box; }
        input:focus, textarea:focus, select:focus {
          outline: none;
          border-color: #6366f1 !important;
          background: #fff !important;
        }
        tr:last-child td { border-bottom: none; }
        button:disabled { cursor: not-allowed !important; }
      `}</style>
    </div>
  );
};

export default BillingModule;