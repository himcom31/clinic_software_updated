import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import {
  Save, Building2, User, Phone, MapPin, Award, Loader2,
  Camera, Stethoscope, Hash, Globe, Mail, Clock,
  Calendar, PenTool, CheckCircle2, AlertCircle, BadgeCheck,
  IndianRupee, RefreshCw, Plus, Trash2, UserPlus, GripVertical
} from 'lucide-react';
const BASE_URL = import.meta.env.VITE_API_URL;




// ── Default blank doctor entry ────────────────────────────────────────────────
const blankDoctor = () => ({ doctorName: '', degree: '', specialization: '' });

const ClinicDetailsForm = () => {
  const { slug } = useParams();
  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess]   = useState(false);

  const [logoPreview, setLogoPreview] = useState(null);
  const [sigPreview, setSigPreview]   = useState(null);
  const [logoFile, setLogoFile]       = useState(null);
  const [sigFile, setSigFile]         = useState(null);

  // ── Multi-doctor list ─────────────────────────────────────────────────────
  const [doctors, setDoctors] = useState([blankDoctor()]);

  const [formData, setFormData] = useState({
    doctorId: '',
    clinicName: '',
    regNumber: '',
    mobile: '',
    email: '',
    website: '',
    address: '',
    themeColor: '#2563eb',
    openAt: '',
    closeAt: '',
    weeklyOff: 'No Weekly Off',
    branchName: 'Main Branch',
    isMainBranch: true,
    consultationFee: '',
    appointmentValidity: ''
  });

  // ── Load existing profile ─────────────────────────────────────────────────
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('doctorInfo'));
    const dId  = user?.id || user?._id;

    const fetchProfile = async () => {
      setFetching(true);
      try {
        const res = await axios.get(`${BASE_URL}/api/clinic/${slug}/clinicData`);
        if (res.data.success && res.data.data) {
          const p = res.data.data;

          setFormData({
            doctorId:            dId || p.doctorId || '',
            clinicName:          p.clinicName || '',
            regNumber:           p.regNumber || '',
            mobile:              p.mobile || '',
            email:               p.email || '',
            website:             p.website || '',
            address:             p.address || '',
            themeColor:          p.themeColor || '#2563eb',
            openAt:              p.timing?.openAt || '',
            closeAt:             p.timing?.closeAt || '',
            weeklyOff:           p.timing?.weeklyOff || 'No Weekly Off',
            branchName:          p.branchName || 'Main Branch',
            isMainBranch:        p.isMainBranch ?? true,
            consultationFee:     p.consultationFee ?? '',
            appointmentValidity: p.appointmentValidity ?? ''
          });

          // Populate doctors list
          if (p.doctors && p.doctors.length > 0) {
            setDoctors(p.doctors.map(d => ({
              doctorName:     d.doctorName || '',
              degree:         d.degree || '',
              specialization: d.specialization || ''
            })));
          }

          if (p.logo)      setLogoPreview(`${BASE_URL}${p.logo}`);
          if (p.signature) setSigPreview(`${BASE_URL}${p.signature}`);
        } else {
          if (dId) setFormData(prev => ({ ...prev, doctorId: dId }));
        }
      } catch {
        if (dId) setFormData(prev => ({ ...prev, doctorId: dId }));
      } finally {
        setFetching(false);
      }
    };

    fetchProfile();
  }, [slug]);

  // ── Doctor list helpers ───────────────────────────────────────────────────
  const addDoctor = () => setDoctors(prev => [...prev, blankDoctor()]);

  const removeDoctor = (index) => {
    if (doctors.length === 1) return; // keep at least one
    setDoctors(prev => prev.filter((_, i) => i !== index));
  };

  const updateDoctor = (index, field, value) => {
    setDoctors(prev => prev.map((d, i) => i === index ? { ...d, [field]: value } : d));
  };

  // ── Image helpers ─────────────────────────────────────────────────────────
  const clearLogo = (e) => { e.stopPropagation(); setLogoPreview(null); setLogoFile(null); };
  const clearSig  = (e) => { e.stopPropagation(); setSigPreview(null);  setSigFile(null); };

  const handleFileChange = (setter, previewSetter) => (e) => {
    const file = e.target.files[0];
    if (file) { setter(file); previewSetter(URL.createObjectURL(file)); }
  };

  // ── Save ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    // Quick validation
    const hasEmptyName = doctors.some(d => !d.doctorName.trim());
    if (hasEmptyName) {
      alert("Each doctor entry must have a name.");
      return;
    }

    setLoading(true);
    const data = new FormData();

    Object.keys(formData).forEach(key => data.append(key, formData[key]));

    // Send doctors array as JSON string (FormData only supports string/blob)
    data.append('doctors', JSON.stringify(doctors));

    if (logoFile) data.append('logo', logoFile);
    if (sigFile)  data.append('signature', sigFile);

    try {
      const res = await axios.post(`${BASE_URL}/api/clinic/${slug}/update`, data);
      if (res.data.success) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
      }
    } catch (err) {
      alert("Update Failed: " + (err.response?.data?.message || "Server Error"));
    } finally {
      setLoading(false);
    }
  };

  // ── Styles ────────────────────────────────────────────────────────────────
  const inputStyle      = "w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 pl-11 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm font-semibold text-slate-700 placeholder:text-slate-400 shadow-sm";
  const inputStyleNoIcon = "w-full bg-white border border-slate-200 rounded-xl py-2.5 px-4 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-all text-sm font-semibold text-slate-700 placeholder:text-slate-400 shadow-sm";
  const labelStyle      = "text-[11px] font-extrabold text-slate-500 uppercase tracking-wider mb-1.5 block ml-1";
  const sectionTitle    = "text-sm font-black text-slate-800 uppercase tracking-tight flex items-center gap-2 mb-5";

  // ── Skeleton ──────────────────────────────────────────────────────────────
  if (fetching) {
    return (
      <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="h-14 w-14 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200 animate-pulse">
            <Building2 className="text-white" size={26} />
          </div>
          <div className="flex items-center gap-2 text-slate-500 text-sm font-bold uppercase tracking-widest">
            <RefreshCw className="animate-spin" size={16} />
            Loading Clinic Profile...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 custom-scrollbar">

      {/* HEADER */}
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 bg-blue-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-200">
            <Building2 className="text-white" size={24} />
          </div>
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">Clinic Identity</h1>
            <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">General Settings & Branding</p>
          </div>
        </div>
        <button
          onClick={handleSave}
          disabled={loading}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-xl shadow-blue-100 flex items-center justify-center gap-3 active:scale-95 transition-all disabled:opacity-70"
        >
          {loading ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
          SAVE CONFIGURATION
        </button>
      </div>

      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

        {/* LEFT COLUMN */}
        <div className="lg:col-span-8 space-y-8">

          {/* ── CLINIC NAME & REG ────────────────────────────────────────── */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 left-0 w-1 h-full bg-blue-600"></div>
            <h2 className={sectionTitle}><Building2 className="text-blue-600" size={18} /> Clinic Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="relative md:col-span-2">
                <label className={labelStyle}>Full Clinic Name</label>
                <Building2 className="absolute left-4 top-[38px] text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="e.g. City Health Center"
                  className={inputStyle}
                  value={formData.clinicName}
                  onChange={e => setFormData({ ...formData, clinicName: e.target.value })}
                />
              </div>

              <div className="relative">
                <label className={labelStyle}>Consultation Fee</label>
                <IndianRupee className="absolute left-4 top-[38px] text-slate-400" size={16} />
                <input
                  type="number"
                  placeholder="100 to ..."
                  className={inputStyle}
                  value={formData.consultationFee}
                  onChange={e => setFormData({ ...formData, consultationFee: e.target.value })}
                />
              </div>

              <div className="relative">
                <label className={labelStyle}>Appointment Validity (Days)</label>
                <BadgeCheck className="absolute left-4 top-[38px] text-slate-400" size={16} />
                <input
                  type="number"
                  placeholder="e.g. 7"
                  className={inputStyle}
                  value={formData.appointmentValidity}
                  onChange={e => setFormData({ ...formData, appointmentValidity: e.target.value })}
                />
              </div>

              <div className="relative md:col-span-2">
                <label className={labelStyle}>Registration / License Number</label>
                <Hash className="absolute left-4 top-[38px] text-slate-400" size={16} />
                <input
                  type="text"
                  placeholder="State Medical Council Reg No."
                  className={inputStyle}
                  value={formData.regNumber}
                  onChange={e => setFormData({ ...formData, regNumber: e.target.value })}
                />
              </div>
            </div>
          </div>

          

          {/* ── CONTACT & TIMING ──────────────────────────────────────────── */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Contact Card */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5">
              <h2 className={sectionTitle}><Phone className="text-blue-600" size={18} /> Contact Matrix</h2>
              <div className="relative">
                <Mail className="absolute left-4 top-3 text-slate-400" size={16} />
                <input type="email" placeholder="Official Email" className={inputStyle} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div className="relative">
                <Globe className="absolute left-4 top-3 text-slate-400" size={16} />
                <input type="text" placeholder="Clinic Website" className={inputStyle} value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} />
              </div>
              <div className="relative">
                <MapPin className="absolute left-4 top-3 text-slate-400" size={16} />
                <input type="text" placeholder="Clinic Address" className={inputStyle} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
              </div>
              <div className="relative">
                <Phone className="absolute left-4 top-3 text-slate-400" size={16} />
                <input type="text" placeholder="Mobile Number" className={inputStyle} value={formData.mobile} onChange={e => setFormData({ ...formData, mobile: e.target.value })} />
              </div>
            </div>

            {/* Timing Card */}
            <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm space-y-5 relative overflow-hidden">
              <div className="flex items-center justify-between mb-2">
                <h2 className={sectionTitle}><Clock className="text-blue-600" size={18} /> Service Hours</h2>
                {(formData.openAt || formData.closeAt) && (
                  <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 rounded-full border border-blue-100 animate-in fade-in zoom-in duration-300">
                    <div className="w-1.5 h-1.5 bg-blue-600 rounded-full animate-pulse" />
                    <span className="text-[10px] font-black text-blue-700 uppercase tracking-tight">
                      {formData.openAt} — {formData.closeAt}
                    </span>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1 group/item">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase ml-1 group-focus-within/item:text-blue-600 transition-colors">Opening Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/item:text-blue-500 transition-colors" size={14} />
                    <input type="time" className={inputStyle + " pl-11 hover:border-blue-300 cursor-pointer"} value={formData.openAt} onChange={e => setFormData({ ...formData, openAt: e.target.value })} />
                  </div>
                </div>
                <div className="space-y-1 group/item">
                  <label className="text-[10px] font-extrabold text-slate-400 uppercase ml-1 group-focus-within/item:text-blue-600 transition-colors">Closing Time</label>
                  <div className="relative">
                    <Clock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/item:text-blue-500 transition-colors" size={14} />
                    <input type="time" className={inputStyle + " pl-11 hover:border-blue-300 cursor-pointer"} value={formData.closeAt} onChange={e => setFormData({ ...formData, closeAt: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="relative pt-2">
                <label className={labelStyle}>Weekly Day-Off</label>
                <Calendar className="absolute left-4 top-10 text-slate-400" size={16} />
                <select
                  className={inputStyle + " cursor-pointer hover:border-blue-300"}
                  value={formData.weeklyOff}
                  onChange={e => setFormData({ ...formData, weeklyOff: e.target.value })}
                >
                  <option>No Weekly Off</option>
                  <option>Sunday</option>
                  <option>Saturday</option>
                  <option>Friday</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: BRANDING */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm">
            <h2 className={sectionTitle}><Camera className="text-blue-600" size={18} /> Visual Assets</h2>

            <div className="space-y-6">
              {/* Logo Upload */}
              <div className="group">
                <label className={labelStyle}>Institutional Logo</label>
                <div className="relative w-full h-44 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center overflow-hidden">
                  {logoPreview ? (
                    <>
                      <img src={logoPreview} alt="Clinic Logo" className="h-full w-full object-contain p-4 transition-transform group-hover:scale-105" />
                      <button onClick={clearLogo} className="absolute top-2 right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow transition-all" title="Remove Logo">✕</button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-3 bg-white rounded-full shadow-sm"><Camera className="text-slate-400" size={24} /></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Upload Logo</span>
                    </div>
                  )}
                  {!logoPreview && (
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange(setLogoFile, setLogoPreview)} />
                  )}
                </div>
                {logoPreview && (
                  <label className="mt-2 flex items-center gap-2 cursor-pointer text-[11px] font-bold text-blue-600 hover:underline">
                    <Camera size={13} /> Change Logo
                    <input type="file" className="hidden" onChange={handleFileChange(setLogoFile, setLogoPreview)} />
                  </label>
                )}
              </div>

              {/* Signature Upload */}
              <div className="group">
                <label className={labelStyle}>Doctor's Digital Signature</label>
                <div className="relative w-full h-32 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200 hover:border-blue-400 hover:bg-blue-50/30 transition-all flex flex-col items-center justify-center overflow-hidden">
                  {sigPreview ? (
                    <>
                      <img src={sigPreview} alt="Signature" className="h-full w-full object-contain p-2" />
                      <button onClick={clearSig} className="absolute top-2 right-2 z-10 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs font-black shadow transition-all" title="Remove Signature">✕</button>
                    </>
                  ) : (
                    <div className="flex flex-col items-center gap-2">
                      <div className="p-2 bg-white rounded-full shadow-sm"><PenTool className="text-slate-400" size={20} /></div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Add Signature</span>
                    </div>
                  )}
                  {!sigPreview && (
                    <input type="file" className="absolute inset-0 opacity-0 cursor-pointer" onChange={handleFileChange(setSigFile, setSigPreview)} />
                  )}
                </div>
                {sigPreview && (
                  <label className="mt-2 flex items-center gap-2 cursor-pointer text-[11px] font-bold text-blue-600 hover:underline">
                    <PenTool size={13} /> Change Signature
                    <input type="file" className="hidden" onChange={handleFileChange(setSigFile, setSigPreview)} />
                  </label>
                )}
              </div>

              <div className="p-4 bg-blue-50 rounded-2xl border border-blue-100 flex gap-3">
                <AlertCircle className="text-blue-600 shrink-0" size={18} />
                <p className="text-[11px] font-bold text-blue-700 leading-tight">
                  Logo and Signature will be used for all printed prescriptions and medical bills.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUCCESS TOAST */}
      {success && (
        <div className="fixed bottom-10 right-10 flex items-center gap-3 bg-slate-900 text-white px-6 py-4 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
          <div className="h-8 w-8 bg-emerald-500 rounded-full flex items-center justify-center">
            <CheckCircle2 size={18} />
          </div>
          <div>
            <p className="text-[13px] font-black uppercase tracking-widest">Profile Synced</p>
            <p className="text-[10px] text-slate-400">Settings updated successfully.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ClinicDetailsForm;