import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import axios from 'axios';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Search, Plus, RefreshCw, X, Eye, Edit3, Trash2,
  Wallet, CalendarDays, SlidersHorizontal, ChevronLeft,
  ChevronRight, Loader2, Activity, FileText, IndianRupee,
  User, Phone, MapPin, Droplets, AlertCircle, History, ArrowLeft,
  AlertTriangle, CheckCircle2, Clock, Mail, Weight, Ruler, HeartPulse,Save,
  UserCheck
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
// ─────────────────────────────────────────────────────────────────────────────

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
const PAYMENT_OPTIONS = ['All', 'Paid', 'Partial', 'Unpaid'];

const DATE_PRESET_OPTIONS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'last_month' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom Range', value: 'custom' },
];

const statusConfig = {
  'In-Consultation': { bar: 'bg-blue-100 text-blue-600', dot: 'bg-blue-600', pulse: true },
  'Completed': { bar: 'bg-emerald-100 text-emerald-600', dot: 'bg-emerald-600', pulse: false },
  'Waiting': { bar: 'bg-amber-100 text-amber-600', dot: 'bg-amber-600', pulse: false },
  'Cancelled': { bar: 'bg-red-100 text-red-500', dot: 'bg-red-500', pulse: false },
};

const paymentConfig = {
  'Paid': 'bg-emerald-100 text-emerald-700',
  'Partial': 'bg-amber-100 text-amber-700',
  'Unpaid': 'bg-red-100 text-red-600',
};

const statusTabColors = {
  'All': { active: 'bg-slate-900 text-white', inactive: 'text-slate-500 hover:text-slate-800 bg-white' },
  'Waiting': { active: 'bg-amber-500 text-white', inactive: 'text-amber-600 hover:bg-amber-50 bg-white' },
  'In-Consultation': { active: 'bg-blue-500 text-white', inactive: 'text-blue-600 hover:bg-blue-50 bg-white' },
  'Completed': { active: 'bg-emerald-500 text-white', inactive: 'text-emerald-600 hover:bg-emerald-50 bg-white' },
  'Cancelled': { active: 'bg-red-500 text-white', inactive: 'text-red-500 hover:bg-red-50 bg-white' },
};

// ─── EDIT MODAL FIELD COMPONENTS ─────────────────────────────────────────────
// IMPORTANT: These MUST live at module level (outside EditModal).
// If defined inside EditModal, React treats them as new components on every
// keystroke → unmounts/remounts every input → focus loss + lag.

const EditSectionLabel = ({ children }) => (
  <p className="col-span-2 text-[9px] font-black text-slate-400 uppercase tracking-widest pt-4 pb-1 border-b border-slate-100">
    {children}
  </p>
);

const ApptField = ({ label, k, type = 'text', opts, span2 = false, value, onChange }) => (
  <div className={`space-y-2 ${span2 ? 'col-span-2' : ''}`}>
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    {opts
      ? (
        <select value={value} onChange={e => onChange(k, e.target.value)} className="professional-input">
          {opts.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input type={type} value={value} onChange={e => onChange(k, e.target.value)} className="professional-input" />
      )
    }
  </div>
);

const PatField = ({ label, k, type = 'text', opts, span2 = false, readOnly = false, value, onChange }) => (
  <div className={`space-y-2 ${span2 ? 'col-span-2' : ''}`}>
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    {opts
      ? (
        <select value={value} onChange={e => onChange(k, e.target.value)} className="professional-input" disabled={readOnly}>
          {opts.map(o => <option key={o}>{o}</option>)}
        </select>
      ) : (
        <input
          type={type}
          value={value}
          onChange={e => onChange(k, e.target.value)}
          className={`professional-input ${readOnly ? 'opacity-60 cursor-not-allowed' : ''}`}
          readOnly={readOnly}
        />
      )
    }
  </div>
);
// ─────────────────────────────────────────────────────────────────────────────

// ─── VIEW MODAL ───────────────────────────────────────────────────────────────
// ─── VIEW MODAL (FULL POPUP VIEW - NO INTERNAL SCROLL) ───────────────────────────
function ViewModal({ appt, onClose }) {
  const { slug } = useParams();

  const [patient, setPatient] = useState(null);
  const [patientLoading, setPatientLoading] = useState(true);
  const [patientError, setPatientError] = useState(false);

  useEffect(() => {
    if (!appt) return;

    const pid = typeof appt.patientId === 'object' && appt.patientId?._id
      ? appt.patientId._id
      : appt.patientId;

    if (!pid) {
      setPatientLoading(false);
      return;
    }

    let cancelled = false;
    setPatientLoading(true);
    setPatientError(false);

    axios.get(`${API_BAS}/api/patients/${slug}/profile/${pid}`)
      .then(res => {
        if (cancelled) return;
        const data = res.data?.data || res.data?.patient || res.data;
        setPatient(data);
      })
      .catch(() => {
        if (cancelled) return;
        setPatient(typeof appt.patientId === 'object' ? appt.patientId : null);
        setPatientError(true);
      })
      .finally(() => { if (!cancelled) setPatientLoading(false); });

    return () => { cancelled = true; };
  }, [appt?.patientId, slug]);

  if (!appt) return null;

  const p = patient || (typeof appt.patientId === 'object' ? appt.patientId : {});
  const sc = statusConfig[appt.status] || statusConfig['Waiting'];
  const pc = paymentConfig[appt.billing?.paymentStatus] || paymentConfig['Unpaid'];

  const InfoRow = ({ icon, label, value }) => {
    if (value === null || value === undefined || value === '') return null;
    return (
      <div className="flex items-start gap-2.5 py-2 border-b border-slate-100 last:border-0">
        <div className="w-6 h-6 rounded bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5 border border-slate-200/60">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{label}</p>
          <p className="text-xs font-semibold text-slate-800 break-words">{value}</p>
        </div>
      </div>
    );
  };

  const SectionLabel = ({ children }) => (
    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pb-1 border-b border-slate-200 mb-2">
      {children}
    </p>
  );

  const fullName   = p.name        || appt.patientName || '';
  const mobile      = appt.mobile   || p.mobile         || '';
  const emMobile   = p.emMobile    || '';
  const email      = p.email       || '';
  const age        = p.age         ?? null;
  const gender     = p.gender      || '';
  const ageGender  = [age != null ? `${age} yrs` : null, gender || null].filter(Boolean).join(' • ') || null;
  const bloodGroup = p.bloodGroup  || '';
  const refType    = p.referenceType || '';
  const refName    = p.referenceName || '';
  const referenceBy = refType === 'Self'
    ? 'Self'
    : [refName, refType].filter(Boolean).join(' — ') || null;
  const weight     = appt.vitals?.weight ?? p.weight ?? null;
  const height     = appt.vitals?.height ?? p.height ?? null;
  const bmi        = appt.vitals?.bmi    ?? p.bmi    ?? null;
  const address    = p.address    || '';
  const allergies  = p.allergies  || '';
  const bookingDate = appt.appointmentDate
    ? new Date(appt.appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })
    : null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl border border-slate-200 flex flex-col overflow-hidden antialiased">
        
        {/* ── HEADER BLOCK ── */}
        <div className="px-6 py-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-lg font-black text-slate-900 tracking-tight">{fullName}</h2>
                <div className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${sc.bar.replace('bg-', 'border-')}`}>
                  <div className={`w-1 h-1 rounded-full ${sc.dot}`} />
                  {appt.status}
                </div>
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-0.5">
                Token <span className="font-bold text-slate-700">#{appt.tokenNumber}</span> • {appt.visitType} • Booking Date: <span className="font-bold text-slate-700">{bookingDate || '—'}</span>
              </p>
            </div>
          </div>
          
          <button 
            onClick={onClose} 
            className="w-8 h-8 flex items-center justify-center border border-slate-200 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
          >
            <X size={16} />
          </button>
        </div>

        {/* ── CORE GRID CONTAINER (NO INTERNAL SCROLLING) ── */}
        <div className="p-6 bg-white">
          
          {/* Status Fallbacks */}
          {!patientLoading && patientError && (
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
              <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />
              <p className="text-[11px] font-medium text-amber-800">
                System warning: Unable to sync with archive storage files. Displaying active profile fallback data.
              </p>
            </div>
          )}

          {patientLoading ? (
            <div className="grid grid-cols-4 gap-6 animate-pulse py-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="space-y-3">
                  <div className="h-3 bg-slate-100 rounded w-16" />
                  <div className="h-8 bg-slate-100 rounded w-full" />
                  <div className="h-8 bg-slate-100 rounded w-full" />
                </div>
              ))}
            </div>
          ) : (
            
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
              
              {/* SECTION 1: CONTACT ARCHITECTURE */}
              <div className="space-y-1">
                <SectionLabel>Contact Details</SectionLabel>
                <InfoRow icon={<Phone size={12} className="text-slate-500" />} label="Primary Mobile / WhatsApp" value={mobile} />
                <InfoRow icon={<Phone size={12} className="text-amber-600" />} label="Emergency Backup Contact" value={emMobile} />
                <InfoRow icon={<Mail size={12} className="text-slate-500" />} label="Secure Email Address" value={email} />
              </div>

              {/* SECTION 2: BIOMETRIC & BIO DETAILS */}
              <div className="space-y-1">
                <SectionLabel>Personal Dossier</SectionLabel>
                <InfoRow icon={<User size={12} className="text-slate-500" />} label="Full Patient Name" value={fullName} />
                <InfoRow icon={<User size={12} className="text-slate-500" />} label="Demographics (Age/Gender)" value={ageGender} />
                <InfoRow icon={<Droplets size={12} className="text-red-500" />} label="Blood Group Matrix" value={bloodGroup} />
                <InfoRow icon={<UserCheck size={12} className="text-slate-500" />} label="Referral Attribution" value={referenceBy} />
              </div>

              {/* SECTION 3: CLINICAL METRICS */}
              <div className="space-y-1">
                <SectionLabel>Vitals Index & Environment</SectionLabel>
                <InfoRow icon={<Activity size={12} className="text-slate-500" />} label="Recorded Weight" value={weight != null ? `${weight} kg` : null} />
                <InfoRow icon={<Activity size={12} className="text-slate-500" />} label="Recorded Height" value={height != null ? `${height} ft` : null} />
                <InfoRow icon={<Activity size={12} className="text-slate-500" />} label="Computed BMI Matrix" value={bmi != null ? `${bmi}` : null} />
                <InfoRow icon={<AlertCircle size={12} className="text-red-500" />} label="Allergies / Contraindications" value={allergies} />
              </div>

              {/* SECTION 4: LEDGER & PERIPHERAL ACTIONS */}
              <div className="space-y-3">
                <SectionLabel>Financial Status</SectionLabel>
                
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between gap-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Collected / Invoice total</p>
                      <p className="text-base font-black text-slate-900 mt-0.5">
                        ₹{appt.billing?.paidAmount || 0}
                        <span className="text-slate-400 font-bold text-xs"> / ₹{appt.billing?.totalFees || 0}</span>
                      </p>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider ${pc}`}>
                      {appt.billing?.paymentStatus || 'Unpaid'}
                    </span>
                  </div>

                  {appt.billing?.paymentMethod && (
                    <div className="flex items-center justify-between text-[10px] pt-2 border-t border-slate-200">
                      <span className="text-slate-400 font-medium">Payment Mode</span>
                      <span className="font-bold text-slate-700">{appt.billing.paymentMethod}</span>
                    </div>
                  )}
                </div>

                {/* Arrears Indicator */}
                {appt.billing?.previousDue > 0 && appt.billing?.paymentStatus !== 'Paid' && (
                  <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-2.5">
                    <AlertTriangle size={13} className="text-amber-600 flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] font-medium text-amber-800 leading-tight">
                      Outstanding balance of <span className="font-bold">₹{appt.billing.previousDue}</span> linked to history.
                    </p>
                  </div>
                )}

                {/* Prescription Count Badge */}
                {appt.prescriptions?.length > 0 && (
                  <div className="flex items-center gap-2 bg-emerald-50/60 border border-emerald-100 rounded-xl px-3 py-2">
                    <FileText size={13} className="text-emerald-600" />
                    <p className="text-[11px] font-bold text-emerald-700">
                      {appt.prescriptions.length} Prescriptions Logged
                    </p>
                  </div>
                )}

              </div>

            </div>
          )}

          {/* Full-width Address Footer row to optimize space cleanly */}
          {!patientLoading && address && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center gap-2">
              <MapPin size={13} className="text-slate-400 flex-shrink-0" />
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Registered Residence:</p>
              <p className="text-xs font-medium text-slate-700 truncate">{address}</p>
            </div>
          )}

        </div>

      </div>
    </div>
  );
}
// ─── PAYMENT MODAL ────────────────────────────────────────────────────────────
function PaymentModal({ appt, onClose, onSave }) {
  const { slug } = useParams();

  const [form, setForm] = useState({
    paymentStatus: appt?.billing?.paymentStatus || 'Unpaid',
    paidAmount: appt?.billing?.paidAmount ?? 0,
    totalFees: appt?.billing?.totalFees ?? 0,
    paymentMethod: appt?.billing?.paymentMethod || 'Cash',
  });
  const [saving, setSaving] = useState(false);
  const [revisitInfo, setRevisitInfo] = useState(null);
  const [revisitInfoLoading, setRevisitInfoLoading] = useState(false);

  useEffect(() => {
    if (!appt?.mobile) return;
    const fetchRevisitStatus = async () => {
      setRevisitInfoLoading(true);
      try {
        const res = await axios.get(
          `${API_BAS}/api/appointments/${slug}/revisit-payment/${appt.mobile}`
        );
        if (res.data.success && !res.data.isNew) {
          setRevisitInfo(res.data);
        }
      } catch (err) {
        console.warn('Revisit payment status fetch failed:', err.message);
      } finally {
        setRevisitInfoLoading(false);
      }
    };
    fetchRevisitStatus();
  }, [appt?.mobile, slug]);

  const [manualStatus, setManualStatus] = useState(false);

  const handleAmountChange = (field, value) => {
    setForm(prev => {
      const updated = { ...prev, [field]: value };
      if (!manualStatus) {
        const paid = Number(field === 'paidAmount' ? value : updated.paidAmount) || 0;
        const total = Number(field === 'totalFees' ? value : updated.totalFees) || 0;
        if (total > 0) {
          if (paid >= total) updated.paymentStatus = 'Paid';
          else if (paid > 0) updated.paymentStatus = 'Partial';
          else updated.paymentStatus = 'Unpaid';
        }
      }
      return updated;
    });
  };

  const handleStatusChange = (value) => {
    setManualStatus(true);
    setForm(f => ({ ...f, paymentStatus: value }));
  };

  const handleSave = async () => {
    const paid = Number(form.paidAmount) || 0;
    const total = Number(form.totalFees) || 0;
    let finalStatus = form.paymentStatus;
    if (total > 0 && paid >= total) finalStatus = 'Paid';
    if (paid === 0 && total > 0) finalStatus = 'Unpaid';

    const payload = { ...form, paymentStatus: finalStatus };
    setSaving(true);
    try {
      const res = await axios.patch(
        `${API_BAS}/api/appointments/${slug}/${appt._id}/payment`,
        payload
      );
      if (res.data.success) {
        clearCache();
        onSave(res.data.data);
      }
    } catch (e) {
      alert('Payment update failed: ' + (e.response?.data?.message || e.message));
    }
    setSaving(false);
  };

  const balance = Math.max(0, (Number(form.totalFees) || 0) - (Number(form.paidAmount) || 0));
  const currentAlreadyPaid = appt?.billing?.paymentStatus === 'Paid';
  const prevStatus = revisitInfo?.previousPaymentStatus;
  const prevDue = revisitInfo?.previousDue || 0;
  const showDueBanner = !currentAlreadyPaid && (prevStatus === 'Partial' || prevStatus === 'Unpaid');
  const showClearedBanner = !currentAlreadyPaid && prevStatus === 'Paid';

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-md rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Payment</h2>
            <p className="text-[10px] font-bold text-slate-400 mt-0.5">{appt.patientName}</p>
          </div>
          <button onClick={onClose} className="w-10 h-10 flex items-center justify-center hover:bg-slate-50 rounded-full text-slate-300 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-5">
          {revisitInfoLoading && (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-[16px] px-4 py-3">
              <Loader2 size={14} className="text-slate-400 animate-spin flex-shrink-0" />
              <p className="text-[11px] font-bold text-slate-400">Checking previous payment history…</p>
            </div>
          )}

          {!revisitInfoLoading && showDueBanner && prevStatus === 'Unpaid' && (
            <div className="flex items-start gap-3 bg-red-50 border-2 border-red-100 rounded-[16px] px-4 py-4">
              <AlertTriangle size={16} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-black text-red-700 uppercase tracking-wider">Previous Visit — Unpaid</p>
                <p className="text-[12px] font-bold text-red-600 mt-0.5">₹{prevDue} was not paid in the last visit.</p>
                <p className="text-[10px] text-red-400 font-bold mt-1">Please collect ₹{prevDue} + current consultation fee.</p>
              </div>
            </div>
          )}

          {!revisitInfoLoading && showDueBanner && prevStatus === 'Partial' && (
            <div className="flex items-start gap-3 bg-amber-50 border-2 border-amber-100 rounded-[16px] px-4 py-4">
              <Clock size={16} className="text-amber-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-[11px] font-black text-amber-700 uppercase tracking-wider">Previous Visit — Partial Payment</p>
                <p className="text-[12px] font-bold text-amber-600 mt-0.5">₹{prevDue} still due from the last visit.</p>
                <p className="text-[10px] text-amber-500 font-bold mt-1">
                  Last visit: {revisitInfo?.lastVisitDate
                    ? new Date(revisitInfo.lastVisitDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                    : '—'}
                </p>
              </div>
            </div>
          )}

          {!revisitInfoLoading && showClearedBanner && (
            <div className="flex items-center gap-3 bg-emerald-50 border-2 border-emerald-100 rounded-[16px] px-4 py-3">
              <CheckCircle2 size={16} className="text-emerald-500 flex-shrink-0" />
              <div>
                <p className="text-[11px] font-black text-emerald-700 uppercase tracking-wider">Previous Visit — Fully Paid ✓</p>
                <p className="text-[10px] text-emerald-500 font-bold mt-0.5">No dues pending from the last visit.</p>
              </div>
            </div>
          )}

          <div className={`p-5 rounded-[20px] border-2 flex items-center justify-between ${balance === 0 ? 'bg-emerald-50 border-emerald-100' : 'bg-amber-50 border-amber-100'}`}>
            <div>
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Balance Due (This Visit)</p>
              <p className={`text-2xl font-black ${balance === 0 ? 'text-emerald-600' : 'text-amber-600'}`}>₹{balance}</p>
            </div>
            <IndianRupee size={28} className={balance === 0 ? 'text-emerald-200' : 'text-amber-200'} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Total Fees (₹)</label>
              <input type="number" value={form.totalFees} onChange={e => handleAmountChange('totalFees', e.target.value)} className="professional-input" min="0" />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Paid Amount (₹)</label>
              <input type="number" value={form.paidAmount} onChange={e => handleAmountChange('paidAmount', e.target.value)} className="professional-input" min="0" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
              <select value={form.paymentStatus} onChange={e => handleStatusChange(e.target.value)} className="professional-input">
                {['Paid', 'Partial', 'Unpaid'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Method</label>
              <select value={form.paymentMethod} onChange={e => setForm(f => ({ ...f, paymentMethod: e.target.value }))} className="professional-input">
                {['Cash', 'UPI', 'Card', 'Online'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest text-center">
            Status auto-derives from amounts · override manually if needed
          </p>
        </div>

        <div className="px-8 pb-8">
          <button onClick={handleSave} disabled={saving}
            className="w-full bg-slate-900 text-white py-5 rounded-[20px] font-black text-[11px] uppercase tracking-[3px] active:scale-95 transition-all disabled:opacity-60">
            {saving ? 'Saving...' : 'Save Payment'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EDIT MODAL ──────────────────────────────────────────────────────────
function EditModal({ appt, onClose, onSave }) {
  const { slug } = useParams();

  const [patientLoading, setPatientLoading] = useState(true);
  const [patientId, setPatientId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const [apptForm, setApptForm] = useState({
    appointmentDate: appt?.appointmentDate?.slice(0, 10) || '',
    visitType: appt?.visitType || 'New Patient',
    status: appt?.status || 'Waiting',
  });

  const [patientForm, setPatientForm] = useState({
    mobile: '',
    emMobile: '',
    name: '',
    email: '',
    age: '',
    gender: 'Male',
    bloodGroup: '',
    weight: '',
    height: '',
    bmi: '',
    referenceType: 'Self',
    referenceName: '',
    address: '',
    allergies: '',
  });

  const handleApptChange = useCallback((k, v) => {
    setApptForm(f => ({ ...f, [k]: v }));
  }, []);

  const handlePatientChange = useCallback((key, value) => {
    setPatientForm(prev => {
      const updated = { ...prev, [key]: value };
      if (key === 'weight' || key === 'height') {
        const w = parseFloat(key === 'weight' ? value : prev.weight);
        const h = parseFloat(key === 'height' ? value : prev.height) / 100;
        if (w > 0 && h > 0) {
          updated.bmi = (w / (h * h)).toFixed(2);
        } else {
          updated.bmi = '';
        }
      }
      return updated;
    });
  }, []);

  useEffect(() => {
    const pid = typeof appt?.patientId === 'object' && appt.patientId?._id
      ? appt.patientId._id
      : appt?.patientId;

    if (!pid) {
      setPatientLoading(false);
      return;
    }

    setPatientId(pid);
    let cancelled = false;

    axios.get(`${API_BAS}/api/patients/${slug}/profile/${pid}`)
      .then(res => {
        if (cancelled) return;
        const p = res.data?.data || res.data?.patient || res.data;
        if (p) {
          setPatientForm({
            name: p.name || appt?.patientName || '',
            mobile: p.mobile || appt?.mobile || '',
            emMobile: p.emMobile || '',
            email: p.email || '',
            age: p.age ?? '',
            gender: p.gender || 'Male',
            bloodGroup: p.bloodGroup || '',
            weight: p.weight ?? '',
            height: p.height ?? '',
            bmi: p.bmi ?? '',
            referenceType: p.referenceType || 'Self',
            referenceName: p.referenceName || '',
            address: p.address || '',
            allergies: p.allergies || '',
          });
        }
      })
      .catch(() => {
        if (cancelled) return;
        const p = typeof appt?.patientId === 'object' ? appt.patientId : {};
        setPatientForm(f => ({
          ...f,
          name: p.name || appt?.patientName || '',
          mobile: p.mobile || appt?.mobile || '',
          emMobile: p.emMobile || '',
          email: p.email || '',
          age: p.age ?? '',
          gender: p.gender || 'Male',
          bloodGroup: p.bloodGroup || '',
          weight: p.weight ?? '',
          height: p.height ?? '',
          bmi: p.bmi ?? '',
          address: p.address || '',
          allergies: p.allergies || '',
        }));
      })
      .finally(() => { if (!cancelled) setPatientLoading(false); });

    return () => { cancelled = true; };
  }, [appt?.patientId, slug]);

  const handleSave = async (e) => {
    e.preventDefault();
    setSaveError('');
    setSaving(true);
    try {
      const apptPayload = {
        ...apptForm,
        patientName: patientForm.name,
        mobile: patientForm.mobile
      };
      const patientPayload = { ...patientForm };

      const requests = [
        axios.put(`${API_BAS}/api/appointments/${slug}/${appt._id}/edit`, apptPayload),
      ];

      if (patientId) {
        requests.push(
          axios.put(`${API_BAS}/api/patients/${slug}/update/${patientId}`, patientPayload)
        );
      }

      const [apptRes] = await Promise.all(requests);

      if (apptRes.data.success) {
        onSave({
          ...apptRes.data.data,
          patientId: { ...patientPayload, _id: patientId },
        });
      }
    } catch (e) {
      setSaveError('Save failed: ' + (e.response?.data?.message || e.message));
    }
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white w-full max-w-[1250px] shadow-2xl border border-slate-300 flex flex-col h-auto font-sans text-slate-900">
        
        {/* Header Segment Matching Layout */}
        <div className="flex bg-blue-600 text-white items-center px-6 py-4 justify-between">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-xs font-black uppercase tracking-widest text-slate-200">
              Edit Mode — Security Scope Profile
            </h2>
            <div className="text-[10px] font-bold opacity-60 uppercase tracking-wider">
              Record ID: {appt?._id || 'Master Object'}
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="text-[10px] font-bold opacity-70 flex items-center gap-2 tracking-wider">
              {patientLoading ? <Loader2 size={12} className="animate-spin" /> : '● READY'}
            </div>
            <button 
              onClick={onClose}
              type="button"
              className="text-slate-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Form Body - Exactly Mirroring 4 Column Form Matrix Grid */}
        <form onSubmit={handleSave} className="p-6 grid grid-cols-4 gap-x-6 gap-y-5">
          {patientLoading ? (
            <div className="col-span-4 py-20 flex flex-col items-center justify-center gap-3">
              <Loader2 size={32} className="animate-spin text-slate-500" />
              <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Fetching Remote Profile...</p>
            </div>
          ) : (
            <>
              {/* ROW 1: Identifiers */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">1. Mobile Number / WhatsApp</label>
                <input
                  required
                  type="text"
                  maxLength={10}
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-slate-900 text-slate-800 transition-colors"
                  value={patientForm.mobile}
                  onChange={(e) => handlePatientChange('mobile', e.target.value.replace(/\D/g, ''))}
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">2. Emergency Mobile</label>
                <input 
                  type="text"
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-slate-900 text-slate-800 transition-colors" 
                  value={patientForm.emMobile} 
                  onChange={(e) => handlePatientChange('emMobile', e.target.value)} 
                />
              </div>

              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">3. Full Name</label>
                <input
                  required
                  type="text"
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs font-semibold uppercase focus:outline-none focus:border-slate-900 text-slate-800 transition-colors"
                  value={patientForm.name}
                  onChange={(e) => handlePatientChange('name', e.target.value)}
                />
              </div>

              {/* ROW 2: Comms & Demographics */}
              <div className="col-span-2 space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">4. Email Address</label>
                <input 
                  type="email" 
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-slate-900 text-slate-800 transition-colors" 
                  value={patientForm.email} 
                  onChange={(e) => handlePatientChange('email', e.target.value)} 
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">5. Age</label>
                  <input 
                    required 
                    type="number" 
                    className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-slate-900 text-slate-800 transition-colors" 
                    value={patientForm.age} 
                    onChange={(e) => handlePatientChange('age', e.target.value)} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">6. Gender</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-300 px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-slate-900 text-slate-800 transition-colors" 
                    value={patientForm.gender} 
                    onChange={(e) => handlePatientChange('gender', e.target.value)}
                  >
                    <option>Male</option>
                    <option>Female</option>
                    <option>Other</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">7. Blood Group</label>
                <select
                  className="w-full bg-slate-50 border border-slate-300 px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-slate-900 text-slate-800 transition-colors"
                  value={patientForm.bloodGroup}
                  onChange={(e) => handlePatientChange('bloodGroup', e.target.value)}
                >
                  <option value="">— Select —</option>
                  <option value="A+">A+</option>
                  <option value="A-">A-</option>
                  <option value="B+">B+</option>
                  <option value="B-">B-</option>
                  <option value="AB+">AB+</option>
                  <option value="AB-">AB-</option>
                  <option value="O+">O+</option>
                  <option value="O-">O-</option>
                </select>
              </div>

              {/* ROW 3: Scheduling Rules & Metadata */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">8. Booking Date</label>
                <input 
                  type="date" 
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-slate-900 text-slate-800 transition-colors" 
                  value={apptForm.appointmentDate} 
                  onChange={(e) => handleApptChange('appointmentDate', e.target.value)} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">9. Visit Metric Type</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-300 px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-slate-900 text-slate-800 transition-colors" 
                  value={apptForm.visitType} 
                  onChange={(e) => handleApptChange('visitType', e.target.value)}
                >
                  <option>New Patient</option>
                  <option>Revisit Patient</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">10. Lifecycle Status</label>
                <select 
                  className="w-full bg-slate-50 border border-slate-300 px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-slate-900 text-slate-800 transition-colors" 
                  value={apptForm.status} 
                  onChange={(e) => handleApptChange('status', e.target.value)}
                >
                  <option>Waiting</option>
                  <option>In-Consultation</option>
                  <option>Completed</option>
                  <option>Cancelled</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">11. Ref Type</label>
                  <select 
                    className="w-full bg-slate-50 border border-slate-300 px-1 py-1.5 text-xs font-semibold focus:outline-none focus:border-slate-900 text-slate-800 transition-colors" 
                    value={patientForm.referenceType} 
                    onChange={(e) => handlePatientChange('referenceType', e.target.value)}
                  >
                    <option>Self</option>
                    <option>Doctor</option>
                    <option>Friend</option>
                    <option>Family</option>
                    <option>Other</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">12. Name</label>
                  <input 
                    type="text" 
                    className="w-full bg-slate-50 border border-slate-300 px-2 py-1.5 text-xs font-semibold focus:outline-none focus:border-slate-900 text-slate-800 transition-colors" 
                    value={patientForm.referenceName} 
                    onChange={(e) => handlePatientChange('referenceName', e.target.value)} 
                  />
                </div>
              </div>

              {/* ROW 4: Diagnostics Metrics */}
              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">13. Weight (kg)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-slate-900 text-slate-800 transition-colors" 
                  value={patientForm.weight} 
                  onChange={(e) => handlePatientChange('weight', e.target.value)} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">14. Height (cm)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-slate-900 text-slate-800 transition-colors" 
                  value={patientForm.height} 
                  onChange={(e) => handlePatientChange('height', e.target.value)} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">15. Calculated BMI</label>
                <input 
                  readOnly 
                  type="text" 
                  className="w-full bg-slate-100 border border-slate-300 px-3 py-1.5 text-xs font-black text-slate-600 focus:outline-none" 
                  value={patientForm.bmi} 
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">16. Safety Alerts/Allergies</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs font-semibold text-red-700 focus:outline-none focus:border-slate-900 transition-colors" 
                  value={patientForm.allergies} 
                  onChange={(e) => handlePatientChange('allergies', e.target.value)} 
                />
              </div>

              {/* ROW 5: Full-Width Location Sub-field */}
              <div className="col-span-4 space-y-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">17. Business / Physical Mailing Address</label>
                <input 
                  type="text" 
                  className="w-full bg-slate-50 border border-slate-300 px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-slate-900 text-slate-800 transition-colors" 
                  value={patientForm.address} 
                  onChange={(e) => handlePatientChange('address', e.target.value)} 
                />
              </div>
            </>
          )}

          {/* Inline Action Blocks Footer */}
          {saveError && (
            <div className="col-span-4 flex items-center gap-2 bg-red-50 border border-red-200 px-4 py-2 text-red-800">
              <AlertTriangle size={14} className="text-red-600 flex-shrink-0" />
              <p className="text-[11px] font-bold uppercase tracking-wider">{saveError}</p>
            </div>
          )}

          <div className="col-span-4 flex justify-end gap-3 pt-2 border-t border-slate-200 mt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2 border border-slate-300 text-slate-600 font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || patientLoading}
              className="bg-slate-900 text-white px-7 py-2 font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 size={12} className="animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save size={12} />
                  Commit Changes
                </>
              )}
            </button>
          </div>
        </form>

      </div>
    </div>
  );
}

// ─── DELETE MODAL ─────────────────────────────────────────────────────────────
function DeleteModal({ appt, onClose, onDeleted }) {
  const { slug } = useParams();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await axios.delete(`${API_BAS}/api/appointments/${slug}/${appt._id}/delete`);
      if (res.data.success) { clearCache(); onDeleted(appt._id); }
    } catch (e) { alert('Delete failed: ' + (e.response?.data?.message || e.message)); }
    setDeleting(false);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-sm rounded-[32px] shadow-2xl border border-slate-100 overflow-hidden">
        <div className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mx-auto mb-5">
            <Trash2 size={24} className="text-red-500" />
          </div>
          <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter mb-2">Delete Appointment</h2>
          <p className="text-sm text-slate-500 font-medium leading-relaxed">
            This will permanently remove the appointment for{' '}
            <span className="font-black text-slate-800">{appt?.patientName}</span> and all linked prescriptions.
          </p>
        </div>
        <div className="px-8 pb-8 flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-4 rounded-[20px] border-2 border-slate-200 font-black text-[11px] uppercase tracking-widest text-slate-500 hover:bg-slate-50 transition-all">
            Cancel
          </button>
          <button onClick={handleDelete} disabled={deleting}
            className="flex-1 bg-red-500 text-white py-4 rounded-[20px] font-black text-[11px] uppercase tracking-[2px] active:scale-95 transition-all disabled:opacity-60">
            {deleting ? 'Deleting...' : 'Yes, Delete'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── MAIN COMPONENT ───────────────────────────────────────────────────────────
const AppointmentTable = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [paymentFilter, setPaymentFilter] = useState('All');
  const [datePreset, setDatePreset] = useState('all');
  const [customStart, setCustomStart] = useState(today);
  const [customEnd, setCustomEnd] = useState(today);
  const [showFilters, setShowFilters] = useState(false);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const LIMIT = 25;

  const abortRef = useRef(null);

  const fetchAppointments = useCallback(async (pageNum = 1, force = false) => {
    const cacheKey = `appt-table-${slug}-p${pageNum}`;
    const cached = getCache(cacheKey);
    if (cached && !force) {
      setAppointments(cached.data);
      setTotalPages(cached.totalPages);
      setTotal(cached.total);
      setLoading(false);
      return;
    }
    setLoading(true);
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    try {
      const res = await axios.get(`${API_BAS}/api/appointments/${slug}/all`, {
        params: { page: pageNum, limit: LIMIT },
        signal: abortRef.current.signal,
        timeout: 10000,
      });
      if (res.data.success) {
        const payload = {
          data: res.data.data,
          totalPages: res.data.pagination.totalPages,
          total: res.data.pagination.total,
        };
        setCache(cacheKey, payload);
        setAppointments(res.data.data);
        setTotalPages(res.data.pagination.totalPages);
        setTotal(res.data.pagination.total);
      }
    } catch (err) {
      if (axios.isCancel(err) || err.code === 'ERR_CANCELED') return;
      console.error('Appointment fetch error:', err);
    } finally { setLoading(false); }
  }, [slug]);

  useEffect(() => {
    fetchAppointments(page);
    return () => { if (abortRef.current) abortRef.current.abort(); };
  }, [page, slug]);

  const activeDateRange = useMemo(() => {
    if (datePreset === 'today') return { start: today, end: today };
    if (datePreset === 'yesterday') {
      const d = new Date(); d.setDate(d.getDate() - 1);
      const y = toLocalISO(d); return { start: y, end: y };
    }
    if (datePreset === 'this_month') return getMonthRange(0);
    if (datePreset === 'last_month') return getMonthRange(-1);
    if (datePreset === 'custom') return { start: customStart, end: customEnd };
    return { start: null, end: null };
  }, [datePreset, customStart, customEnd]);

  const filtered = useMemo(() => {
    return appointments.filter(appt => {
      if (searchText.trim()) {
        const q = searchText.trim().toLowerCase();
        if (!appt.patientName?.toLowerCase().includes(q) && !appt.mobile?.includes(q)) return false;
      }
      if (statusFilter !== 'All' && appt.status !== statusFilter) return false;
      if (paymentFilter !== 'All' && appt.billing?.paymentStatus !== paymentFilter) return false;
      if (activeDateRange.start && activeDateRange.end) {
        const d = toLocalISO(new Date(appt.appointmentDate));
        if (d < activeDateRange.start || d > activeDateRange.end) return false;
      }
      return true;
    });
  }, [appointments, searchText, statusFilter, paymentFilter, activeDateRange]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (searchText.trim()) n++;
    if (statusFilter !== 'All') n++;
    if (paymentFilter !== 'All') n++;
    if (datePreset !== 'all') n++;
    return n;
  }, [searchText, statusFilter, paymentFilter, datePreset]);

  const resetFilters = () => {
    setSearchText(''); setStatusFilter('All'); setPaymentFilter('All');
    setDatePreset('all'); setCustomStart(today); setCustomEnd(today);
  };

  const stats = useMemo(() => ({
    total: filtered.length,
    waiting: filtered.filter(a => a.status === 'Waiting').length,
    active: filtered.filter(a => a.status === 'In-Consultation').length,
    done: filtered.filter(a => a.status === 'Completed').length,
    revenue: filtered.reduce((s, a) => s + (Number(a.billing?.paidAmount) || 0), 0),
  }), [filtered]);

  const closeModal = () => setModal(null);

  const handlePaymentSave = (updated) => {
    setAppointments(prev => prev.map(a =>
      a._id === updated._id ? { ...a, billing: updated.billing } : a
    ));
    closeModal();
  };
  const handleEditSave = (updated) => {
    setAppointments(prev => prev.map(a => a._id === updated._id ? { ...a, ...updated } : a));
    closeModal();
  };
  const handleDeleted = (id) => {
    setAppointments(prev => prev.filter(a => a._id !== id));
    setTotal(t => t - 1);
    closeModal();
  };

  const hl = (text, q) => {
    if (!q || !text) return text;
    return String(text).split(new RegExp(`(${q})`, 'gi')).map((part, i) =>
      part.toLowerCase() === q.toLowerCase()
        ? <mark key={i} className="bg-yellow-200 text-yellow-800 rounded px-0.5">{part}</mark>
        : part
    );
  };

  const q = searchText.trim().toLowerCase();

  return (
    <div className="min-h-screen bg-[#f8fafc]  font-sans text-slate-900">

      {/* ── HEADER ─────────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <button onClick={() => navigate(-1)}
              className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-400 transition-colors">
              <ArrowLeft size={14} />
            </button>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[3px]">Appointment Records</span>
          </div>
          <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-800 flex items-center gap-3">
            All Appointments <History className="text-[#18afb1]" size={24} />
          </h1>
          <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider mt-1">{total} total records</p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => { clearCache(); fetchAppointments(page, true); }}
            disabled={loading}
            className="p-3 rounded-xl border border-slate-200 text-slate-400 hover:text-[#18afb1] hover:border-[#18afb1] transition-all disabled:opacity-40"
            title="Refresh">
            <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
          </button>
          <Link
            to={`/${slug}/dashboard/appointment/new`}
            className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl hover:shadow-slate-200 transition-all active:scale-95 flex items-center gap-2">
            <Plus size={16} />
            <span className="hidden sm:inline">New Appointment</span>
            <span className="sm:hidden">New</span>
          </Link>
        </div>
      </div>

      {/* ── STATS STRIP ────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {[
          { label: 'Showing', val: stats.total, color: 'text-slate-600', bg: 'bg-white' },
          { label: 'Waiting', val: stats.waiting, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Active', val: stats.active, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Completed', val: stats.done, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Revenue', val: `₹${stats.revenue.toLocaleString('en-IN')}`, color: 'text-[#18afb1]', bg: 'bg-[#18afb1]/5' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-2xl p-4 border border-slate-100`}>
            <p className={`text-xl font-black leading-none ${s.color}`}>{s.val}</p>
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── FILTER BAR ─────────────────────────────────────────────────────── */}
      <div className="mb-6 space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
          <div className="relative flex-1 max-w-sm">
            <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text" value={searchText} onChange={e => setSearchText(e.target.value)}
              placeholder="Search name or mobile…"
              className="w-full pl-10 pr-4 py-3 bg-white border-2 border-slate-200 rounded-2xl text-[13px] font-semibold text-slate-700 placeholder-slate-300 outline-none focus:border-[#18afb1] transition-all" />
            {searchText && (
              <button onClick={() => setSearchText('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                <X size={14} />
              </button>
            )}
          </div>

          <button onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 px-5 py-3 rounded-2xl border-2 font-black text-[11px] uppercase tracking-widest transition-all
              ${showFilters ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-600 border-slate-200 hover:border-slate-400'}`}>
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
            <button onClick={resetFilters}
              className="flex items-center gap-1.5 px-4 py-3 rounded-2xl border-2 border-red-100 text-red-400 bg-red-50 font-black text-[10px] uppercase tracking-widest hover:bg-red-500 hover:text-white hover:border-red-500 transition-all">
              <X size={12} /> Reset
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide sm:flex-wrap">
          {STATUS_OPTIONS.map(status => {
            const colors = statusTabColors[status];
            const isActive = statusFilter === status;
            const count = status === 'All'
              ? appointments.length
              : appointments.filter(a => a.status === status).length;
            return (
              <button key={status} onClick={() => setStatusFilter(status)}
                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider border-2 transition-all
                  ${isActive ? `${colors.active} border-transparent shadow-md` : `${colors.inactive} border-transparent`}`}>
                {status}
                <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${isActive ? 'bg-white/25' : 'bg-slate-100 text-slate-500'}`}>
                  {count}
                </span>
              </button>
            );
          })}

          <div className="ml-2 pl-2 border-l border-slate-200 flex items-center gap-2 flex-shrink-0">
            {PAYMENT_OPTIONS.map(p => {
              const isActive = paymentFilter === p;
              const colors = {
                All: isActive ? 'bg-slate-700 text-white' : 'bg-white text-slate-500 hover:bg-slate-100',
                Paid: isActive ? 'bg-emerald-500 text-white' : 'bg-white text-emerald-600 hover:bg-emerald-50',
                Partial: isActive ? 'bg-amber-500 text-white' : 'bg-white text-amber-600 hover:bg-amber-50',
                Unpaid: isActive ? 'bg-red-500 text-white' : 'bg-white text-red-500 hover:bg-red-50',
              }[p];
              return (
                <button key={p} onClick={() => setPaymentFilter(p)}
                  className={`px-3 py-1.5 rounded-xl font-black text-[9px] uppercase tracking-wider border-2 border-transparent transition-all ${colors}`}>
                  {p === 'All' ? '₹ All' : p}
                </button>
              );
            })}
          </div>
        </div>

        {showFilters && (
          <div className="bg-white border-2 border-slate-100 rounded-3xl p-6 space-y-5 shadow-sm">
            <div className="flex items-center gap-2">
              <CalendarDays size={15} className="text-[#18afb1]" />
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Date Filter</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {DATE_PRESET_OPTIONS.map(opt => (
                <button key={opt.value} onClick={() => setDatePreset(opt.value)}
                  className={`px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-wider border-2 transition-all
                    ${datePreset === opt.value
                      ? 'bg-[#18afb1] text-white border-[#18afb1] shadow-md shadow-[#18afb1]/20'
                      : 'bg-slate-50 text-slate-500 border-slate-100 hover:border-[#18afb1] hover:text-[#18afb1]'}`}>
                  {opt.label}
                </button>
              ))}
            </div>
            {datePreset === 'custom' && (
              <div className="flex flex-col sm:flex-row gap-4 pt-1">
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">From</label>
                  <input type="date" value={customStart} max={customEnd} onChange={e => setCustomStart(e.target.value)} className="professional-input" />
                </div>
                <div className="flex-1 space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">To</label>
                  <input type="date" value={customEnd} min={customStart} onChange={e => setCustomEnd(e.target.value)} className="professional-input" />
                </div>
              </div>
            )}
            {activeDateRange.start && (
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 uppercase bg-slate-50 px-4 py-2 rounded-xl w-fit">
                <CalendarDays size={11} />
                {activeDateRange.start === activeDateRange.end
                  ? activeDateRange.start
                  : `${activeDateRange.start} → ${activeDateRange.end}`}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── TABLE ──────────────────────────────────────────────────────────── */}
{/* Controlled container with no forced minimum width restrictions */}
<div className="w-full max-w-[1300px] mx-auto bg-white border border-slate-200/80 rounded-xl overflow-hidden shadow-sm">
  <div className="w-full overflow-x-hidden"> {/* Hard stop on horizontal scroll leakage */}
    
    {/* table-auto dynamically matches column widths to data without stretching or clipping */}
    <table className="w-full text-left border-collapse table-auto">
      <thead>
        <tr className="bg-slate-50 border-b border-slate-200/60">
          {['S.No', 'Patient Details', 'Booking Date', 'Status', 'Payment Status', 'Actions'].map((h) => (
            <th 
              key={h} 
              className="px-4 py-2.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider whitespace-nowrap"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      
      <tbody className="divide-y divide-slate-100">
        {/* Loading Skeleton Matrix */}
        {loading && appointments.length === 0 && (
          [...Array(5)].map((_, i) => (
            <tr key={i} className="animate-pulse bg-white">
              <td className="px-4 py-2.5"><div className="w-5 h-5 bg-slate-100 rounded" /></td>
              <td className="px-4 py-2.5">
                <div className="h-3.5 bg-slate-100 rounded w-32 mb-1" />
                <div className="h-2.5 bg-slate-50 rounded w-16" />
              </td>
              <td className="px-4 py-2.5"><div className="h-3 bg-slate-100 rounded w-20" /></td>
              <td className="px-4 py-2.5"><div className="h-4 bg-slate-100 rounded-full w-20" /></td>
              <td className="px-4 py-2.5"><div className="h-4 bg-slate-100 rounded-full w-20" /></td>
              <td className="px-4 py-2.5"><div className="h-6 bg-slate-100 rounded w-24" /></td>
            </tr>
          ))
        )}

        {/* Empty State Vector UI */}
        {!loading && filtered.length === 0 && (
          <tr>
            <td colSpan={6} className="py-12 text-center">
              <div className="flex flex-col items-center justify-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-slate-50 flex items-center justify-center border border-slate-100">
                  <Search size={18} className="text-slate-400" />
                </div>
                <div className="space-y-0.5">
                  <p className="text-xs font-semibold text-slate-700">
                    {appointments.length > 0 ? 'No records match filters' : 'No appointments found'}
                  </p>
                </div>
                {appointments.length > 0 && (
                  <button 
                    onClick={resetFilters} 
                    className="mt-1 px-3 py-1 text-[11px] font-medium text-cyan-600 bg-cyan-50 border border-cyan-200/50 rounded-md"
                  >
                    Clear Active Filters
                  </button>
                )}
              </div>
            </td>
          </tr>
        )}

        {/* Live Active Rows */}
        {!loading && filtered.map((appt, i) => {
          const sc = statusConfig[appt.status] || statusConfig['Waiting'];
          const pc = paymentConfig[appt.billing?.paymentStatus] || paymentConfig['Unpaid'];
          const hasPrevDue = (appt.billing?.previousDue > 0) && (appt.billing?.paymentStatus !== 'Paid');

          return (
            <tr key={appt._id} className="group hover:bg-slate-50/40 transition-colors">
              {/* S.No Column */}
              <td className="px-4 py-2 text-xs font-medium text-slate-400 w-12">
                {((page - 1) * LIMIT) + i + 1}
              </td>

              {/* Patient Profile Summary */}
              <td className="px-4 py-2">
                <div className="flex flex-col gap-0.5">
                  <p className="font-semibold text-slate-800 text-[13px] tracking-tight group-hover:text-slate-900 leading-tight">
                    {q ? hl(appt.patientName, q) : appt.patientName}
                  </p>
                  <div>
                    <span className={`inline-flex items-center text-[10px] font-medium px-1.5 py-0.5 rounded border whitespace-nowrap
                      ${appt.visitType === 'Revisit Patient' 
                        ? 'text-blue-600 bg-blue-50/50 border-blue-100' 
                        : 'text-emerald-600 bg-emerald-50/50 border-emerald-100'}`}>
                      {appt.visitType}
                    </span>
                  </div>
                </div>
              </td>

              {/* Secure Date Node */}
              <td className="px-4 py-2 whitespace-nowrap text-[12px] font-medium text-slate-600">
                {appt.appointmentDate
                  ? new Date(appt.appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                  : '—'}
              </td>

              {/* Dynamic Status Badge */}
              <td className="px-4 py-2 whitespace-nowrap">
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${sc.bar || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                  <div className={`w-1.5 h-1.5 rounded-full ${sc.dot || 'bg-slate-400'} ${sc.pulse ? 'animate-pulse' : ''}`} />
                  {appt.status}
                </span>
              </td>

              {/* Ledger / Billing Data Matrix */}
              <td className="px-4 py-2 whitespace-nowrap">
                <div className="flex flex-col gap-0.5 items-start">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-semibold border ${pc || 'bg-slate-50 text-slate-600 border-slate-200'}`}>
                    {appt.billing?.paymentStatus || 'Unpaid'}
                  </span>
                  {hasPrevDue && (
                    <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-amber-600 bg-amber-50 border border-amber-100 px-1 py-0.5 rounded">
                      Due ₹{appt.billing.previousDue}
                    </span>
                  )}
                </div>
              </td>

              {/* Action Toolbar Grid */}
              <td className="px-4 py-2 whitespace-nowrap w-36">
                <div className="flex items-center gap-0.5">
                  <button 
                    onClick={() => setModal({ type: 'view', appt })} 
                    className="p-1 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded transition-all"
                  >
                    <Eye size={14} />
                  </button>
                  <button 
                    onClick={() => setModal({ type: 'edit', appt })} 
                    className="p-1 text-blue-500 hover:text-blue-700 hover:bg-blue-50 rounded transition-all"
                  >
                    <Edit3 size={14} />
                  </button>
                  <button 
                    onClick={() => setModal({ type: 'payment', appt })} 
                    className="p-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded transition-all"
                  >
                    <IndianRupee size={14} />
                  </button>
                  <button 
                    onClick={() => setModal({ type: 'delete', appt })} 
                    className="p-1 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>

  {/* Table Footer Frame */}
  {!loading && filtered.length > 0 && (
    <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50/50 flex items-center justify-between">
      <span className="text-[11px] font-medium text-slate-500">
        Showing <span className="font-semibold text-slate-700">{filtered.length}</span> of <span className="font-semibold text-slate-700">{appointments.length}</span> entries
      </span>
      {filtered.length !== appointments.length && (
        <button 
          onClick={resetFilters} 
          className="text-[11px] font-semibold text-cyan-600 hover:text-cyan-700 hover:underline"
        >
          Reset View
        </button>
      )}
    </div>
  )}
</div>

      {/* ── PAGINATION ─────────────────────────────────────────────────────── */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="p-3 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-400 transition-all disabled:opacity-30">
            <ChevronLeft size={16} />
          </button>

          {Array.from({ length: Math.min(totalPages, 7) }, (_, idx) => {
            let pg;
            if (totalPages <= 7) {
              pg = idx + 1;
            } else if (idx === 0) {
              pg = 1;
            } else if (idx === 6) {
              pg = totalPages;
            } else {
              pg = Math.min(Math.max(page - 2 + idx, 2), totalPages - 1);
            }
            return (
              <button key={pg} onClick={() => setPage(pg)}
                className={`w-9 h-9 rounded-xl font-black text-[11px] transition-all
                  ${page === pg ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-100'}`}>
                {pg}
              </button>
            );
          })}

          <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
            className="p-3 rounded-xl border border-slate-200 text-slate-400 hover:text-slate-700 hover:border-slate-400 transition-all disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
      )}

      {/* ── MODALS ─────────────────────────────────────────────────────────── */}
      {modal?.type === 'view'    && <ViewModal    appt={modal.appt} onClose={closeModal} />}
      {modal?.type === 'edit'    && <EditModal    appt={modal.appt} onClose={closeModal} onSave={handleEditSave} />}
      {modal?.type === 'payment' && <PaymentModal appt={modal.appt} onClose={closeModal} onSave={handlePaymentSave} />}
      {modal?.type === 'delete'  && <DeleteModal  appt={modal.appt} onClose={closeModal} onDeleted={handleDeleted} />}

      <style>{`
        .professional-input {
          width: 100%; background: #f8fafc; border: 2px solid #f1f5f9; border-radius: 16px;
          padding: 12px 18px; font-size: 13px; font-weight: 700; color: #1e293b;
          outline: none; transition: 0.25s; box-sizing: border-box;
        }
        .professional-input:focus {
          border-color: #18afb1; background: #fff;
          box-shadow: 0 8px 24px -8px rgba(24,175,177,0.18);
        }
        .icon-action-btn {
          display: inline-flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 8px;
          border: 1px solid; transition: all 0.18s ease;
          flex-shrink: 0; cursor: pointer; background: transparent;
        }
        .icon-action-btn:disabled { opacity: 0.5; cursor: not-allowed; }
        @keyframes loading {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(350%);  }
        }
        mark { background: #fef08a; color: #854d0e; border-radius: 3px; padding: 0 2px; }
      `}</style>
    </div>
  );
};

export default AppointmentTable;