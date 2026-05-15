import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Calendar, Clock, User, Plus, Search,
  ChevronRight, CheckCircle2, XCircle,
  Loader2, Activity, X, Phone, UserCheck, Wallet, RefreshCw, History, PlusCircle, CheckCircle,
  Filter, ChevronDown, SlidersHorizontal, CalendarDays, CircleDot, Edit3,
  Download, FilePen, FileText
} from 'lucide-react';
const API_BAS = import.meta.env.VITE_API_URL;


// ─── Simple 30-second in-memory cache ───────────────────────────────────────
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
// ─────────────────────────────────────────────────────────────────────────────

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
// ─────────────────────────────────────────────────────────────────────────────

const STATUS_OPTIONS = ['All', 'Waiting', 'In-Consultation', 'Completed', 'Cancelled'];

const DATE_PRESET_OPTIONS = [
  { label: 'Today',        value: 'today' },
  { label: 'Yesterday',    value: 'yesterday' },
  { label: 'This Month',   value: 'this_month' },
  { label: 'Last Month',   value: 'last_month' },
  { label: 'Custom Range', value: 'custom' },
];

const Appointments = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [clinicConfig, setClinicConfig]   = useState({ fee: 0, validity: 0 });
  const [queue,        setQueue]          = useState([]);
  const [loading,      setLoading]        = useState(true);
  const [submitting,   setSubmitting]     = useState(false);
  const [showModal,    setShowModal]      = useState(false);
  const [isExistingPatient, setIsExistingPatient] = useState(false);
  const [pdfLoading,   setPdfLoading]    = useState(null);

  // ── Filter State ──────────────────────────────────────────────────────────
  const [showFilters,    setShowFilters]    = useState(false);
  const [searchText,     setSearchText]     = useState('');
  const [statusFilter,   setStatusFilter]   = useState('All');
  const [datePreset,     setDatePreset]     = useState('today');
  const [customStart,    setCustomStart]    = useState(today);
  const [customEnd,      setCustomEnd]      = useState(today);

  // Abort controller ref
  const abortRef = useRef(null);

  // ── FIX 3: Track which appointmentId navigated to prescription page ───────
  // When we return from prescription page, we force a full refresh so that
  // newly created/updated prescriptionId is picked up immediately.
  const prescriptionNavRef = useRef(null);

  const initialForm = {
    patientId: '',
    patientName: '',
    mobile: '',
    appointmentDate: today,
    slotTime: '',
    type: 'Walk-in',
    reason: '',
    visitType: 'NEW',
    fees: 0
  };
  const [formData, setFormData] = useState(initialForm);

  // ── Clinic config ─────────────────────────────────────────────────────────
  const fetchClinicConfig = useCallback(async () => {
    const cacheKey = `clinic-${slug}`;
    const cached = getCache(cacheKey);
    if (cached) { setClinicConfig(cached); return; }
    try {
      const res = await axios.get(`${API_BAS}/api/clinic/${slug}/clinicData`);
      if (res.data.success) {
        const config = { fee: res.data.data.consultationFee, validity: res.data.data?.appointmentValidity || 7 };
        setCache(cacheKey, config);
        setClinicConfig(config);
      }
    } catch (err) { console.error("Clinic config fetch failed", err); }
  }, [slug]);

  // ── Live queue ────────────────────────────────────────────────────────────
  const fetchLiveQueue = useCallback(async (force = false) => {
    const cacheKey = `queue-${slug}`;
    const cached = getCache(cacheKey);
    if (cached && !force) { setQueue(cached); setLoading(false); }
    else setLoading(true);

    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();

    try {
      const res = await axios.get(
        `${API_BAS}/api/appointments/${slug}/live-queue`,
        { params: { page: 1, limit: 100 }, signal: abortRef.current.signal, timeout: 8000 }
      );
      if (res.data.success) { setCache(cacheKey, res.data.data); setQueue(res.data.data); }
    } catch (err) {
      if (axios.isCancel(err) || err.code === 'ERR_CANCELED') return;
      console.error("Queue Fetch Error:", err);
    } finally { setLoading(false); }
  }, [slug]);

  useEffect(() => {
    fetchClinicConfig();
    fetchLiveQueue();
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [slug]);

  // ── FIX 3: Auto-refresh when tab regains visibility after prescription page ──
  // Forces queue refresh so Download/Update buttons appear without manual refresh.
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && prescriptionNavRef.current) {
        clearCache();
        fetchLiveQueue(true);
        prescriptionNavRef.current = null;
      }
    };

    const handleFocus = () => {
      if (prescriptionNavRef.current) {
        clearCache();
        fetchLiveQueue(true);
        prescriptionNavRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [fetchLiveQueue]);

  // ── Navigate to CREATE prescription ──────────────────────────────────────
  const handleGoToPrescription = useCallback(async (apptId) => {
    prescriptionNavRef.current = apptId;
    navigate(`/${slug}/dashboard/prescription/${apptId}`);
  }, [slug, navigate]);

  // ── Navigate to UPDATE prescription ──────────────────────────────────────
  const handleUpdatePrescription = useCallback((apptId) => {
    prescriptionNavRef.current = apptId;
    navigate(`/${slug}/dashboard/prescription/${apptId}?mode=edit`);
  }, [slug, navigate]);

  // ── Compute active date range from preset ─────────────────────────────────
  const activeDateRange = useMemo(() => {
    if (datePreset === 'today')      return { start: today, end: today };
    if (datePreset === 'yesterday') {
      const d = new Date(); d.setDate(d.getDate() - 1);
      const y = toLocalISO(d); return { start: y, end: y };
    }
    if (datePreset === 'this_month')  return getMonthRange(0);
    if (datePreset === 'last_month')  return getMonthRange(-1);
    if (datePreset === 'custom')      return { start: customStart, end: customEnd };
    return { start: null, end: null };
  }, [datePreset, customStart, customEnd]);

  // ── Client-side filtered queue ────────────────────────────────────────────
  const filteredQueue = useMemo(() => {
    return queue.filter(appt => {
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        const nameMatch   = appt.patientName?.toLowerCase().includes(q);
        const mobileMatch = appt.mobile?.includes(q);
        if (!nameMatch && !mobileMatch) return false;
      }
      if (statusFilter !== 'All' && appt.status !== statusFilter) return false;
      if (activeDateRange.start && activeDateRange.end) {
        const apptDate = toLocalISO(new Date(appt.appointmentDate));
        if (apptDate < activeDateRange.start || apptDate > activeDateRange.end) return false;
      }
      return true;
    });
  }, [queue, searchText, statusFilter, activeDateRange]);

  // ── Active filter count badge ─────────────────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (searchText.trim())     count++;
    if (statusFilter !== 'All') count++;
    if (datePreset !== 'today') count++;
    return count;
  }, [searchText, statusFilter, datePreset]);

  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('All');
    setDatePreset('today');
    setCustomStart(today);
    setCustomEnd(today);
  };

  // ── Mobile auto-fill ──────────────────────────────────────────────────────
  const handleMobileChange = async (e) => {
    const val = e.target.value;
    setFormData(prev => ({ ...prev, mobile: val }));
    if (val.length !== 10) return;
    try {
      const [patientRes] = await Promise.all([
        axios.get(`${API_BAS}/api/patients/${slug}/list`, { params: { search: val } })
      ]);
      if (patientRes.data.data.length > 0) {
        const patient = patientRes.data.data[0];
        setIsExistingPatient(true);
        const lastApptRes = await axios.get(`${API_BAS}/api/appointments/${slug}/latest/${val}`);
        if (lastApptRes.data.data) {
          const diffDays = Math.ceil(Math.abs(new Date() - new Date(lastApptRes.data.data.appointmentDate)) / (1000 * 60 * 60 * 24));
          if (diffDays <= clinicConfig.validity) {
            setFormData(prev => ({ ...prev, patientId: patient._id, patientName: patient.name, visitType: 'REVISIT', fees: 0 }));
            return;
          }
        }
        setFormData(prev => ({ ...prev, patientId: patient._id, patientName: patient.name, visitType: 'NEW', fees: clinicConfig.fee }));
      } else {
        setIsExistingPatient(false);
        setFormData(prev => ({ ...prev, patientId: '', patientName: '', visitType: 'NEW', fees: clinicConfig.fee }));
      }
    } catch (err) { console.error("Validity Check Error", err); }
  };

  // ── Status update ─────────────────────────────────────────────────────────
  const handleStatusUpdate = async (id, newStatus) => {
    // Optimistic update
    setQueue(prev => prev.map(appt => appt._id === id ? { ...appt, status: newStatus } : appt));
    try {
      await axios.put(`${API_BAS}/api/appointments/${slug}/update-status/${id}`, { status: newStatus });
      clearCache();
    } catch (err) {
      alert("Status update failed — refreshing...");
      fetchLiveQueue(true);
    }
  };

  // ── Download prescription ─────────────────────────────────────────────────
  const downloadPrescription = async (prescriptionId, patientName = "Patient") => {
    if (!prescriptionId) { alert("Prescription not found!"); return; }
    setPdfLoading(prescriptionId);
    try {
      const res = await axios.get(
        `${API_BAS}/api/prescriptions/prescriptions/${prescriptionId}/download`,
        { responseType: 'arraybuffer', timeout: 15000 }
      );
      const blob    = new Blob([res.data], { type: 'application/pdf' });
      const fileURL = URL.createObjectURL(blob);
      const link    = document.createElement('a');
      link.href     = fileURL;
      link.download = `Prescription-${patientName.replace(/\s+/g, '-')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(fileURL);
    } catch (err) {
      console.error("Download Error:", err);
      alert("Download failed: " + err.message);
    } finally { setPdfLoading(null); }
  };

  const getPrescriptionId = (prescription) => {
    if (!prescription) return null;
    if (typeof prescription === 'object' && prescription._id) return prescription._id;
    return prescription;
  };

  // ── Status config ─────────────────────────────────────────────────────────
  const statusConfig = {
    'In-Consultation': { bar: 'bg-blue-100 text-blue-600',  dot: 'bg-blue-600',    pulse: true  },
    'Completed':       { bar: 'bg-emerald-100 text-emerald-600', dot: 'bg-emerald-600', pulse: false },
    'Waiting':         { bar: 'bg-amber-100 text-amber-600', dot: 'bg-amber-600',   pulse: false },
    'Cancelled':       { bar: 'bg-red-100 text-red-500',     dot: 'bg-red-500',     pulse: false },
  };

  const statusTabColors = {
    'All':             { active: 'bg-slate-900 text-white', inactive: 'text-slate-500 hover:text-slate-800' },
    'Waiting':         { active: 'bg-amber-500 text-white', inactive: 'text-amber-600 hover:bg-amber-50' },
    'In-Consultation': { active: 'bg-blue-500 text-white',  inactive: 'text-blue-600 hover:bg-blue-50' },
    'Completed':       { active: 'bg-emerald-500 text-white', inactive: 'text-emerald-600 hover:bg-emerald-50' },
    'Cancelled':       { active: 'bg-red-500 text-white',   inactive: 'text-red-500 hover:bg-red-50' },
  };

  // ── Stats for header ──────────────────────────────────────────────────────
  const stats = useMemo(() => ({
    total:    filteredQueue.length,
    waiting:  filteredQueue.filter(a => a.status === 'Waiting').length,
    active:   filteredQueue.filter(a => a.status === 'In-Consultation').length,
    done:     filteredQueue.filter(a => a.status === 'Completed').length,
  }), [filteredQueue]);

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10 font-sans text-slate-900">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">Live System</span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-800 flex items-center gap-3">
            Queue Studio <Activity className="text-[#18afb1]" size={24} />
          </h1>
        </div>

        <div className="flex items-center gap-3 ml-auto">
          <button
            onClick={() => fetchLiveQueue(true)}
            disabled={loading}
            className="p-3 rounded-xl border border-slate-200 text-slate-400 hover:text-[#18afb1] hover:border-[#18afb1] transition-all disabled:opacity-40"
            title="Refresh Queue"
          >
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link
            to={`/${slug}/dashboard/appointmentHistory`}
            className="bg-emerald-500 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-emerald-100 hover:bg-emerald-600 transition-all flex items-center gap-2"
          >
            <History size={16} /> History
          </Link>
          <Link
            to={`/${slug}/dashboard/appointment/new`}
            className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl hover:shadow-slate-200 transition-all active:scale-95 flex items-center gap-2"
          >
            <Plus size={16} /> New Appointment
          </Link>
        </div>
      </div>

      {/* ── FILTER PANEL ──────────────────────────────────────────────────── */}
      <div className="mb-6 space-y-3">

        {/* Row 1: Search + Filter Toggle + Stats */}
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">

          {/* Search box */}
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

          {/* Filter toggle button */}
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

          {/* Mini stats */}
          <div className="flex items-center gap-3 ml-auto">
            {[
              { label: 'Total',   val: stats.total,   color: 'text-slate-600 bg-slate-100' },
              { label: 'Waiting', val: stats.waiting, color: 'text-amber-600 bg-amber-50' },
              { label: 'Active',  val: stats.active,  color: 'text-blue-600 bg-blue-50' },
              { label: 'Done',    val: stats.done,    color: 'text-emerald-600 bg-emerald-50' },
            ].map(s => (
              <div key={s.label} className={`px-3 py-1.5 rounded-xl ${s.color} text-center hidden sm:block`}>
                <p className="text-lg font-black leading-none">{s.val}</p>
                <p className="text-[8px] font-black uppercase tracking-wider opacity-70">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Row 2: Status tabs (always visible) */}
        <div className="flex items-center gap-2 flex-wrap">
          {STATUS_OPTIONS.map(status => {
            const colors = statusTabColors[status] || statusTabColors['All'];
            const isActive = statusFilter === status;
            const count = status === 'All'
              ? queue.length
              : queue.filter(a => a.status === status).length;
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
        </div>

        {/* Row 3: Expanded date filter panel */}
        {showFilters && (
          <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <CalendarDays size={15} className="text-[#18afb1]" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date Filter</span>
            </div>

            {/* Preset pills */}
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

            {/* Custom range inputs */}
            {datePreset === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-4 pt-1">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">From</label>
                  <input
                    type="date"
                    value={customStart}
                    max={customEnd}
                    onChange={e => setCustomStart(e.target.value)}
                    className="professional-input"
                  />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">To</label>
                  <input
                    type="date"
                    value={customEnd}
                    min={customStart}
                    onChange={e => setCustomEnd(e.target.value)}
                    className="professional-input"
                  />
                </div>
              </div>
            )}

            {/* Active date range summary */}
            {activeDateRange.start && (
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-4 py-2 rounded-xl w-fit">
                <CalendarDays size={11} />
                Showing: {activeDateRange.start === activeDateRange.end
                  ? activeDateRange.start
                  : `${activeDateRange.start} → ${activeDateRange.end}`
                }
              </div>
            )}
          </div>
        )}
      </div>

      {/* QUEUE TABLE */}
      <div className="bg-white border border-slate-200 rounded-[24px] overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/50 border-b border-slate-100">
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Token</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Details</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Mobile</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Visit Date</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
              <th className="p-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-50">
            {loading && queue.length === 0 ? (
              [...Array(5)].map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td className="p-5"><div className="w-10 h-10 bg-slate-100 rounded-xl" /></td>
                  <td className="p-5">
                    <div className="h-3.5 bg-slate-100 rounded w-32 mb-2" />
                    <div className="h-2.5 bg-slate-50 rounded w-20" />
                  </td>
                  <td className="p-4"><div className="h-3 bg-slate-100 rounded w-24" /></td>
                  <td className="p-4"><div className="h-3 bg-slate-100 rounded w-16" /></td>
                  <td className="p-5 text-center"><div className="h-6 bg-slate-100 rounded-full w-24 mx-auto" /></td>
                  <td className="p-5"><div className="h-8 bg-slate-100 rounded-lg w-20 ml-auto" /></td>
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
                      {queue.length > 0 ? 'No Records Match Filters' : 'No Records Found'}
                    </p>
                    {queue.length > 0 && (
                      <button onClick={resetFilters} className="text-[10px] font-black text-[#18afb1] uppercase tracking-widest hover:underline">
                        Clear Filters
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ) : (
              filteredQueue.map((appt) => {
                const sc = statusConfig[appt.status] || statusConfig['Waiting'];

                // Resolve prescriptionId from whatever shape the backend returns
                const prescriptionId = appt.prescriptions?.length > 0
                  ? getPrescriptionId(appt.prescriptions[0])
                  : null;

                return (
                  <tr
                    key={appt._id}
                    className={`group hover:bg-slate-50/50 transition-colors ${appt.status === 'In-Consultation' ? 'bg-blue-50/30' : ''}`}
                  >
                    {/* Token */}
                    <td className="p-5">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm
                        ${appt.status === 'In-Consultation' ? 'bg-[#18afb1] text-white' : 'bg-slate-100 text-slate-500'}`}>
                        {appt.patientId?._id?.slice(-4).toUpperCase() ?? '—'}
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
                          ${appt.visitType === 'REVISIT' ? 'text-blue-500 bg-blue-50' : 'text-emerald-500 bg-emerald-50'}`}>
                          {appt.visitType}
                        </span>
                        <span className="text-[10px] font-medium text-slate-400">
                          ₹{appt.fees} • {appt.type}
                        </span>
                      </div>
                    </td>

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

                    <td className="p-4">
                      <span className="text-[11px] font-bold text-slate-600">
                        {new Date(appt.appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                      </span>
                    </td>

                    {/* Status Badge */}
                    <td className="p-5 text-center">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-wider ${sc.bar} ${sc.pulse ? 'animate-pulse' : ''}`}>
                        <div className={`w-1.5 h-1.5 rounded-full ${sc.dot}`} />
                        {appt.status}
                      </span>
                    </td>

                    {/* ── Actions ─────────────────────────────────────────── */}
                    <td className="p-5 text-right">
                      <div className="flex items-center justify-end gap-1.5">

                        {/* WAITING → Start */}
                        {appt.status === 'Waiting' && (
                          <button
                            onClick={() => handleStatusUpdate(appt._id, 'In-Consultation')}
                            className="bg-slate-900 text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase hover:bg-blue-600 transition-all"
                          >
                            Start
                          </button>
                        )}

                        {/*
                          IN-CONSULTATION
                          ───────────────
                          FIX 2: Removed the green CheckCircle "Mark as Completed" button.
                          The only action is "Prescription" — saving the prescription
                          auto-marks the appointment as Completed on the backend.
                          If the doctor wants to skip prescription, they can cancel instead.
                        */}
                        {appt.status === 'In-Consultation' && (
                          <button
                            onClick={() => handleGoToPrescription(appt._id)}
                            className="bg-[#18afb1] text-white px-4 py-2 rounded-lg font-black text-[9px] uppercase flex items-center gap-1.5 shadow-lg shadow-[#18afb1]/20 hover:scale-105 transition-all"
                          >
                            <PlusCircle size={12} /> Prescription
                          </button>
                        )}

                        {/*
                          COMPLETED
                          ─────────
                          FIX 1 & 3:
                          • Download always fetches the latest prescription (backend update fixed this)
                          • Update navigates with ?mode=edit so backend does findByIdAndUpdate
                          • Buttons appear instantly because backend now returns prescriptionId
                            in the save response, and the visibility listener force-refreshes queue
                        */}
                        {appt.status === 'Completed' && (
                          <>
                            {prescriptionId ? (
                              <>
                                {/* ── Download icon button ── */}
                                <button
                                  onClick={() => downloadPrescription(prescriptionId, appt.patientName)}
                                  disabled={pdfLoading === prescriptionId}
                                  className="icon-action-btn text-emerald-600 bg-emerald-50 border-emerald-100 hover:bg-emerald-600 hover:text-white hover:border-emerald-600"
                                  title="Download Prescription PDF"
                                >
                                  {pdfLoading === prescriptionId
                                    ? <Loader2 size={15} className="animate-spin" />
                                    : <Download size={15} />
                                  }
                                </button>

                                {/* ── Update (Edit) icon button ── */}
                                <button
                                  onClick={() => handleUpdatePrescription(appt._id)}
                                  className="icon-action-btn text-violet-600 bg-violet-50 border-violet-100 hover:bg-violet-600 hover:text-white hover:border-violet-600"
                                  title="Edit / Update Prescription"
                                >
                                  <FilePen size={15} />
                                </button>
                              </>
                            ) : (
                              /* Completed but prescription not yet created */
                              <button
                                onClick={() => handleGoToPrescription(appt._id)}
                                className="icon-action-btn text-slate-500 bg-slate-100 border-slate-200 hover:bg-[#18afb1] hover:text-white hover:border-[#18afb1]"
                                title="Add Prescription"
                              >
                                <FileText size={15} />
                              </button>
                            )}
                          </>
                        )}

                        {/* Cancel button — only for non-terminal, non-In-Consultation statuses
                            FIX 2: Removed from In-Consultation since CheckCircle was also removed there.
                            Cancel is still available for Waiting appointments. */}
                        {appt.status === 'Waiting' && (
                          <button
                            onClick={() => handleStatusUpdate(appt._id, 'Cancelled')}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                            title="Cancel appointment"
                          >
                            <XCircle size={18} />
                          </button>
                        )}

                        {/* For In-Consultation: allow cancel too in case doctor wants to abort */}
                        {appt.status === 'In-Consultation' && (
                          <button
                            onClick={() => handleStatusUpdate(appt._id, 'Cancelled')}
                            className="p-2 text-slate-300 hover:text-red-500 transition-colors"
                            title="Cancel appointment"
                          >
                            <XCircle size={18} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Result count footer */}
        {!loading && filteredQueue.length > 0 && (
          <div className="px-6 py-4 border-t border-slate-50 flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">
              Showing {filteredQueue.length} of {queue.length} records
            </span>
            {filteredQueue.length !== queue.length && (
              <button onClick={resetFilters} className="text-[10px] font-black text-[#18afb1] uppercase tracking-widest hover:underline">
                Show All
              </button>
            )}
          </div>
        )}

        {/* Subtle loading bar */}
        {loading && queue.length > 0 && (
          <div className="h-0.5 bg-slate-100 overflow-hidden">
            <div className="h-full bg-[#18afb1] animate-[loading_1.5s_ease-in-out_infinite]" style={{ width: '40%' }} />
          </div>
        )}
      </div>

      {/* BOOKING MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
          <div className="bg-white w-full max-w-lg rounded-[48px] shadow-2xl border border-slate-100 overflow-hidden">
            <form onSubmit={(e) => { e.preventDefault(); /* handleBooking */ }}>
              <div className="p-10 border-b border-slate-50 flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter">Issue Token</h2>
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">
                    Validity: {clinicConfig.validity} Days
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => { setShowModal(false); setFormData(initialForm); setIsExistingPatient(false); }}
                  className="w-12 h-12 flex items-center justify-center hover:bg-slate-50 rounded-full text-slate-300 transition-colors"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="p-10 space-y-6">
                <div className="space-y-2 relative">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Number</label>
                  <input
                    required className="professional-input"
                    value={formData.mobile}
                    onChange={handleMobileChange}
                    placeholder="Enter 10 digit mobile"
                    maxLength={10}
                  />
                  {isExistingPatient && (
                    <div className="absolute right-4 top-11 flex items-center gap-1.5 text-[10px] font-black text-green-500 bg-green-50 px-3 py-1 rounded-lg border border-green-100">
                      <UserCheck size={12} /> RECORD FOUND
                    </div>
                  )}
                </div>

                <div className={`p-5 rounded-[28px] border-2 transition-all flex items-center justify-between
                  ${formData.visitType === 'REVISIT' ? 'bg-blue-50 border-blue-100 shadow-lg shadow-blue-50' : 'bg-slate-50 border-slate-100'}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center
                      ${formData.visitType === 'REVISIT' ? 'bg-blue-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                      {formData.visitType === 'REVISIT' ? <RefreshCw size={20} /> : <Wallet size={20} />}
                    </div>
                    <div>
                      <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Visit Type</p>
                      <p className={`text-sm font-black uppercase ${formData.visitType === 'REVISIT' ? 'text-blue-600' : 'text-slate-800'}`}>
                        {formData.visitType}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Consultation Fees</p>
                    <p className="text-xl font-black text-slate-900">₹{formData.fees}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Patient Name</label>
                  <input
                    required
                    readOnly={isExistingPatient}
                    className={`professional-input ${isExistingPatient ? 'bg-slate-50 text-slate-500' : ''}`}
                    value={formData.patientName}
                    onChange={(e) => setFormData(prev => ({ ...prev, patientName: e.target.value }))}
                    placeholder="Full Name"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Date</label>
                    <input
                      type="date" required className="professional-input"
                      value={formData.appointmentDate}
                      onChange={(e) => setFormData(prev => ({ ...prev, appointmentDate: e.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Slot</label>
                    <input
                      type="time" className="professional-input"
                      value={formData.slotTime}
                      onChange={(e) => setFormData(prev => ({ ...prev, slotTime: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div className="p-10 bg-slate-50">
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-slate-900 text-white py-6 rounded-[24px] font-black text-[11px] uppercase tracking-[4px] shadow-2xl active:scale-95 transition-all disabled:opacity-60"
                >
                  {submitting ? 'Processing...' : `Confirm & Issue ${formData.visitType} Token`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style>{`
        .professional-input {
          width: 100%; background: #f8fafc; border: 2px solid #f1f5f9; border-radius: 20px;
          padding: 16px 22px; font-size: 14px; font-weight: 800; color: #1e293b; outline: none; transition: 0.3s;
        }
        .professional-input:focus {
          border-color: #18afb1; background: #fff;
          box-shadow: 0 10px 30px -10px rgba(24, 175, 177, 0.15);
        }

        /* Icon-only action button — compact square */
        .icon-action-btn {
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
        .icon-action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        @keyframes loading {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%); }
        }
        mark { background: #fef08a; color: #854d0e; border-radius: 3px; padding: 0 2px; }
      `}</style>
    </div>
  );
};

export default Appointments;