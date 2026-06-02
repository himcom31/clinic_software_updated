import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Clock, Plus, Search, CheckCircle2, XCircle, Loader2, Activity,
  X, UserCheck, Wallet, RefreshCw, PlusCircle, ListFilter, ChevronDown,
  CalendarDays, Download, FilePen, FileText, LayoutGrid, AlertCircle
} from 'lucide-react';

const API_BAS = import.meta.env.VITE_API_URL;

// ─── Inject Google Font once ──────────────────────────────────────────────────
if (typeof document !== 'undefined' && !document.getElementById('appt-dm-font')) {
  const link = document.createElement('link');
  link.id = 'appt-dm-font';
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&family=DM+Mono:wght@400;500&display=swap';
  document.head.appendChild(link);
}

// ─── Cache ────────────────────────────────────────────────────────────────────
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

// ─── Date helpers ─────────────────────────────────────────────────────────────
const toLocalISO = (date) => date.toISOString().split('T')[0];
const today = toLocalISO(new Date());
const getMonthRange = (offset = 0) => {
  const d = new Date();
  d.setMonth(d.getMonth() + offset, 1);
  const start = toLocalISO(d);
  d.setMonth(d.getMonth() + 1, 0);
  return { start, end: toLocalISO(d) };
};

const STATUS_OPTIONS = ['All', 'Waiting', 'In-Consultation', 'Completed', 'Cancelled'];
const DATE_PRESET_OPTIONS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'Custom', value: 'custom' },
];

// Light-theme semantic tokens
const STATUS_META = {
  'Waiting':         { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A', label: 'Waiting',         pulse: false },
  'In-Consultation': { color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC', label: 'In Consultation', pulse: true  },
  'Completed':       { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0', label: 'Completed',       pulse: false },
  'Cancelled':       { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA', label: 'Cancelled',       pulse: false },
};

// Scoped CSS — all rules prefixed with .appt-root so nothing leaks
const SCOPED_CSS = `
  .appt-root { font-family: 'DM Sans', 'Helvetica Neue', Arial, sans-serif; }

  @keyframes appt-shimmer {
    0%   { opacity: 0.4; }
    50%  { opacity: 0.9; }
    100% { opacity: 0.4; }
  }
  @keyframes appt-pulse {
    0%, 100% { box-shadow: 0 0 0 0 rgba(8,145,178,0.5); }
    50%       { box-shadow: 0 0 0 4px rgba(8,145,178,0); }
  }
  @keyframes appt-slideDown {
    from { opacity: 0; transform: translateY(-6px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  @keyframes appt-fadeIn {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes appt-modalIn {
    from { opacity: 0; transform: scale(0.97) translateY(10px); }
    to   { opacity: 1; transform: scale(1) translateY(0); }
  }
  @keyframes appt-scan {
    0%   { transform: translateX(-100%); }
    100% { transform: translateX(350%); }
  }
  @keyframes appt-spin {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }

  .appt-root .appt-table tbody tr {
    transition: background 0.1s ease;
  }
  .appt-root .appt-table tbody tr:hover {
    background: #F8FAFC !important;
  }
  .appt-root .appt-table tbody tr.appt-active-row {
    background: #F0FDFF;
  }
  .appt-root .appt-shimmer {
    animation: appt-shimmer 1.5s ease-in-out infinite;
  }
  .appt-root .appt-status-pulse {
    animation: appt-pulse 1.8s ease-in-out infinite;
  }
  .appt-root .appt-filter-panel {
    animation: appt-slideDown 0.18s ease;
  }
  .appt-root .appt-modal-overlay {
    animation: appt-fadeIn 0.15s ease;
  }
  .appt-root .appt-modal-box {
    animation: appt-modalIn 0.22s ease;
  }
  .appt-root .appt-spin {
    animation: appt-spin 1s linear infinite;
  }

  .appt-root .appt-input {
    width: 100%;
    background: #F8FAFC;
    border: 1.5px solid #E2E8F0;
    border-radius: 9px;
    padding: 10px 14px;
    font-size: 13px;
    font-weight: 500;
    color: #1E293B;
    outline: none;
    transition: border-color 0.15s, box-shadow 0.15s, background 0.15s;
    font-family: 'DM Sans', sans-serif;
    -webkit-appearance: none;
  }
  .appt-root .appt-input:focus {
    border-color: #0EA5E9;
    background: #fff;
    box-shadow: 0 0 0 3px rgba(14,165,233,0.12);
  }
  .appt-root .appt-input::placeholder {
    color: #CBD5E1;
    font-weight: 400;
  }
  .appt-root .appt-input:read-only {
    opacity: 0.55;
    cursor: default;
  }

  .appt-root .appt-tab {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 12px;
    border-radius: 7px;
    border: 1.5px solid transparent;
    font-size: 11px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.13s ease;
    background: transparent;
    font-family: 'DM Sans', sans-serif;
    letter-spacing: 0.01em;
    white-space: nowrap;
  }

  .appt-root .appt-action-primary {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 5px 13px;
    border-radius: 7px;
    border: none;
    font-size: 10px;
    font-weight: 700;
    cursor: pointer;
    transition: all 0.13s ease;
    font-family: 'DM Sans', sans-serif;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    white-space: nowrap;
  }
  .appt-root .appt-action-primary:hover {
    filter: brightness(1.08);
    transform: translateY(-1px);
  }
  .appt-root .appt-action-primary:active {
    transform: translateY(0);
  }

  .appt-root .appt-icon-btn {
    width: 30px;
    height: 30px;
    border-radius: 7px;
    border: 1.5px solid #E2E8F0;
    background: #F8FAFC;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.13s ease;
    flex-shrink: 0;
  }
  .appt-root .appt-icon-btn:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }

  .appt-root .appt-refresh-btn:hover {
    border-color: #0EA5E9 !important;
    color: #0EA5E9 !important;
    background: #F0F9FF !important;
  }
  .appt-root .appt-new-btn:hover {
    background: #1D4ED8 !important;
    box-shadow: 0 6px 20px rgba(37,99,235,0.35) !important;
    transform: translateY(-1px);
  }
`;

// ─── Sub-components ───────────────────────────────────────────────────────────

const Highlight = ({ text, query }) => {
  if (!query?.trim() || !text) return <>{text}</>;
  const parts = text.split(new RegExp(`(${query.trim()})`, 'gi'));
  return (
    <>
      {parts.map((p, i) =>
        p.toLowerCase() === query.trim().toLowerCase()
          ? <mark key={i} style={{ background: '#FEF9C3', color: '#92400E', borderRadius: 3, padding: '0 2px', fontWeight: 700 }}>{p}</mark>
          : p
      )}
    </>
  );
};

const StatCard = ({ label, value, color, bg, icon: Icon, sublabel }) => (
  <div style={{
    background: '#fff',
    border: '1.5px solid #F1F5F9',
    borderRadius: 12,
    padding: '14px 18px',
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    position: 'relative',
    overflow: 'hidden',
    flex: 1,
    minWidth: 0,
  }}>
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2.5, background: color, borderRadius: '12px 12px 0 0' }} />
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', letterSpacing: '0.08em', textTransform: 'uppercase' }}>{label}</span>
      <div style={{ width: 26, height: 26, borderRadius: 7, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={12} color={color} />
      </div>
    </div>
    <span style={{ fontSize: 26, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.04em', lineHeight: 1 }}>{value}</span>
    {sublabel && <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>{sublabel}</span>}
  </div>
);

const StatusBadge = ({ status }) => {
  const m = STATUS_META[status] || STATUS_META['Waiting'];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      padding: '3px 9px', borderRadius: 20,
      background: m.bg, border: `1px solid ${m.border}`,
      fontSize: 10, fontWeight: 700, color: m.color,
      textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap',
    }}>
      <span
        className={m.pulse ? 'appt-status-pulse' : ''}
        style={{ width: 5, height: 5, borderRadius: '50%', background: m.color, flexShrink: 0 }}
      />
      {m.label}
    </span>
  );
};

const TokenAvatar = ({ appt }) => {
  const isActive = appt.status === 'In-Consultation';
  const initials = appt.patientName?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '??';
  return (
    <div style={{
      width: 34, height: 34, borderRadius: 9,
      background: isActive ? 'linear-gradient(135deg, #0EA5E9, #06B6D4)' : '#F1F5F9',
      border: `1.5px solid ${isActive ? '#7DD3FC' : '#E2E8F0'}`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 11, fontWeight: 800,
      color: isActive ? '#fff' : '#64748B',
      letterSpacing: '-0.01em', flexShrink: 0,
      boxShadow: isActive ? '0 0 12px rgba(14,165,233,0.25)' : 'none',
    }}>
      {initials}
    </div>
  );
};

const IconBtn = ({ onClick, disabled, title, hoverBg, hoverBorder, hoverColor, defaultColor, children }) => (
  <button
    className="appt-icon-btn"
    onClick={onClick}
    disabled={disabled}
    title={title}
    style={{ color: defaultColor || '#64748B' }}
    onMouseEnter={e => {
      if (!disabled) {
        e.currentTarget.style.background = hoverBg || '#F1F5F9';
        e.currentTarget.style.borderColor = hoverBorder || '#CBD5E1';
        e.currentTarget.style.color = hoverColor || '#1E293B';
      }
    }}
    onMouseLeave={e => {
      e.currentTarget.style.background = '#F8FAFC';
      e.currentTarget.style.borderColor = '#E2E8F0';
      e.currentTarget.style.color = defaultColor || '#64748B';
    }}
  >
    {children}
  </button>
);

// ─── Main Component ───────────────────────────────────────────────────────────
const Appointments = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [clinicConfig, setClinicConfig] = useState({ fee: 0, validity: 0 });
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [isExistingPatient, setIsExistingPatient] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(null);

  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [datePreset, setDatePreset] = useState('today');
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);

  const abortRef = useRef(null);
  const prescriptionNavRef = useRef(null);

  const initialForm = {
    patientId: '', patientName: '', mobile: '',
    appointmentDate: today, slotTime: '', type: 'Walk-in',
    reason: '', visitType: 'NEW', fees: 0
  };
  const [formData, setFormData] = useState(initialForm);

  const fetchClinicConfig = useCallback(async () => {
    const ck = `clinic-${slug}`;
    const cached = getCache(ck);
    if (cached) { setClinicConfig(cached); return; }
    try {
      const res = await axios.get(`${API_BAS}/api/clinic/${slug}/clinicData`);
      if (res.data.success) {
        const cfg = { fee: res.data.data.consultationFee, validity: res.data.data?.appointmentValidity || 7 };
        setCache(ck, cfg); setClinicConfig(cfg);
      }
    } catch (err) { console.error(err); }
  }, [slug]);

  const fetchLiveQueue = useCallback(async (force = false) => {
    const ck = `queue-${slug}`;
    const cached = getCache(ck);
    if (cached && !force) { setQueue(cached); setLoading(false); }
    else setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    try {
      const res = await axios.get(`${API_BAS}/api/appointments/${slug}/live-queue`,
        { params: { page: 1, limit: 100 }, signal: abortRef.current.signal, timeout: 8000 }
      );
      if (res.data.success) { setCache(ck, res.data.data); setQueue(res.data.data); }
    } catch (err) {
      if (axios.isCancel(err) || err.code === 'ERR_CANCELED') return;
    } finally { setLoading(false); }
  }, [slug]);

  useEffect(() => {
    fetchClinicConfig();
    fetchLiveQueue();
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [slug]);

  useEffect(() => {
    const handler = () => {
      if (prescriptionNavRef.current) { clearCache(); fetchLiveQueue(true); prescriptionNavRef.current = null; }
    };
    const onVis = () => { if (document.visibilityState === 'visible') handler(); };
    document.addEventListener('visibilitychange', onVis);
    window.addEventListener('focus', handler);
    return () => { document.removeEventListener('visibilitychange', onVis); window.removeEventListener('focus', handler); };
  }, [fetchLiveQueue]);

  const handleGoToPrescription = useCallback((apptId) => {
    prescriptionNavRef.current = apptId;
    navigate(`/${slug}/dashboard/prescription/${apptId}`);
  }, [slug, navigate]);

  const handleUpdatePrescription = useCallback((apptId) => {
    prescriptionNavRef.current = apptId;
    navigate(`/${slug}/dashboard/prescription/${apptId}?mode=edit`);
  }, [slug, navigate]);

  const activeDateRange = useMemo(() => {
    if (datePreset === 'today') return { start: today, end: today };
    if (datePreset === 'yesterday') { const d = new Date(); d.setDate(d.getDate()-1); const y = toLocalISO(d); return { start: y, end: y }; }
    if (datePreset === 'this_month') return getMonthRange(0);
    if (datePreset === 'last_month') return getMonthRange(-1);
    if (datePreset === 'custom') return { start: customStart, end: customEnd };
    return { start: null, end: null };
  }, [datePreset, customStart, customEnd]);

  const filteredQueue = useMemo(() => queue.filter(appt => {
    if (searchText.trim()) {
      const q = searchText.trim().toLowerCase();
      if (!appt.patientName?.toLowerCase().includes(q) && !appt.mobile?.includes(q)) return false;
    }
    if (statusFilter !== 'All' && appt.status !== statusFilter) return false;
    if (activeDateRange.start && activeDateRange.end) {
      const d = toLocalISO(new Date(appt.appointmentDate));
      if (d < activeDateRange.start || d > activeDateRange.end) return false;
    }
    return true;
  }), [queue, searchText, statusFilter, activeDateRange]);

  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (searchText.trim()) c++;
    if (statusFilter !== 'All') c++;
    if (datePreset !== 'today') c++;
    return c;
  }, [searchText, statusFilter, datePreset]);

  const resetFilters = () => {
    setSearchText(''); setStatusFilter('All'); setDatePreset('today');
    setCustomStart(today); setCustomEnd(today);
  };

  const handleMobileChange = async (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, mobile: val }));
    if (val.length !== 10) return;
    try {
      const [pRes] = await Promise.all([axios.get(`${API_BAS}/api/patients/${slug}/list`, { params: { search: val } })]);
      if (pRes.data.data.length > 0) {
        const patient = pRes.data.data[0];
        setIsExistingPatient(true);
        const laRes = await axios.get(`${API_BAS}/api/appointments/${slug}/latest/${val}`);
        if (laRes.data.data) {
          const diff = Math.ceil(Math.abs(new Date() - new Date(laRes.data.data.appointmentDate)) / 86400000);
          if (diff <= clinicConfig.validity) {
            setFormData(p => ({ ...p, patientId: patient._id, patientName: patient.name, visitType: 'REVISIT', fees: 0 }));
            return;
          }
        }
        setFormData(p => ({ ...p, patientId: patient._id, patientName: patient.name, visitType: 'NEW', fees: clinicConfig.fee }));
      } else {
        setIsExistingPatient(false);
        setFormData(p => ({ ...p, patientId: '', patientName: '', visitType: 'NEW', fees: clinicConfig.fee }));
      }
    } catch (err) { console.error(err); }
  };

  const handleStatusUpdate = async (id, newStatus) => {
    setQueue(prev => prev.map(a => a._id === id ? { ...a, status: newStatus } : a));
    try {
      await axios.put(`${API_BAS}/api/appointments/${slug}/update-status/${id}`, { status: newStatus });
      clearCache();
    } catch { alert('Status update failed'); fetchLiveQueue(true); }
  };

  const downloadPrescription = async (prescriptionId, patientName = 'Patient') => {
    if (!prescriptionId) { alert('Prescription not found!'); return; }
    setPdfLoading(prescriptionId);
    try {
      const res = await axios.get(`${API_BAS}/api/prescriptions/prescriptions/${prescriptionId}/download`, { responseType: 'arraybuffer', timeout: 15000 });
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = `Prescription-${patientName.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) { alert('Download failed: ' + err.message); }
    finally { setPdfLoading(null); }
  };

  const getPrescriptionId = (p) => {
    if (!p) return null;
    if (typeof p === 'object' && p._id) return p._id;
    return p;
  };

  const stats = useMemo(() => ({
    total: filteredQueue.length,
    waiting: filteredQueue.filter(a => a.status === 'Waiting').length,
    active: filteredQueue.filter(a => a.status === 'In-Consultation').length,
    done: filteredQueue.filter(a => a.status === 'Completed').length,
  }), [filteredQueue]);

  // ── STATUS TAB colors (light theme) ────────────────────────────────────────
  const tabActive = {
    'All':             { color: '#0F172A', bg: '#F1F5F9', border: '#CBD5E1' },
    'Waiting':         { color: '#D97706', bg: '#FFFBEB', border: '#FDE68A' },
    'In-Consultation': { color: '#0891B2', bg: '#ECFEFF', border: '#A5F3FC' },
    'Completed':       { color: '#059669', bg: '#ECFDF5', border: '#A7F3D0' },
    'Cancelled':       { color: '#DC2626', bg: '#FEF2F2', border: '#FECACA' },
  };

  return (
    <div className="appt-root" style={{ width: '100%', background: '#F8FAFC', padding: '24px 28px' }}>

      {/* Scoped styles — prefixed so nothing bleeds into sidebar */}
      <style>{SCOPED_CSS}</style>

      {/* ── TOP BAR ────────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 3 }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'linear-gradient(135deg, #0EA5E9, #06B6D4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <LayoutGrid size={14} color="#fff" />
            </div>
            <h1 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.03em', margin: 0 }}>Appointments</h1>
          </div>
          <p style={{ fontSize: 11, color: '#94A3B8', fontWeight: 500, margin: 0, paddingLeft: 39 }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            className="appt-refresh-btn"
            onClick={() => fetchLiveQueue(true)}
            disabled={loading}
            title="Refresh"
            style={{
              width: 34, height: 34, borderRadius: 8,
              border: '1.5px solid #E2E8F0', background: '#fff',
              color: '#94A3B8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease', opacity: loading ? 0.5 : 1,
            }}
          >
            <RefreshCw size={13} className={loading ? 'appt-spin' : ''} />
          </button>

          <Link
            to={`/${slug}/dashboard/appointment/new`}
            className="appt-new-btn"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 6,
              padding: '8px 16px',
              background: '#2563EB', color: '#fff',
              borderRadius: 9, border: 'none',
              fontSize: 12, fontWeight: 700,
              textDecoration: 'none', transition: 'all 0.18s ease',
              boxShadow: '0 2px 10px rgba(37,99,235,0.28)',
              whiteSpace: 'nowrap',
            }}
          >
            <Plus size={13} />
            New Appointment
          </Link>
        </div>
      </div>

      {/* ── STAT CARDS ─────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20 }}>
        <StatCard label="Total"     value={stats.total}   color="#64748B" bg="#F1F5F9" icon={LayoutGrid}  sublabel="filtered" />
        <StatCard label="Waiting"   value={stats.waiting} color="#D97706" bg="#FEF9C3" icon={Clock}        sublabel="in queue" />
        <StatCard label="Active"    value={stats.active}  color="#0891B2" bg="#CFFAFE" icon={Activity}     sublabel="consulting" />
        <StatCard label="Completed" value={stats.done}    color="#059669" bg="#D1FAE5" icon={CheckCircle2} sublabel="done" />
      </div>

      {/* ── FILTER TOOLBAR ─────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>

        {/* Row 1: Search + Date toggle + Reset */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {/* Search */}
          <div style={{ position: 'relative', flex: '1 1 220px', maxWidth: 300 }}>
            <Search size={13} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: '#CBD5E1', pointerEvents: 'none' }} />
            <input
              type="text"
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              placeholder="Search name or mobile…"
              className="appt-input"
              style={{ paddingLeft: 32, paddingRight: searchText ? 30 : 12 }}
            />
            {searchText && (
              <button onClick={() => setSearchText('')} style={{ position: 'absolute', right: 9, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#CBD5E1', cursor: 'pointer', padding: 2, display: 'flex', alignItems: 'center' }}>
                <X size={12} />
              </button>
            )}
          </div>

          {/* Date filter toggle */}
          <button
            onClick={() => setShowFilters(v => !v)}
            className="appt-tab"
            style={{
              border: `1.5px solid ${showFilters ? '#7DD3FC' : '#E2E8F0'}`,
              background: showFilters ? '#F0F9FF' : '#fff',
              color: showFilters ? '#0891B2' : '#64748B',
            }}
          >
            <ListFilter size={12} />
            Date Range
            {activeFilterCount > 0 && (
              <span style={{ width: 16, height: 16, borderRadius: '50%', background: '#0EA5E9', color: '#fff', fontSize: 9, fontWeight: 800, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                {activeFilterCount}
              </span>
            )}
            <ChevronDown size={11} style={{ transform: showFilters ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }} />
          </button>

          {activeFilterCount > 0 && (
            <button
              onClick={resetFilters}
              className="appt-tab"
              style={{ border: '1.5px solid #FECACA', background: '#FEF2F2', color: '#DC2626' }}
            >
              <X size={11} /> Reset
            </button>
          )}
        </div>

        {/* Row 2: Status tabs */}
        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
          {STATUS_OPTIONS.map(status => {
            const isActive = statusFilter === status;
            const ta = tabActive[status] || tabActive['All'];
            const count = status === 'All' ? queue.length : queue.filter(a => a.status === status).length;
            return (
              <button
                key={status}
                className="appt-tab"
                onClick={() => setStatusFilter(status)}
                style={{
                  color: isActive ? ta.color : '#64748B',
                  background: isActive ? ta.bg : '#fff',
                  border: `1.5px solid ${isActive ? ta.border : '#E2E8F0'}`,
                  fontWeight: isActive ? 800 : 600,
                }}
              >
                {status === 'In-Consultation' ? 'Consulting' : status}
                <span style={{
                  fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4,
                  background: isActive ? `${ta.border}` : '#F1F5F9',
                  color: isActive ? ta.color : '#94A3B8',
                }}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Row 3: Date panel */}
        {showFilters && (
          <div className="appt-filter-panel" style={{
            background: '#fff', border: '1.5px solid #E2E8F0',
            borderRadius: 11, padding: '14px 18px', display: 'flex', flexDirection: 'column', gap: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
              <CalendarDays size={12} color="#0EA5E9" />
              <span style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.09em' }}>Date Range</span>
            </div>
            <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
              {DATE_PRESET_OPTIONS.map(opt => {
                const isActive = datePreset === opt.value;
                return (
                  <button key={opt.value} onClick={() => setDatePreset(opt.value)}
                    className="appt-tab"
                    style={{
                      border: `1.5px solid ${isActive ? '#7DD3FC' : '#E2E8F0'}`,
                      background: isActive ? '#F0F9FF' : '#F8FAFC',
                      color: isActive ? '#0891B2' : '#64748B',
                      fontWeight: isActive ? 700 : 600,
                    }}>
                    {opt.label}
                  </button>
                );
              })}
            </div>
            {datePreset === 'custom' && (
              <div style={{ display: 'flex', gap: 10 }}>
                {[
                  { label: 'From', val: customStart, onChange: e => setCustomStart(e.target.value), max: customEnd },
                  { label: 'To',   val: customEnd,   onChange: e => setCustomEnd(e.target.value),   min: customStart },
                ].map(f => (
                  <div key={f.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{f.label}</label>
                    <input type="date" value={f.val} min={f.min} max={f.max} onChange={f.onChange} className="appt-input" style={{ fontSize: 12 }} />
                  </div>
                ))}
              </div>
            )}
            {activeDateRange.start && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: '#F0F9FF', width: 'fit-content' }}>
                <CalendarDays size={10} color="#7DD3FC" />
                <span style={{ fontSize: 10, fontWeight: 600, color: '#0891B2', fontFamily: 'DM Mono, monospace' }}>
                  {activeDateRange.start === activeDateRange.end
                    ? activeDateRange.start
                    : `${activeDateRange.start} → ${activeDateRange.end}`}
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── TABLE ──────────────────────────────────────────────────────────── */}
      <div style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 12, overflow: 'hidden', position: 'relative' }}>

        {/* Loading scan bar */}
        {loading && queue.length > 0 && (
          <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: '#F1F5F9', zIndex: 10, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: '35%', background: 'linear-gradient(90deg, transparent, #0EA5E9, transparent)', animation: 'appt-scan 1.4s ease-in-out infinite' }} />
          </div>
        )}

        <div style={{ overflowX: 'auto' }}>
          <table className="appt-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1.5px solid #F1F5F9' }}>
                {[
                  { label: '',         align: 'left',   w: 52  },
                  { label: 'Patient',  align: 'left',   w: null },
                  { label: 'Mobile',   align: 'left',   w: null },
                  { label: 'Date',     align: 'left',   w: null },
                  { label: 'Status',   align: 'center', w: null },
                  { label: 'Actions',  align: 'right',  w: null },
                ].map((h, i) => (
                  <th key={i} style={{
                    padding: '11px 18px',
                    textAlign: h.align,
                    fontSize: 9, fontWeight: 800, color: '#94A3B8',
                    textTransform: 'uppercase', letterSpacing: '0.1em',
                    background: '#FAFAFA', whiteSpace: 'nowrap',
                    width: h.w || undefined,
                  }}>{h.label}</th>
                ))}
              </tr>
            </thead>

            <tbody>
              {loading && queue.length === 0 ? (
                [...Array(5)].map((_, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #F8FAFC' }}>
                    <td style={{ padding: '12px 18px' }}>
                      <div className="appt-shimmer" style={{ width: 34, height: 34, borderRadius: 9, background: '#F1F5F9' }} />
                    </td>
                    <td style={{ padding: '12px 18px' }}>
                      <div className="appt-shimmer" style={{ height: 12, width: 140, borderRadius: 4, background: '#F1F5F9', marginBottom: 6 }} />
                      <div className="appt-shimmer" style={{ height: 9, width: 80, borderRadius: 4, background: '#F8FAFC' }} />
                    </td>
                    <td style={{ padding: '12px 18px' }}><div className="appt-shimmer" style={{ height: 10, width: 100, borderRadius: 4, background: '#F1F5F9' }} /></td>
                    <td style={{ padding: '12px 18px' }}><div className="appt-shimmer" style={{ height: 10, width: 60, borderRadius: 4, background: '#F1F5F9' }} /></td>
                    <td style={{ padding: '12px 18px', textAlign: 'center' }}><div className="appt-shimmer" style={{ height: 20, width: 80, borderRadius: 20, background: '#F1F5F9', margin: '0 auto' }} /></td>
                    <td style={{ padding: '12px 18px' }}><div className="appt-shimmer" style={{ height: 26, width: 60, borderRadius: 7, background: '#F1F5F9', marginLeft: 'auto' }} /></td>
                  </tr>
                ))
              ) : filteredQueue.length === 0 ? (
                <tr>
                  <td colSpan={6} style={{ padding: '56px 24px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 12, background: '#F8FAFC', border: '1.5px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <AlertCircle size={18} color="#CBD5E1" />
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: '#94A3B8', margin: 0 }}>
                        {queue.length > 0 ? 'No results match your filters' : 'No appointments found'}
                      </p>
                      {queue.length > 0 && (
                        <button onClick={resetFilters} style={{ fontSize: 11, fontWeight: 700, color: '#0EA5E9', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', textDecoration: 'underline' }}>
                          Clear all filters
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredQueue.map((appt) => {
                  const prescriptionId = appt.prescriptions?.length > 0 ? getPrescriptionId(appt.prescriptions[0]) : null;
                  const isActive = appt.status === 'In-Consultation';
                  const apptDate = new Date(appt.appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

                  return (
                    <tr
                      key={appt._id}
                      className={isActive ? 'appt-active-row' : ''}
                      style={{ borderBottom: '1px solid #F8FAFC' }}
                    >
                      {/* Avatar */}
                      <td style={{ padding: '11px 18px', width: 52 }}>
                        <TokenAvatar appt={appt} />
                      </td>

                      {/* Patient */}
                      <td style={{ padding: '11px 18px', minWidth: 180 }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                          <span style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.01em' }}>
                            <Highlight text={appt.patientName} query={searchText} />
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <span style={{
                              fontSize: 9, fontWeight: 800, padding: '1px 6px', borderRadius: 4,
                              textTransform: 'uppercase', letterSpacing: '0.05em',
                              color: appt.visitType === 'REVISIT' ? '#2563EB' : '#059669',
                              background: appt.visitType === 'REVISIT' ? '#EFF6FF' : '#ECFDF5',
                              border: `1px solid ${appt.visitType === 'REVISIT' ? '#BFDBFE' : '#A7F3D0'}`,
                            }}>
                              {appt.visitType}
                            </span>
                            <span style={{ fontSize: 11, color: '#94A3B8', fontFamily: 'DM Mono, monospace' }}>₹{appt.fees}</span>
                            <span style={{ fontSize: 10, color: '#CBD5E1' }}>·</span>
                            <span style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500 }}>{appt.type}</span>
                          </div>
                        </div>
                      </td>

                      {/* Mobile */}
                      <td style={{ padding: '11px 18px' }}>
                        <span style={{ fontSize: 12, fontWeight: 500, color: '#475569', fontFamily: 'DM Mono, monospace' }}>
                          <Highlight text={appt.mobile} query={searchText} />
                        </span>
                      </td>

                      {/* Date */}
                      <td style={{ padding: '11px 18px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#64748B', fontFamily: 'DM Mono, monospace' }}>{apptDate}</span>
                      </td>

                      {/* Status */}
                      <td style={{ padding: '11px 18px', textAlign: 'center' }}>
                        <StatusBadge status={appt.status} />
                      </td>

                      {/* Actions */}
                      <td style={{ padding: '11px 18px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 5 }}>

                          {appt.status === 'Waiting' && (
                            <button
                              onClick={() => handleStatusUpdate(appt._id, 'In-Consultation')}
                              className="appt-action-primary"
                              style={{ background: 'linear-gradient(135deg, #0EA5E9, #06B6D4)', color: '#fff', boxShadow: '0 2px 6px rgba(14,165,233,0.28)' }}
                            >
                              Start
                            </button>
                          )}

                          {appt.status === 'In-Consultation' && (
                            <button
                              onClick={() => handleGoToPrescription(appt._id)}
                              className="appt-action-primary"
                              style={{ background: 'linear-gradient(135deg, #059669, #10B981)', color: '#fff', boxShadow: '0 2px 6px rgba(16,185,129,0.28)' }}
                            >
                              <PlusCircle size={11} /> Prescription
                            </button>
                          )}

                          {appt.status === 'Completed' && (
                            prescriptionId ? (
                              <>
                                <IconBtn
                                  onClick={() => downloadPrescription(prescriptionId, appt.patientName)}
                                  disabled={pdfLoading === prescriptionId}
                                  title="Download PDF"
                                  defaultColor="#059669"
                                  hoverBg="#ECFDF5" hoverBorder="#A7F3D0" hoverColor="#059669"
                                >
                                  {pdfLoading === prescriptionId
                                    ? <Loader2 size={13} className="appt-spin" />
                                    : <Download size={13} />}
                                </IconBtn>
                                <IconBtn
                                  onClick={() => handleUpdatePrescription(appt._id)}
                                  title="Edit Prescription"
                                  defaultColor="#7C3AED"
                                  hoverBg="#F5F3FF" hoverBorder="#DDD6FE" hoverColor="#7C3AED"
                                >
                                  <FilePen size={13} />
                                </IconBtn>
                              </>
                            ) : (
                              <IconBtn
                                onClick={() => handleGoToPrescription(appt._id)}
                                title="Add Prescription"
                                defaultColor="#64748B"
                                hoverBg="#F8FAFC" hoverBorder="#CBD5E1" hoverColor="#0F172A"
                              >
                                <FileText size={13} />
                              </IconBtn>
                            )
                          )}

                          {(appt.status === 'Waiting' || appt.status === 'In-Consultation') && (
                            <IconBtn
                              onClick={() => handleStatusUpdate(appt._id, 'Cancelled')}
                              title="Cancel"
                              defaultColor="#CBD5E1"
                              hoverBg="#FEF2F2" hoverBorder="#FECACA" hoverColor="#DC2626"
                            >
                              <XCircle size={13} />
                            </IconBtn>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        {!loading && filteredQueue.length > 0 && (
          <div style={{ padding: '9px 18px', borderTop: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 10, fontWeight: 600, color: '#CBD5E1', letterSpacing: '0.04em' }}>
              {filteredQueue.length} of {queue.length} records
            </span>
            {filteredQueue.length !== queue.length && (
              <button onClick={resetFilters} style={{ fontSize: 10, fontWeight: 700, color: '#0EA5E9', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'DM Sans, sans-serif' }}>
                Show all →
              </button>
            )}
          </div>
        )}
      </div>

      {/* ── BOOKING MODAL ──────────────────────────────────────────────────── */}
      {showModal && (
        <div
          className="appt-modal-overlay"
          style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
        >
          <div
            className="appt-modal-box"
            style={{ background: '#fff', border: '1.5px solid #E2E8F0', borderRadius: 18, width: '100%', maxWidth: 460, overflow: 'hidden', boxShadow: '0 32px 64px rgba(15,23,42,0.2)' }}
          >
            {/* Header */}
            <div style={{ padding: '18px 22px', borderBottom: '1px solid #F1F5F9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <h2 style={{ fontSize: 15, fontWeight: 800, color: '#0F172A', letterSpacing: '-0.02em', margin: 0 }}>New Appointment</h2>
                <p style={{ fontSize: 10, color: '#94A3B8', fontWeight: 500, margin: '3px 0 0' }}>Validity: {clinicConfig.validity} days</p>
              </div>
              <button
                onClick={() => { setShowModal(false); setFormData(initialForm); setIsExistingPatient(false); }}
                style={{ width: 30, height: 30, borderRadius: 7, border: '1.5px solid #E2E8F0', background: '#F8FAFC', color: '#94A3B8', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div style={{ padding: '18px 22px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {/* Mobile */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5, position: 'relative' }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Contact Number</label>
                <input required className="appt-input" value={formData.mobile} onChange={handleMobileChange} placeholder="10 digit mobile" maxLength={10} />
                {isExistingPatient && (
                  <div style={{ position: 'absolute', right: 10, bottom: 9, display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 9, fontWeight: 800, color: '#059669', background: '#ECFDF5', border: '1px solid #A7F3D0', padding: '2px 7px', borderRadius: 4 }}>
                    <UserCheck size={10} /> FOUND
                  </div>
                )}
              </div>

              {/* Visit type */}
              <div style={{
                padding: '12px 14px', borderRadius: 10,
                background: formData.visitType === 'REVISIT' ? '#EFF6FF' : '#F8FAFC',
                border: `1.5px solid ${formData.visitType === 'REVISIT' ? '#BFDBFE' : '#E2E8F0'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 34, height: 34, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', background: formData.visitType === 'REVISIT' ? '#DBEAFE' : '#F1F5F9' }}>
                    {formData.visitType === 'REVISIT' ? <RefreshCw size={14} color="#2563EB" /> : <Wallet size={14} color="#64748B" />}
                  </div>
                  <div>
                    <p style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 2px' }}>Visit Type</p>
                    <p style={{ fontSize: 13, fontWeight: 800, color: formData.visitType === 'REVISIT' ? '#2563EB' : '#0F172A', margin: 0 }}>{formData.visitType}</p>
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 9, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', margin: '0 0 2px' }}>Fee</p>
                  <p style={{ fontSize: 19, fontWeight: 800, color: '#0F172A', fontFamily: 'DM Mono, monospace', letterSpacing: '-0.02em', margin: 0 }}>₹{formData.fees}</p>
                </div>
              </div>

              {/* Name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                <label style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Patient Name</label>
                <input required readOnly={isExistingPatient} className="appt-input" value={formData.patientName} onChange={e => setFormData(p => ({ ...p, patientName: e.target.value }))} placeholder="Full name" />
              </div>

              {/* Date + Slot */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                {[
                  { label: 'Date', type: 'date', key: 'appointmentDate' },
                  { label: 'Slot Time', type: 'time', key: 'slotTime' },
                ].map(f => (
                  <div key={f.key} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                    <label style={{ fontSize: 10, fontWeight: 700, color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em' }}>{f.label}</label>
                    <input type={f.type} className="appt-input" value={formData[f.key]} onChange={e => setFormData(p => ({ ...p, [f.key]: e.target.value }))} style={{ fontSize: 12 }} />
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div style={{ padding: '14px 22px', borderTop: '1px solid #F1F5F9', background: '#FAFAFA' }}>
              <button
                disabled={submitting}
                style={{
                  width: '100%', padding: '11px', borderRadius: 9, border: 'none',
                  background: submitting ? '#E2E8F0' : 'linear-gradient(135deg, #2563EB, #1D4ED8)',
                  color: submitting ? '#94A3B8' : '#fff',
                  fontSize: 12, fontWeight: 800, letterSpacing: '0.03em',
                  cursor: submitting ? 'not-allowed' : 'pointer',
                  fontFamily: 'DM Sans, sans-serif', transition: 'all 0.15s',
                  boxShadow: submitting ? 'none' : '0 2px 12px rgba(37,99,235,0.3)',
                }}
              >
                {submitting ? 'Processing…' : `Confirm ${formData.visitType} Token`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Appointments;