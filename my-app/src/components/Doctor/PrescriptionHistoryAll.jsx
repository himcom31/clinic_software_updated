import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Search, X, SlidersHorizontal, CalendarDays,
  RefreshCw, Download, FilePen, FileText,
  Loader2, Eye, ChevronDown, ClipboardList,
  ChevronUp, User, Phone, Hash
} from 'lucide-react';

const API_BAS = import.meta.env.VITE_API_URL;

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
  const end = toLocalISO(d);
  return { start, end };
};

const formatDate = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

const formatDateShort = (dateStr) =>
  new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });

// ─── Constants ────────────────────────────────────────────────────────────────
const DATE_PRESET_OPTIONS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom Range', value: 'custom' },
];

const VISIT_TYPE_DISPLAY = ['All', 'New', 'Revisit'];

const normaliseVisitType = (vt = '') => {
  const v = vt.toLowerCase();
  if (v.includes('revisit')) return 'revisit';
  return 'new';
};

// ─── Subcomponents ────────────────────────────────────────────────────────────
const VisitBadge = ({ type }) => {
  const isRevisit = normaliseVisitType(type) === 'revisit';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest
      ${isRevisit
        ? 'bg-blue-50 text-blue-600 border border-blue-100'
        : 'bg-emerald-50 text-emerald-600 border border-emerald-100'
      }`}>
      {isRevisit ? 'Revisit' : 'New'}
    </span>
  );
};

const StatCard = ({ label, value, color }) => (
  <div className={`hidden sm:flex flex-col items-center justify-center px-4 py-2.5 rounded-xl min-w-[64px] ${color}`}>
    <span className="text-xl font-black leading-none tabular-nums">{value}</span>
    <span className="text-[8px] font-black uppercase tracking-widest opacity-60 mt-0.5">{label}</span>
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────

const PrescriptionHistory = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(null);
  const [sortConfig, setSortConfig] = useState({ key: 'createdAt', dir: 'desc' });

  // ── Filter State ──────────────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [visitTypeFilter, setVisitTypeFilter] = useState('All');
  const [datePreset, setDatePreset] = useState('all');
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchText, prescriptions]);

  const abortRef = useRef(null);

  // ── Fetch ─────────────────────────────────────────────────────────────────
  const fetchPrescriptions = useCallback(async (force = false) => {
    const cacheKey = `ph-${slug}`;
    const cached = getCache(cacheKey);
    if (cached && !force) { setPrescriptions(cached); setLoading(false); return; }

    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const res = await axios.get(
        `${API_BAS}/api/prescriptions/${slug}/history`,
        { params: { page: 1, limit: 200 }, signal: abortRef.current.signal, timeout: 10000 }
      );
      if (res.data.success) {
        setCache(cacheKey, res.data.data);
        setPrescriptions(res.data.data);
      }
    } catch (err) {
      if (axios.isCancel(err) || err.code === 'ERR_CANCELED') return;
      console.error('Prescription history fetch error:', err);
    } finally {
      setLoading(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchPrescriptions();
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [fetchPrescriptions]);

  // ── Active date range ─────────────────────────────────────────────────────
  const activeDateRange = useMemo(() => {
    if (datePreset === 'today') return { start: today, end: today };
    if (datePreset === 'yesterday') {
      const d = new Date(); d.setDate(d.getDate() - 1);
      const y = toLocalISO(d); return { start: y, end: y };
    }
    if (datePreset === 'this_month') return getMonthRange(0);
    if (datePreset === 'last_month') return getMonthRange(-1);
    if (datePreset === 'all') return { start: null, end: null };
    if (datePreset === 'custom') return { start: customStart, end: customEnd };
    return { start: null, end: null };
  }, [datePreset, customStart, customEnd]);

  // ── Filtered + sorted list ────────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = prescriptions.filter(p => {
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        if (
          !p.patientName?.toLowerCase().includes(q) &&
          !p.mobile?.includes(q)
        ) return false;
      }
      if (visitTypeFilter !== 'All') {
        const norm = normaliseVisitType(p.visitType);
        if (visitTypeFilter === 'New' && norm !== 'new') return false;
        if (visitTypeFilter === 'Revisit' && norm !== 'revisit') return false;
      }
      if (activeDateRange.start && activeDateRange.end) {
        const pDate = toLocalISO(new Date(p.createdAt || p.appointmentDate));
        if (pDate < activeDateRange.start || pDate > activeDateRange.end) return false;
      }
      return true;
    });

    // Sort
    list = [...list].sort((a, b) => {
      let aVal, bVal;
      if (sortConfig.key === 'patientName') {
        aVal = a.patientName?.toLowerCase() || '';
        bVal = b.patientName?.toLowerCase() || '';
      } else if (sortConfig.key === 'createdAt') {
        aVal = new Date(a.createdAt || a.appointmentDate).getTime();
        bVal = new Date(b.createdAt || b.appointmentDate).getTime();
      } else if (sortConfig.key === 'fees') {
        aVal = a.fees || 0;
        bVal = b.fees || 0;
      } else {
        return 0;
      }
      if (aVal < bVal) return sortConfig.dir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.dir === 'asc' ? 1 : -1;
      return 0;
    });

    return list;
  }, [prescriptions, searchText, visitTypeFilter, activeDateRange, sortConfig]);

  const handleSort = (key) => {
    setSortConfig(prev =>
      prev.key === key
        ? { key, dir: prev.dir === 'asc' ? 'desc' : 'asc' }
        : { key, dir: 'asc' }
    );
  };

  const SortIcon = ({ col }) => {
    if (sortConfig.key !== col) return <ChevronDown size={11} className="text-slate-300 ml-1 inline" />;
    return sortConfig.dir === 'asc'
      ? <ChevronUp size={11} className="text-[#18afb1] ml-1 inline" />
      : <ChevronDown size={11} className="text-[#18afb1] ml-1 inline" />;
  };

  // ── Active filter count ───────────────────────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let c = 0;
    if (searchText.trim()) c++;
    if (visitTypeFilter !== 'All') c++;
    if (datePreset !== 'all') c++;
    return c;
  }, [searchText, visitTypeFilter, datePreset]);

  const resetFilters = () => {
    setSearchText('');
    setVisitTypeFilter('All');
    setDatePreset('all');
    setCustomStart(today);
    setCustomEnd(today);
  };

  // ── Stats ─────────────────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total: filtered.length,
    newVisit: filtered.filter(p => normaliseVisitType(p.visitType) === 'new').length,
    revisit: filtered.filter(p => normaliseVisitType(p.visitType) === 'revisit').length,
  }), [filtered]);

  // ── Download PDF ──────────────────────────────────────────────────────────
  const downloadPrescription = async (prescriptionId, patientName = 'Patient') => {
    if (!prescriptionId) { alert('Prescription not found!'); return; }
    setPdfLoading(String(prescriptionId));
    try {
      const res = await axios.get(
        `${API_BAS}/api/prescriptions/prescriptions/${prescriptionId}/download`,
        { responseType: 'arraybuffer', timeout: 15000 }
      );
      const blob = new Blob([res.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = fileURL;
      link.download = `Prescription-${patientName.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(fileURL);
    } catch (err) {
      console.error('Download Error:', err);
      alert('Download failed: ' + err.message);
    } finally { setPdfLoading(null); }
  };

  // ── Navigate ──────────────────────────────────────────────────────────────
  const handleView = (apptId) => navigate(`/${slug}/dashboard/prescription/${apptId}?mode=view`);
  const handleEdit = (apptId) => navigate(`/${slug}/dashboard/prescription/${apptId}?mode=edit`);

  // ── Highlight helper ──────────────────────────────────────────────────────
  const highlight = (text, query) => {
    if (!query || !text) return text;
    const parts = String(text).split(new RegExp(`(${query})`, 'gi'));
    return parts.map((part, i) =>
      part.toLowerCase() === query.toLowerCase()
        ? <mark key={i} className="ph-mark">{part}</mark>
        : part
    );
  };

  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filtered.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filtered.length / recordsPerPage);
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f4f6f9] font-sans text-slate-900">

      {/* ── TOP BAR ── */}
      <div className="bg-white border-b border-slate-200 px-6 md:px-10 py-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#18afb1]/10 flex items-center justify-center">
            <ClipboardList size={16} className="text-[#18afb1]" />
          </div>
          <div>
            <h1 className="text-[15px] font-black text-slate-800 uppercase tracking-tight leading-none">
              Prescription History
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-widest mt-0.5">
              {prescriptions.length} total records
            </p>
          </div>
        </div>

        <button
          onClick={() => { clearCache(); fetchPrescriptions(true); }}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-500 hover:text-[#18afb1] hover:border-[#18afb1] text-[11px] font-black uppercase tracking-widest transition-all disabled:opacity-40"
        >
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      <div className="px-6 md:px-10 py-6 space-y-5">

        {/* ── STATS ROW ── */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Total Records', value: prescriptions.length, bg: 'bg-white border border-slate-200', text: 'text-slate-800', sub: 'text-slate-400' },
            { label: 'New Patients', value: prescriptions.filter(p => normaliseVisitType(p.visitType) === 'new').length, bg: 'bg-emerald-50 border border-emerald-100', text: 'text-emerald-700', sub: 'text-emerald-500' },
            { label: 'Revisit Patients', value: prescriptions.filter(p => normaliseVisitType(p.visitType) === 'revisit').length, bg: 'bg-blue-50 border border-blue-100', text: 'text-blue-700', sub: 'text-blue-400' },
          ].map(s => (
            <div key={s.label} className={`rounded-2xl px-5 py-4 ${s.bg}`}>
              <p className={`text-2xl font-black tabular-nums ${s.text}`}>{s.value}</p>
              <p className={`text-[9px] font-black uppercase tracking-widest mt-1 ${s.sub}`}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* ── FILTER BAR ── */}
        <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-3">

          {/* Row 1 */}
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">

            {/* Search */}
            <div className="relative flex-1 max-w-xs">
              <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                placeholder="Search name or mobile…"
                className="ph-search-input"
              />
              {searchText && (
                <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-600 transition-colors">
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Date filter toggle */}
            <button
              onClick={() => setShowFilters(v => !v)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-black text-[10px] uppercase tracking-widest transition-all
                ${showFilters
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}
            >
              <CalendarDays size={13} />
              Date
              {activeFilterCount > 0 && datePreset !== 'all' && (
                <span className={`w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center
                  ${showFilters ? 'bg-white text-slate-900' : 'bg-[#18afb1] text-white'}`}>
                  1
                </span>
              )}
            </button>

            {activeFilterCount > 0 && (
              <button
                onClick={resetFilters}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-red-100 text-red-500 bg-red-50 font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 transition-all"
              >
                <X size={11} /> Clear
              </button>
            )}

            {/* Filtered count badge */}
            {(searchText || visitTypeFilter !== 'All' || datePreset !== 'all') && (
              <span className="ml-auto text-[10px] font-black text-slate-400 uppercase tracking-widest hidden sm:inline-flex items-center gap-1.5">
                <span className="w-5 h-5 rounded-full bg-[#18afb1]/10 text-[#18afb1] flex items-center justify-center text-[9px] font-black">
                  {filtered.length}
                </span>
                results
              </span>
            )}
          </div>

          {/* Row 2: Visit type tabs */}
          <div className="flex items-center gap-1.5 flex-wrap border-t border-slate-100 pt-3">
            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mr-1">Visit:</span>
            {VISIT_TYPE_DISPLAY.map(vt => {
              const isActive = visitTypeFilter === vt;
              const count = vt === 'All'
                ? prescriptions.length
                : prescriptions.filter(p => normaliseVisitType(p.visitType) === vt.toLowerCase()).length;
              return (
                <button
                  key={vt}
                  onClick={() => setVisitTypeFilter(vt)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all
                    ${isActive
                      ? vt === 'All' ? 'bg-slate-900 text-white'
                        : vt === 'New' ? 'bg-emerald-500 text-white'
                          : 'bg-blue-500 text-white'
                      : 'bg-slate-50 text-slate-500 hover:bg-slate-100 border border-slate-200'
                    }`}
                >
                  {vt}
                  <span className={`text-[8px] px-1 py-0.5 rounded font-black
                    ${isActive ? 'bg-white/20' : 'bg-slate-200 text-slate-500'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Row 3: Date picker panel */}
          {showFilters && (
            <div className="border-t border-slate-100 pt-4 space-y-3">
              <div className="flex flex-wrap gap-2">
                {DATE_PRESET_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    onClick={() => setDatePreset(opt.value)}
                    className={`px-3.5 py-2 rounded-lg font-black text-[10px] uppercase tracking-wider transition-all border
                      ${datePreset === opt.value
                        ? 'bg-[#18afb1] text-white border-[#18afb1]'
                        : 'bg-slate-50 text-slate-500 border-slate-200 hover:border-[#18afb1] hover:text-[#18afb1]'
                      }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {datePreset === 'custom' && (
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">From</label>
                    <input type="date" value={customStart} max={customEnd}
                      onChange={e => setCustomStart(e.target.value)} className="ph-date-input" />
                  </div>
                  <div className="flex-1">
                    <label className="block text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5 ml-1">To</label>
                    <input type="date" value={customEnd} min={customStart}
                      onChange={e => setCustomEnd(e.target.value)} className="ph-date-input" />
                  </div>
                </div>
              )}

              {activeDateRange.start && (
                <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1.5">
                  <CalendarDays size={11} />
                  {activeDateRange.start === activeDateRange.end
                    ? activeDateRange.start
                    : `${activeDateRange.start} — ${activeDateRange.end}`
                  }
                </p>
              )}
            </div>
          )}
        </div>

        {/* ── TABLE ── */}
        <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">

          {/* Table header */}
          <div className="grid grid-cols-[50px_2.5fr_1.5fr_1.2fr_1fr_120px] gap-4 px-5 py-3 bg-slate-50 border-b border-slate-200 items-center">
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1">
              <Hash size={9} /> No
            </div>
            <button
              onClick={() => handleSort('patientName')}
              className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center text-left hover:text-slate-600 transition-colors"
            >
              <User size={9} className="mr-1" /> Patient <SortIcon col="patientName" />
            </button>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest hidden md:flex items-center gap-1">
              <Phone size={9} /> Mobile
            </div>
            <button
              onClick={() => handleSort('createdAt')}
              className="text-[9px] font-black text-slate-400 uppercase tracking-widest flex items-center text-left hover:text-slate-600 transition-colors"
            >
              <CalendarDays size={9} className="mr-1" /> Date <SortIcon col="createdAt" />
            </button>
            <button
              onClick={() => handleSort('fees')}
              className="text-[9px] font-black text-slate-400 uppercase tracking-widest hidden sm:flex items-center text-left hover:text-slate-600 transition-colors"
            >
              Fees <SortIcon col="fees" />
            </button>
            <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-right">
              Actions
            </div>
          </div>

          {/* Rows */}
          {/* Rows */}
          <div className="divide-y divide-slate-100">
            {loading && prescriptions.length === 0 ? (
              [...Array(7)].map((_, i) => (
                <div key={i} className="grid grid-cols-[50px_2.5fr_1.5fr_1.2fr_1fr_120px] gap-4 px-5 py-4 animate-pulse items-center">
                  <div className="w-7 h-7 bg-slate-100 rounded-lg" />
                  <div>
                    <div className="h-3 bg-slate-100 rounded w-28 mb-2" />
                    <div className="h-2 bg-slate-50 rounded w-14" />
                  </div>
                  <div className="h-3 bg-slate-100 rounded w-24 hidden md:block self-center" />
                  <div className="h-3 bg-slate-100 rounded w-16 self-center" />
                  <div className="h-3 bg-slate-100 rounded w-10 hidden sm:block self-center" />
                  <div className="flex gap-1.5 justify-end">
                    <div className="w-7 h-7 bg-slate-100 rounded-lg" />
                    <div className="w-7 h-7 bg-slate-100 rounded-lg" />
                    <div className="w-7 h-7 bg-slate-100 rounded-lg" />
                  </div>
                </div>
              ))
            ) : filtered.length === 0 ? (
              <div className="py-20 text-center">
                <div className="w-14 h-14 rounded-2xl bg-slate-50 flex items-center justify-center mx-auto mb-4">
                  <FileText size={22} className="text-slate-300" />
                </div>
                <p className="text-[11px] font-black text-slate-300 uppercase tracking-widest">
                  {prescriptions.length > 0 ? 'No records match filters' : 'No prescriptions found'}
                </p>
                {prescriptions.length > 0 && (
                  <button onClick={resetFilters} className="mt-3 text-[10px] font-black text-[#18afb1] uppercase tracking-widest hover:underline">
                    Clear filters
                  </button>
                )}
              </div>
            ) : (
              /* CHANGE HERE: Changed filtered.map to currentRecords.map */
              currentRecords.map((p, index) => {
                const prescriptionId = String(p.prescriptionId || p._id);
                const appointmentId = p.appointmentId;
                const isDownloading = pdfLoading === prescriptionId;

                return (
                  <div
                    key={prescriptionId}
                    className="grid grid-cols-[50px_2.5fr_1.5fr_1.2fr_1fr_120px] gap-4 px-5 py-3.5 hover:bg-slate-50/70 transition-colors group items-center"
                  >
                    {/* Serial no - Updated to calculate based on page offset */}
                    <div className="flex items-center">
                      <span className="w-7 h-7 rounded-lg bg-slate-100 text-slate-400 flex items-center justify-center font-black text-[10px]">
                        {indexOfFirstRecord + index + 1}
                      </span>
                    </div>

                    {/* Patient */}
                    <div className="flex flex-col justify-center min-w-0">
                      <span className="font-bold text-slate-800 text-[13px] truncate">
                        {highlight(p.patientName, searchText.trim())}
                      </span>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <VisitBadge type={p.visitType} />
                        <span className="text-[9px] font-semibold text-slate-400 md:hidden">
                          {p.mobile}
                        </span>
                      </div>
                    </div>

                    {/* Mobile */}
                    <div className="hidden md:flex items-center">
                      <span className="text-[12px] font-semibold text-slate-600 tabular-nums">
                        {highlight(p.mobile, searchText.trim())}
                      </span>
                    </div>

                    {/* Date */}
                    <div className="flex flex-col justify-center">
                      <span className="text-[12px] font-semibold text-slate-700">
                        {formatDateShort(p.createdAt || p.appointmentDate)}
                      </span>
                      <span className="text-[9px] text-slate-400 font-semibold">
                        {new Date(p.createdAt || p.appointmentDate).getFullYear()}
                      </span>
                    </div>

                    {/* Fees */}
                    <div className="hidden sm:flex items-center">
                      {p.fees > 0
                        ? <span className="text-[12px] font-black text-slate-700 tabular-nums">₹{p.fees}</span>
                        : <span className="text-[11px] text-slate-300 font-semibold">—</span>
                      }
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1">
                      {/* View */}
                      <button
                        onClick={() => appointmentId && handleView(appointmentId)}
                        disabled={!appointmentId}
                        className="ph-action-btn ph-action-teal"
                        title="View"
                      >
                        <Eye size={13} />
                      </button>

                      {/* Edit */}
                      <button
                        onClick={() => appointmentId && handleEdit(appointmentId)}
                        disabled={!appointmentId}
                        className="ph-action-btn ph-action-violet"
                        title="Edit"
                      >
                        <FilePen size={13} />
                      </button>

                      {/* Download */}
                      <button
                        onClick={() => downloadPrescription(prescriptionId, p.patientName)}
                        disabled={isDownloading || !prescriptionId}
                        className="ph-action-btn ph-action-emerald"
                        title="Download PDF"
                      >
                        {isDownloading
                          ? <Loader2 size={13} className="animate-spin" />
                          : <Download size={13} />
                        }
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-between px-5 py-4 bg-white border-t border-slate-100 rounded-b-2xl">
              {/* Page Status Indicator */}
              <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                Showing {indexOfFirstRecord + 1} - {Math.min(indexOfLastRecord, filtered.length)} of {filtered.length} Records
              </div>

              {/* Navigation Buttons */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                >
                  Prev
                </button>

                {[...Array(totalPages)].map((_, i) => {
                  const pageNum = i + 1;
                  return (
                    <button
                      key={pageNum}
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-7 h-7 rounded-lg text-[10px] font-black transition-all ${
                        currentPage === pageNum
                          ? 'bg-[#18afb1] text-white shadow-sm shadow-[#18afb1]/20'
                          : 'text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200'
                      }`}
                    >
                      {pageNum}
                    </button>
                  );
                })}

                <button
                  onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-[10px] font-black text-slate-500 uppercase tracking-widest hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-transparent transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Footer */}
          {!loading && filtered.length > 0 && (
            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400">
                {filtered.length} of {prescriptions.length} records
              </span>
              {filtered.length !== prescriptions.length && (
                <button onClick={resetFilters} className="text-[10px] font-black text-[#18afb1] hover:underline uppercase tracking-widest">
                  Show all
                </button>
              )}
            </div>
          )}

          {/* Loading stripe */}
          {loading && prescriptions.length > 0 && (
            <div className="h-[2px] bg-slate-100 overflow-hidden">
              <div className="h-full bg-[#18afb1] animate-[ph-load_1.4s_ease-in-out_infinite]" style={{ width: '40%' }} />
            </div>
          )}
        </div>
      </div>

      <style>{`
        .ph-grid {
          display: grid;
          grid-template-columns: 36px 1fr auto 80px 60px 100px;
          align-items: center;
          gap: 0 16px;
        }
        @media (max-width: 768px) {
          .ph-grid {
            grid-template-columns: 36px 1fr 80px 100px;
          }
        }
        @media (max-width: 640px) {
          .ph-grid {
            grid-template-columns: 36px 1fr 80px 88px;
          }
        }

        .ph-search-input {
          width: 100%;
          padding: 9px 12px 9px 34px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          outline: none;
          transition: all 0.2s;
        }
        .ph-search-input:focus {
          border-color: #18afb1;
          background: #fff;
          box-shadow: 0 0 0 3px rgba(24,175,177,0.08);
        }
        .ph-search-input::placeholder { color: #cbd5e1; }

        .ph-date-input {
          width: 100%;
          padding: 9px 14px;
          background: #f8fafc;
          border: 1.5px solid #e2e8f0;
          border-radius: 12px;
          font-size: 13px;
          font-weight: 700;
          color: #1e293b;
          outline: none;
          transition: all 0.2s;
        }
        .ph-date-input:focus {
          border-color: #18afb1;
          background: #fff;
        }

        .ph-action-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 29px; height: 29px; border-radius: 8px;
          border: 1px solid transparent;
          transition: all 0.15s ease; flex-shrink: 0; cursor: pointer;
        }
        .ph-action-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .ph-action-teal   { color: #18afb1; background: rgba(24,175,177,0.08); border-color: rgba(24,175,177,0.2); }
        .ph-action-teal:hover:not(:disabled)   { background: #18afb1; color: white; border-color: #18afb1; }

        .ph-action-violet { color: #7c3aed; background: #f5f3ff; border-color: #ede9fe; }
        .ph-action-violet:hover:not(:disabled) { background: #7c3aed; color: white; border-color: #7c3aed; }

        .ph-action-emerald { color: #059669; background: #ecfdf5; border-color: #d1fae5; }
        .ph-action-emerald:hover:not(:disabled) { background: #059669; color: white; border-color: #059669; }

        .ph-mark { background: #fef08a; color: #713f12; border-radius: 2px; padding: 0 2px; }

        @keyframes ph-load {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
      `}</style>
    </div>
  );
};

export default PrescriptionHistory;