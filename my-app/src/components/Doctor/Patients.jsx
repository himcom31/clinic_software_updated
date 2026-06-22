import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import {
  UserPlus, Search, Phone, MapPin,
  ChevronRight, Loader2,
  Activity, Trash2, ChevronLeft, Eye,
  Filter, X, AlertTriangle, TrendingUp,
  Users, Heart, Shield, MoreVertical,
  FileText, Upload, Download, Calendar
} from 'lucide-react';
import PatientFormModal from './PatientFormModal';

const API_BAS = import.meta.env.VITE_API_URL;
const ITEMS_PER_PAGE = 10;

/* ─── Design Tokens ───────────────────────────────────────── */
const T = {
  brand:    '#0EA5E9',
  brandDk:  '#0284C7',
  brandLt:  '#E0F2FE',
  surface:  '#FFFFFF',
  bg:       '#F0F4F8',
  border:   '#E2E8F0',
  borderMd: '#CBD5E1',
  text1:    '#0F172A',
  text2:    '#475569',
  text3:    '#94A3B8',
  danger:   '#EF4444',
  dangerLt: '#FEF2F2',
  success:  '#10B981',
  successLt:'#ECFDF5',
  warn:     '#F59E0B',
  warnLt:   '#FFFBEB',
  male:     '#3B82F6',
  maleLt:   '#EFF6FF',
  female:   '#EC4899',
  femaleLt: '#FDF2F8',
};

/* ─── Utility Components ──────────────────────────────────── */
const Badge = ({ children, variant = 'default' }) => {
  const styles = {
    default:  { bg: T.bg,         color: T.text2,   border: T.border   },
    male:     { bg: T.maleLt,     color: T.male,    border: '#BFDBFE'  },
    female:   { bg: T.femaleLt,   color: T.female,  border: '#FBCFE8'  },
    success:  { bg: T.successLt,  color: T.success, border: '#A7F3D0'  },
    danger:   { bg: T.dangerLt,   color: T.danger,  border: '#FECACA'  },
    warn:     { bg: T.warnLt,     color: T.warn,    border: '#FDE68A'  },
    brand:    { bg: T.brandLt,    color: T.brandDk, border: '#BAE6FD'  },
  };
  const s = styles[variant] || styles.default;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '2px 8px', borderRadius: 6,
      fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', textTransform: 'uppercase',
      background: s.bg, color: s.color, border: `1px solid ${s.border}`,
      fontFamily: '"DM Mono", monospace',
    }}>
      {children}
    </span>
  );
};

const Divider = ({ vertical }) => vertical
  ? <div style={{ width: 1, alignSelf: 'stretch', background: T.border }} />
  : <div style={{ height: 1, background: T.border }} />;

const StatCard = ({ icon: Icon, label, value, sub, color = T.brand }) => (
  <div style={{
    background: T.surface, border: `1px solid ${T.border}`,
    borderRadius: 12, padding: '16px 20px',
    display: 'flex', alignItems: 'center', gap: 14, minWidth: 0,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: 10,
      background: color + '18',
      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
    }}>
      <Icon size={18} color={color} strokeWidth={2.2} />
    </div>
    <div style={{ minWidth: 0 }}>
      <div style={{ fontSize: 20, fontWeight: 800, color: T.text1, lineHeight: 1.1, fontFamily: '"DM Mono", monospace' }}>{value}</div>
      <div style={{ fontSize: 11, fontWeight: 600, color: T.text3, marginTop: 2, letterSpacing: '0.03em' }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: T.text3, marginTop: 1 }}>{sub}</div>}
    </div>
  </div>
);

/* ─── Main Component ──────────────────────────────────────── */
const PatientManagement = () => {
  const { slug } = useParams();
  const navigate = useNavigate();

  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterGender, setFilterGender] = useState('');
  const [viewPatient, setViewPatient] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [hoveredRow, setHoveredRow] = useState(null);

  // Prescription History (old PDF uploads)
  const [rxFile, setRxFile] = useState(null);
  const [rxTitle, setRxTitle] = useState('');
  const [rxDate, setRxDate] = useState('');
  const [rxUploading, setRxUploading] = useState(false);
  const [rxError, setRxError] = useState('');
  const [patientPrescriptions, setPatientPrescriptions] = useState([]);
const [prescLoading, setPrescLoading] = useState(false);

  const initialFormState = { name: '', mobile: '', age: '', gender: 'Male', address: '', notes: '' };
  const [currentPatient, setCurrentPatient] = useState(initialFormState);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BAS}/api/patients/${slug}/list`, {
        params: { search: searchQuery, gender: filterGender }
      });
      setPatients(res.data.data);
      setCurrentPage(1);
    } catch (err) {
      console.error('Error fetching patients', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPatients(); }, [searchQuery, filterGender]);
  useEffect(() => {
    if (!viewPatient) {
        setPatientPrescriptions([]);
        return;
    }
    const fetchPrescriptions = async () => {
        setPrescLoading(true);
        try {
            const res = await axios.get(
                `${API_BAS}/api/appointments/${slug}/patient/${viewPatient._id}/prescriptions`
            );
            setPatientPrescriptions(res.data.data || []);
        } catch (err) {
            console.error('Prescriptions fetch error:', err);
            setPatientPrescriptions([]);
        } finally {
            setPrescLoading(false);
        }
    };
    fetchPrescriptions();
}, [viewPatient]);

  const totalPages = Math.ceil(patients.length / ITEMS_PER_PAGE);
  const paginatedPatients = patients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const maleCount = patients.filter(p => p.gender === 'Male').length;
  const femaleCount = patients.filter(p => p.gender === 'Female').length;

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this patient record? This action cannot be undone.')) return;
    try {
      await axios.delete(`${API_BAS}/api/patients/${slug}/delete/${id}`);
      fetchPatients();
    } catch {
      alert('Failed to delete record.');
    }
  };

  const handleOpenAdd = () => {
    setCurrentPatient(initialFormState);
    setIsEditing(false);
    setShowModal(true);
  };

  const handleOpenEdit = (patient) => {
    setCurrentPatient(patient);
    setIsEditing(true);
    setShowModal(true);
  };

  /* ── Prescription History: upload handler ── */
  const resetRxForm = () => {
    setRxFile(null);
    setRxTitle('');
    setRxDate('');
    setRxError('');
  };

  const handleRxFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.type !== 'application/pdf') {
      setRxError('Sirf PDF file allowed hai.');
      setRxFile(null);
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setRxError('File 10MB se badi nahi honi chahiye.');
      setRxFile(null);
      return;
    }
    setRxError('');
    setRxFile(file);
  };

  const handleRxUpload = async () => {
    if (!rxFile || !viewPatient) {
      setRxError('Pehle ek PDF file select karo.');
      return;
    }
    try {
      setRxUploading(true);
      setRxError('');
      const formData = new FormData();
      formData.append('pdf', rxFile);
      formData.append('title', rxTitle || 'Old Prescription');
      if (rxDate) formData.append('date', rxDate);

      const res = await axios.post(
        `${API_BAS}/api/patients/${slug}/profile/${viewPatient._id}/prescription-upload`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      // Update local viewPatient + patients list with new history
      const updatedHistory = res.data.data;
      setViewPatient(prev => ({ ...prev, prescriptionHistory: updatedHistory }));
      setPatients(prev => prev.map(p =>
        p._id === viewPatient._id ? { ...p, prescriptionHistory: updatedHistory } : p
      ));
      resetRxForm();
    } catch (err) {
      setRxError(err?.response?.data?.message || 'Upload fail ho gaya. Dobara try karo.');
    } finally {
      setRxUploading(false);
    }
  };

  const handleRxDelete = async (entryId) => {
    if (!viewPatient) return;
    if (!window.confirm('Ye prescription PDF delete karna hai?')) return;
    try {
      const res = await axios.delete(
        `${API_BAS}/api/patients/${slug}/profile/${viewPatient._id}/prescription-history/${entryId}`
      );
      const updatedHistory = res.data.data;
      setViewPatient(prev => ({ ...prev, prescriptionHistory: updatedHistory }));
      setPatients(prev => prev.map(p =>
        p._id === viewPatient._id ? { ...p, prescriptionHistory: updatedHistory } : p
      ));
    } catch {
      alert('Delete fail ho gaya.');
    }
  };

  /* ── Pagination range builder ── */
  const getPageRange = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    if (currentPage <= 4) return [1, 2, 3, 4, 5, '…', totalPages];
    if (currentPage >= totalPages - 3) return [1, '…', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    return [1, '…', currentPage - 1, currentPage, currentPage + 1, '…', totalPages];
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@300;400;500;600;700;800&family=DM+Mono:wght@400;500;600&display=swap');

        .pm-root { font-family: 'DM Sans', sans-serif; }

        .pm-table-row { transition: background 0.1s ease; cursor: default; }
        .pm-table-row:hover { background: #F8FBFF !important; }
        .pm-table-row:hover .pm-row-actions { opacity: 1 !important; }

        .pm-btn-ghost {
          display: flex; align-items: center; justify-content: center;
          width: 30px; height: 30px; border-radius: 7px; border: none;
          background: transparent; cursor: pointer; color: ${T.text3};
          transition: all 0.12s ease;
        }
        .pm-btn-ghost:hover { background: ${T.bg}; color: ${T.text1}; }
        .pm-btn-ghost.danger:hover { background: ${T.dangerLt}; color: ${T.danger}; }
        .pm-btn-ghost.brand:hover  { background: ${T.brandLt};  color: ${T.brandDk}; }

        .pm-input {
          font-family: 'DM Sans', sans-serif;
          font-size: 13px; font-weight: 500; color: ${T.text1};
          background: ${T.bg}; border: 1px solid ${T.border};
          border-radius: 8px; padding: 8px 12px; outline: none;
          transition: all 0.15s ease; width: 100%;
        }
        .pm-input:focus { border-color: ${T.brand}; background: #fff; box-shadow: 0 0 0 3px ${T.brand}22; }

        .pm-primary-btn {
          display: flex; align-items: center; gap: 7px;
          padding: 9px 16px; border-radius: 9px; border: none;
          background: ${T.text1}; color: #fff;
          font-family: 'DM Sans', sans-serif; font-size: 13px; font-weight: 700;
          cursor: pointer; transition: all 0.15s ease; white-space: nowrap;
          letter-spacing: 0.01em;
        }
        .pm-primary-btn:hover { background: #1E293B; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.15); }
        .pm-primary-btn:active { transform: translateY(0); }

        .pm-primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }

        .pm-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .pm-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .pm-scrollbar::-webkit-scrollbar-thumb { background: ${T.borderMd}; border-radius: 99px; }
        .pm-scrollbar::-webkit-scrollbar-thumb:hover { background: ${T.text3}; }

        .pm-tag {
          display: inline-flex; align-items: center; gap: 3px;
          font-family: 'DM Mono', monospace; font-size: 10px; font-weight: 600;
          text-transform: uppercase; letter-spacing: 0.06em;
          padding: 2px 7px; border-radius: 5px;
        }

        .pm-slide-in {
          animation: slideIn 0.18s cubic-bezier(0.16, 1, 0.3, 1) forwards;
        }
        @keyframes slideIn {
          from { opacity: 0; transform: translateY(6px) scale(0.99); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .pm-info-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 10px 16px; font-size: 12px;
        }
        .pm-info-row + .pm-info-row { border-top: 1px solid ${T.border}; }

        .pm-section-header {
          padding: 10px 16px; font-size: 10px; font-weight: 700;
          text-transform: uppercase; letter-spacing: 0.08em;
          color: ${T.text3}; background: #F8FAFC;
          border-bottom: 1px solid ${T.border};
        }

        .pm-vital-card {
          background: ${T.surface}; border: 1px solid ${T.border};
          border-radius: 10px; padding: 12px 14px; text-align: center;
          box-shadow: 0 1px 2px rgba(0,0,0,0.03);
        }

        .pm-detail-panel {
          background: ${T.surface}; border: 1px solid ${T.border};
          border-radius: 12px; overflow: hidden;
          box-shadow: 0 1px 4px rgba(0,0,0,0.04);
        }

        .pm-rx-upload-zone {
          border: 1.5px dashed ${T.borderMd}; border-radius: 10px;
          padding: 14px; background: ${T.bg};
          display: flex; flex-direction: column; gap: 10px;
        }

        .pm-rx-item {
          display: flex; align-items: center; gap: 10px;
          padding: 10px 14px; border-bottom: 1px solid ${T.border};
        }
        .pm-rx-item:last-child { border-bottom: none; }
        .pm-rx-item:hover { background: #F8FBFF; }
      `}</style>

      <div className="pm-root" style={{ minHeight: '100vh', background: T.bg, padding: '24px 28px' }}>

        {/* ── Page Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, gap: 16, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <div style={{
                width: 34, height: 34, borderRadius: 9,
                background: T.text1, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Activity size={16} color="#fff" strokeWidth={2.5} />
              </div>
              <h1 style={{ fontSize: 20, fontWeight: 800, color: T.text1, margin: 0, letterSpacing: '-0.02em' }}>
                Patient Registry
              </h1>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: T.text3, fontWeight: 500, paddingLeft: 44 }}>
              Clinic · <span style={{ fontFamily: '"DM Mono", monospace', color: T.text2 }}>{String(slug || '').toUpperCase()}</span>
            </p>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
          <StatCard icon={Users}      label="Total Patients"  value={patients.length}  color={T.brand}   />
          <StatCard icon={Shield}     label="Male Patients"   value={maleCount}         color={T.male}    />
          <StatCard icon={Heart}      label="Female Patients" value={femaleCount}       color={T.female}  />
          <StatCard icon={TrendingUp} label="This Page"       value={paginatedPatients.length} color={T.success} />
        </div>

        {/* ── Toolbar ── */}
        <div style={{
          background: T.surface, borderRadius: 12,
          border: `1px solid ${T.border}`, padding: '10px 14px',
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
          boxShadow: '0 1px 3px rgba(0,0,0,0.04)', flexWrap: 'wrap',
        }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 240 }}>
            <Search size={14} color={T.text3} style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)' }} />
            <input
              className="pm-input"
              style={{ paddingLeft: 34 }}
              placeholder="Search by name, mobile, or address…"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <Filter size={13} color={T.text3} />
            <select
              className="pm-input"
              style={{ width: 'auto', paddingLeft: 10, paddingRight: 28, fontSize: 12, cursor: 'pointer' }}
              value={filterGender}
              onChange={e => setFilterGender(e.target.value)}
            >
              <option value="">All Genders</option>
              <option value="Male">Male</option>
              <option value="Female">Female</option>
            </select>
          </div>

          {(searchQuery || filterGender) && (
            <button
              onClick={() => { setSearchQuery(''); setFilterGender(''); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '7px 11px', borderRadius: 7, border: `1px solid ${T.border}`,
                background: T.bg, color: T.text2, fontSize: 12, fontWeight: 600,
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <X size={12} /> Clear
            </button>
          )}

          <div style={{ marginLeft: 'auto', fontSize: 12, color: T.text3, fontWeight: 600, whiteSpace: 'nowrap' }}>
            {patients.length} record{patients.length !== 1 ? 's' : ''}
          </div>
        </div>

        {/* ── Table ── */}
        <div style={{
          background: T.surface, borderRadius: 14,
          border: `1px solid ${T.border}`,
          overflow: 'hidden',
          boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
        }}>
          <div style={{ overflowX: 'auto' }} className="pm-scrollbar">
            <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '5%'  }} />
                <col style={{ width: '28%' }} />
                <col style={{ width: '18%' }} />
                <col style={{ width: '13%' }} />
                <col style={{ width: '24%' }} />
                <col style={{ width: '12%' }} />
              </colgroup>
              <thead>
                <tr style={{ borderBottom: `1px solid ${T.border}`, background: '#FAFBFC' }}>
                  {['#', 'Patient', 'Contact', 'Biometrics', 'Address', 'Actions'].map((h, i) => (
                    <th key={h} style={{
                      padding: '10px 16px',
                      fontSize: 10, fontWeight: 700, letterSpacing: '0.07em',
                      textTransform: 'uppercase', color: T.text3,
                      textAlign: i === 3 ? 'center' : i === 5 ? 'right' : 'left',
                      fontFamily: '"DM Sans", sans-serif',
                    }}>{h}</th>
                  ))}
                </tr>
              </thead>

              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '72px 0', textAlign: 'center' }}>
                      <Loader2 size={24} color={T.brand} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 10px' }} />
                      <span style={{ fontSize: 12, color: T.text3, fontWeight: 600 }}>Loading patient records…</span>
                    </td>
                  </tr>
                ) : paginatedPatients.length === 0 ? (
                  <tr>
                    <td colSpan={6} style={{ padding: '72px 0', textAlign: 'center' }}>
                      <Users size={28} color={T.text3} style={{ display: 'block', margin: '0 auto 10px', opacity: 0.4 }} />
                      <span style={{ fontSize: 13, color: T.text3, fontWeight: 600 }}>No patients found</span>
                      <div style={{ fontSize: 11, color: T.text3, marginTop: 4 }}>Try adjusting your search or filters</div>
                    </td>
                  </tr>
                ) : (
                  paginatedPatients.map((patient, index) => {
                    const rowNum = (currentPage - 1) * ITEMS_PER_PAGE + index + 1;
                    const isMale = patient.gender === 'Male';
                    return (
                      <tr
                        key={patient._id}
                        className="pm-table-row"
                        style={{ borderBottom: `1px solid ${T.border}`, background: T.surface }}
                      >
                        {/* # */}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: T.text3, fontFamily: '"DM Mono", monospace' }}>
                            {String(rowNum).padStart(2, '0')}
                          </span>
                        </td>

                        {/* Patient */}
                        <td style={{ padding: '12px 16px' }}>
                          <div
                            style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                            onClick={() => setViewPatient(patient)}
                          >
                            <div style={{
                              width: 34, height: 34, borderRadius: 9,
                              background: isMale ? T.maleLt : T.femaleLt,
                              border: `1px solid ${isMale ? '#BFDBFE' : '#FBCFE8'}`,
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 12, fontWeight: 800, flexShrink: 0,
                              color: isMale ? T.male : T.female,
                              transition: 'all 0.12s',
                            }}>
                              {patient.name?.charAt(0).toUpperCase()}
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div style={{ fontSize: 13, fontWeight: 700, color: T.text1, letterSpacing: '-0.01em', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {patient.name}
                              </div>
                              <div style={{ fontSize: 10, color: T.text3, fontFamily: '"DM Mono", monospace', marginTop: 1 }}>
                                #{String(patient._id).slice(-6).toUpperCase()}
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Contact */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            <Phone size={11} color={T.text3} strokeWidth={2} />
                            <span style={{ fontSize: 12, fontWeight: 600, color: T.text2, fontFamily: '"DM Mono", monospace' }}>
                              {patient.mobile || '—'}
                            </span>
                          </div>
                        </td>

                        {/* Biometrics */}
                        <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                          <span className="pm-tag" style={{
                            background: isMale ? T.maleLt : T.femaleLt,
                            color: isMale ? T.male : T.female,
                            border: `1px solid ${isMale ? '#BFDBFE' : '#FBCFE8'}`,
                          }}>
                            <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'currentColor', display: 'inline-block' }} />
                            {patient.age || '?'}y · {patient.gender?.charAt(0) || '?'}
                          </span>
                        </td>

                        {/* Address */}
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, maxWidth: '100%' }}>
                            <MapPin size={11} color={T.text3} strokeWidth={2} style={{ flexShrink: 0 }} />
                            <span style={{
                              fontSize: 12, fontWeight: 500, color: T.text2,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block',
                            }} title={patient.address}>
                              {patient.address || <span style={{ color: T.text3, fontStyle: 'italic' }}>Not provided</span>}
                            </span>
                          </div>
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '12px 16px' }}>
                          <div className="pm-row-actions" style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 2,
                            opacity: 0.3, transition: 'opacity 0.1s',
                          }}>
                            <button
                              className="pm-btn-ghost brand"
                              title="View full profile"
                              onClick={() => setViewPatient(patient)}
                            >
                              <Eye size={14} strokeWidth={2.2} />
                            </button>
                            <button
                              className="pm-btn-ghost danger"
                              title="Delete record"
                              onClick={() => handleDelete(patient._id)}
                            >
                              <Trash2 size={14} strokeWidth={2.2} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* ── Pagination ── */}
          {!loading && patients.length > 0 && (
            <div style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '12px 20px', borderTop: `1px solid ${T.border}`,
              background: '#FAFBFC', flexWrap: 'wrap', gap: 10,
            }}>
              <span style={{ fontSize: 12, fontWeight: 600, color: T.text3 }}>
                Showing <b style={{ color: T.text1 }}>{(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, patients.length)}</b> of <b style={{ color: T.text1 }}>{patients.length}</b>
              </span>

              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                {/* Prev */}
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 30, height: 30, borderRadius: 7,
                    border: `1px solid ${T.border}`, background: T.surface,
                    color: currentPage === 1 ? T.text3 : T.text2,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    opacity: currentPage === 1 ? 0.4 : 1,
                  }}
                >
                  <ChevronLeft size={14} />
                </button>

                {getPageRange().map((page, i) => (
                  <button
                    key={i}
                    onClick={() => typeof page === 'number' && setCurrentPage(page)}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      minWidth: 30, height: 30, padding: '0 6px', borderRadius: 7,
                      border: page === currentPage ? 'none' : `1px solid ${T.border}`,
                      background: page === currentPage ? T.text1 : T.surface,
                      color: page === currentPage ? '#fff' : page === '…' ? T.text3 : T.text2,
                      fontSize: 12, fontWeight: page === currentPage ? 800 : 600,
                      cursor: typeof page === 'number' ? 'pointer' : 'default',
                      fontFamily: '"DM Mono", monospace',
                    }}
                  >
                    {page}
                  </button>
                ))}

                {/* Next */}
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: 30, height: 30, borderRadius: 7,
                    border: `1px solid ${T.border}`, background: T.surface,
                    color: currentPage === totalPages ? T.text3 : T.text2,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    opacity: currentPage === totalPages ? 0.4 : 1,
                  }}
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ── Patient Form Modal ── */}
      <PatientFormModal
        show={showModal}
        onClose={() => setShowModal(false)}
        slug={slug}
        fetchPatients={fetchPatients}
        formData={currentPatient}
        setFormData={setCurrentPatient}
        isEditing={isEditing}
      />

      {/* ═══════════════════════════════════════════════════════ */}
      {/* ── Patient Detail Panel (Slide-over style) ── */}
      {viewPatient && (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(15,23,42,0.5)',
            backdropFilter: 'blur(3px)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: 16,
          }}
          onClick={() => { setViewPatient(null); resetRxForm(); }}
        >
          <div
            className="pm-slide-in pm-scrollbar"
            style={{
              background: T.bg,
              width: '100%', maxWidth: 980,
              height: '90vh', maxHeight: 720,
              borderRadius: 16, overflow: 'hidden',
              boxShadow: '0 24px 64px rgba(0,0,0,0.22)',
              display: 'flex', flexDirection: 'column',
              border: `1px solid ${T.border}`,
            }}
            onClick={e => e.stopPropagation()}
          >

            {/* Header */}
            <div style={{
              background: T.surface, padding: '14px 20px',
              borderBottom: `1px solid ${T.border}`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{
                  width: 38, height: 38, borderRadius: 10,
                  background: viewPatient.gender === 'Male' ? T.maleLt : T.femaleLt,
                  border: `1px solid ${viewPatient.gender === 'Male' ? '#BFDBFE' : '#FBCFE8'}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 14, fontWeight: 800,
                  color: viewPatient.gender === 'Male' ? T.male : T.female,
                }}>
                  {viewPatient.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: T.text1, letterSpacing: '-0.02em' }}>
                    {viewPatient.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2 }}>
                    <span style={{ fontSize: 10, color: T.text3, fontFamily: '"DM Mono", monospace' }}>
                      ID: {String(viewPatient.clinicSlug || slug || 'CL').slice(0, 4).toUpperCase()}{String(viewPatient._id).slice(-6).toUpperCase()}
                    </span>
                    <Badge variant={viewPatient.gender === 'Male' ? 'male' : 'female'}>
                      {viewPatient.gender}
                    </Badge>
                    {viewPatient.age && (
                      <Badge variant="default">{viewPatient.age} yrs</Badge>
                    )}
                  </div>
                </div>
              </div>
              <button
                style={{
                  width: 32, height: 32, borderRadius: 8, border: `1px solid ${T.border}`,
                  background: T.bg, cursor: 'pointer', display: 'flex',
                  alignItems: 'center', justifyContent: 'center', color: T.text3,
                  transition: 'all 0.12s',
                }}
                onClick={() => { setViewPatient(null); resetRxForm(); }}
              >
                <X size={14} />
              </button>
            </div>

            {/* Body */}
            <div className="pm-scrollbar" style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

                {/* ── Left Column ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Quick Biometrics */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                    {[
                      { label: 'Age / Sex', value: `${viewPatient.age || '—'}y / ${viewPatient.gender?.charAt(0) || '—'}` },
                      { label: 'Blood Group', value: viewPatient.bloodGroup || '—', highlight: true },
                      { label: 'Last Visit', value: viewPatient.lastVisit ? new Date(viewPatient.lastVisit).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }) : '—' },
                    ].map(c => (
                      <div key={c.label} className="pm-vital-card">
                        <div style={{ fontSize: 9, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{c.label}</div>
                        <div style={{ fontSize: 14, fontWeight: 800, color: c.highlight ? T.danger : T.text1, fontFamily: '"DM Mono", monospace' }}>{c.value}</div>
                      </div>
                    ))}
                  </div>

                  {/* Contact Info */}
                  <div className="pm-detail-panel">
                    <div className="pm-section-header">Contact Information</div>
                    {[
                      { label: 'Primary Mobile',     value: viewPatient.mobile    },
                      { label: 'Emergency Contact',   value: viewPatient.emMobile  },
                      { label: 'Email Address',       value: viewPatient.email     },
                    ].map(row => (
                      <div key={row.label} className="pm-info-row">
                        <span style={{ fontSize: 12, fontWeight: 500, color: T.text3 }}>{row.label}</span>
                        <span style={{ fontSize: 12, fontWeight: 700, color: T.text1, fontFamily: '"DM Mono", monospace', userSelect: 'all' }}>
                          {row.value || <span style={{ color: T.text3, fontWeight: 400 }}>—</span>}
                        </span>
                      </div>
                    ))}
                    <div style={{ padding: '10px 16px', borderTop: `1px solid ${T.border}` }}>
                      <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 5 }}>Residential Address</div>
                      <div style={{ fontSize: 12, fontWeight: 500, color: T.text2, lineHeight: 1.6 }}>
                        {viewPatient.address || <span style={{ color: T.text3, fontStyle: 'italic' }}>No address on file</span>}
                      </div>
                    </div>
                  </div>

                </div>

                {/* ── Right Column ── */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Vitals */}
                  <div>
                    <div style={{ fontSize: 10, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>Biometric Vitals</div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
                      {[
                        { label: 'Weight', value: viewPatient.weight ? `${viewPatient.weight} kg` : '—' },
                        { label: 'Height', value: viewPatient.height ? `${viewPatient.height} ft` : '—' },
                        { label: 'BMI', value: viewPatient.bmi ? Number(viewPatient.bmi).toFixed(1) : '—', warn: viewPatient.bmi > 30 },
                      ].map(c => (
                        <div key={c.label} className="pm-vital-card">
                          <div style={{ fontSize: 9, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{c.label}</div>
                          <div style={{ fontSize: 14, fontWeight: 800, color: c.warn ? T.danger : T.text1, fontFamily: '"DM Mono", monospace' }}>{c.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Allergies Alert */}
                  {viewPatient.allergies && (
                    <div style={{
                      background: T.warnLt, border: `1px solid #FDE68A`,
                      borderRadius: 10, padding: '12px 14px',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                    }}>
                      <AlertTriangle size={14} color={T.warn} strokeWidth={2.5} style={{ flexShrink: 0, marginTop: 1 }} />
                      <div>
                        <div style={{ fontSize: 10, fontWeight: 800, color: '#92400E', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>Allergies & Contraindications</div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#78350F', lineHeight: 1.5 }}>{viewPatient.allergies}</div>
                      </div>
                    </div>
                  )}

                  {/* Financial Ledger */}
                  <div className="pm-detail-panel">
                    <div className="pm-section-header">Consultation Ledger</div>
                    <div className="pm-info-row">
                      <span style={{ fontSize: 12, fontWeight: 500, color: T.text3 }}>Referral Channel</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.text1 }}>{viewPatient.referenceType || 'Direct Walk-In'}</span>
                    </div>
                    <div className="pm-info-row">
                      <span style={{ fontSize: 12, fontWeight: 500, color: T.text3 }}>Assigned Practitioner</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: T.text1 }}>{viewPatient.referenceName || '—'}</span>
                    </div>

                    {viewPatient.consultationFee && (
                      <>
                        <Divider />
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 0, borderTop: `1px solid ${T.border}` }}>
                          {[
                            { label: 'Amount Paid', value: `₹${viewPatient.consultationFee?.paidAmount ?? 0}` },
                            { label: 'Status', value: null, badge: viewPatient.consultationFee?.status },
                            { label: 'Valid Until', value: viewPatient.consultationFee?.validUpto ? new Date(viewPatient.consultationFee.validUpto).toLocaleDateString('en-IN') : '—' },
                          ].map((col, i) => (
                            <div key={col.label} style={{
                              padding: '12px 14px', textAlign: 'center',
                              borderRight: i < 2 ? `1px solid ${T.border}` : 'none',
                            }}>
                              <div style={{ fontSize: 9, fontWeight: 700, color: T.text3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6 }}>{col.label}</div>
                              {col.badge
                                ? <Badge variant={col.badge === 'Paid' ? 'success' : 'danger'}>{col.badge}</Badge>
                                : <div style={{ fontSize: 13, fontWeight: 800, color: T.text1, fontFamily: '"DM Mono", monospace' }}>{col.value}</div>
                              }
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>

                </div>
              </div>

              {/* ── Prescription History Section (full width, below both columns) ── */}
              <div className="pm-detail-panel" style={{ marginTop: 16 }}>
                <div className="pm-section-header" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <FileText size={12} /> Prescription History (Old Records)
                </div>

                {/* Upload Zone */}
                {/* <div style={{ padding: 14 }}>
                  <div className="pm-rx-upload-zone">
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      <input
                        type="text"
                        className="pm-input"
                        style={{ flex: '1 1 180px' }}
                        placeholder="Title (e.g. Visit - Knee Pain)"
                        value={rxTitle}
                        onChange={e => setRxTitle(e.target.value)}
                      />
                      <input
                        type="date"
                        className="pm-input"
                        style={{ flex: '0 1 160px' }}
                        value={rxDate}
                        onChange={e => setRxDate(e.target.value)}
                      />
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <label style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 8, border: `1px solid ${T.borderMd}`,
                        background: T.surface, fontSize: 12, fontWeight: 600, color: T.text2,
                        cursor: 'pointer', whiteSpace: 'nowrap',
                      }}>
                        <Upload size={13} />
                        {rxFile ? rxFile.name : 'Choose PDF'}
                        <input
                          type="file"
                          accept="application/pdf"
                          onChange={handleRxFileChange}
                          style={{ display: 'none' }}
                        />
                      </label>

                      <button
                        className="pm-primary-btn"
                        onClick={handleRxUpload}
                        disabled={!rxFile || rxUploading}
                      >
                        {rxUploading ? <Loader2 size={13} style={{ animation: 'spin 1s linear infinite' }} /> : <Upload size={13} />}
                        {rxUploading ? 'Uploading…' : 'Upload PDF'}
                      </button>

                      {rxError && (
                        <span style={{ fontSize: 11, color: T.danger, fontWeight: 600 }}>{rxError}</span>
                      )}
                    </div>
                  </div>
                </div> */}

                {/* List of uploaded prescriptions */}
                <div style={{ borderTop: `1px solid ${T.border}` }}>
                  {(!viewPatient.prescriptionHistory || viewPatient.prescriptionHistory.length === 0) ? (
                    <div style={{ padding: '24px 14px', textAlign: 'center' }}>
                      <FileText size={20} color={T.text3} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.4 }} />
                      <span style={{ fontSize: 12, color: T.text3, fontWeight: 600 }}>NULL</span>
                    </div>
                  ) : (
                    viewPatient.prescriptionHistory
                      .slice()
                      .sort((a, b) => new Date(b.date || b.uploadedAt) - new Date(a.date || a.uploadedAt))
                      .map((rx) => (
                        <div key={rx._id} className="pm-rx-item">
                          <div style={{
                            width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                            background: T.brandLt, display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}>
                            <FileText size={14} color={T.brandDk} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 12, fontWeight: 700, color: T.text1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {rx.title || 'Old Prescription'}
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                              <Calendar size={10} color={T.text3} />
                              <span style={{ fontSize: 10, color: T.text3, fontFamily: '"DM Mono", monospace' }}>
                                {rx.date ? new Date(rx.date).toLocaleDateString('en-IN') : '—'}
                              </span>
                              {rx.fileName && (
                                <span style={{ fontSize: 10, color: T.text3, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 160 }}>
                                  · {rx.fileName}
                                </span>
                              )}
                            </div>
                          </div>
                          <a
                            href={rx.pdfUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="pm-btn-ghost brand"
                            title="View / Download PDF"
                          >
                            <Download size={14} strokeWidth={2.2} />
                          </a>
                          <button
                            className="pm-btn-ghost danger"
                            title="Delete this record"
                            onClick={() => handleRxDelete(rx._id)}
                          >
                            <Trash2 size={14} strokeWidth={2.2} />
                          </button>
                        </div>
                      ))
                  )}
                </div>

                {/* ── DocEdge Generated Prescriptions ── */}
<div className="pm-detail-panel" style={{ marginTop: 16 }}>
    <div className="pm-section-header" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <FileText size={12} /> DocEdge Prescriptions (Generated)
    </div>

    {prescLoading ? (
        <div style={{ padding: '24px 14px', textAlign: 'center' }}>
            <Loader2 size={18} color={T.brand} style={{ animation: 'spin 1s linear infinite', display: 'block', margin: '0 auto 8px' }} />
            <span style={{ fontSize: 12, color: T.text3 }}>Loading prescriptions...</span>
        </div>
    ) : patientPrescriptions.length === 0 ? (
        <div style={{ padding: '24px 14px', textAlign: 'center' }}>
            <FileText size={20} color={T.text3} style={{ display: 'block', margin: '0 auto 8px', opacity: 0.4 }} />
            <span style={{ fontSize: 12, color: T.text3, fontWeight: 600 }}>
                NULL
            </span>
        </div>
    ) : (
        patientPrescriptions.map((appt) => (
            appt.prescriptions.map((rx) => (
                <div key={rx._id} className="pm-rx-item">
                    {/* Icon */}
                    <div style={{
                        width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                        background: T.brandLt,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <FileText size={14} color={T.brandDk} />
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: T.text1 }}>
                            {appt.visitType === 'Revisit Patient' ? 'Revisit' : 'New Patient'} — Token #{appt.tokenNumber || '—'}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                            <Calendar size={10} color={T.text3} />
                            <span style={{ fontSize: 10, color: T.text3, fontFamily: '"DM Mono", monospace' }}>
                                {appt.appointmentDate
                                    ? new Date(appt.appointmentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                                    : '—'}
                            </span>
                            <span style={{
                                fontSize: 10, fontWeight: 700,
                                color: appt.status === 'Completed' ? T.success : T.warn,
                                background: appt.status === 'Completed' ? T.successLt : T.warnLt,
                                padding: '1px 6px', borderRadius: 4,
                            }}>
                                {appt.status}
                            </span>
                        </div>
                    </div>

                    {/* Download PDF button */}
                    {rx.pdfBinary ? (
                        <button
                            className="pm-btn-ghost brand"
                            title="View / Download PDF"
                            onClick={() => {
                                // pdfBinary base64 string hai — open in new tab
                                const byteStr = atob(rx.pdfBinary.split(',')[1] || rx.pdfBinary);
                                const ab = new ArrayBuffer(byteStr.length);
                                const ia = new Uint8Array(ab);
                                for (let i = 0; i < byteStr.length; i++) ia[i] = byteStr.charCodeAt(i);
                                const blob = new Blob([ab], { type: 'application/pdf' });
                                const url = URL.createObjectURL(blob);
                                window.open(url, '_blank');
                            }}
                        >
                            <Download size={14} strokeWidth={2.2} />
                        </button>
                    ) : (
                        <span style={{ fontSize: 10, color: T.text3, fontStyle: 'italic' }}>No PDF</span>
                    )}
                </div>
            ))
        ))
    )}
</div>
              </div>

            </div>

          </div>
        </div>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </>
  );
};

export default PatientManagement;