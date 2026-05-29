import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import {
  UserPlus, Search, Phone, MapPin,
  ChevronRight, Loader2,
  Activity, Trash2, ChevronLeft
} from 'lucide-react';
import PatientFormModal from './PatientFormModal';

const API_BAS = import.meta.env.VITE_API_URL;

const ITEMS_PER_PAGE = 10;

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

  const initialFormState = { name: '', mobile: '', age: '', gender: 'Male', address: '', notes: '' };
  const [currentPatient, setCurrentPatient] = useState(initialFormState);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BAS}/api/patients/${slug}/list`, {
        params: { search: searchQuery, gender: filterGender }
      });
      setPatients(res.data.data);
      setCurrentPage(1); // reset to page 1 on new search
    } catch (err) {
      console.error('Error fetching patients', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPatients();
  }, [searchQuery, filterGender]);

  // Pagination logic
  const totalPages = Math.ceil(patients.length / ITEMS_PER_PAGE);
  const paginatedPatients = patients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_BAS}/api/patients/${slug}/delete/${id}`);
      fetchPatients();
    } catch (err) {
      alert('Delete karne mein error aaya!');
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

  /* ── Stat row item ── */
  const StatCell = ({ label, value, color }) => (
    <div style={{ background: '#fff', padding: '10px', textAlign: 'center' }}>
      <p style={{ fontSize: 11, color: '#64748b', margin: '0 0 2px' }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: color || '#0f172a', margin: 0 }}>{value}</p>
    </div>
  );

  /* ── Info row item ── */
  const InfoRow = ({ icon, label, value }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: '#f8fafc', borderRadius: 10 }}>
      <span style={{ fontSize: 16 }}>{icon}</span>
      <div>
        <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{label}</p>
        <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>{value || '—'}</p>
      </div>
    </div>
  );

  /* ── Vital card ── */
  const VitalCard = ({ label, value, color }) => (
    <div style={{ padding: '10px', background: '#f8fafc', borderRadius: 10, textAlign: 'center' }}>
      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 2px' }}>{label}</p>
      <p style={{ fontSize: 14, fontWeight: 700, color: color || '#0f172a', margin: 0 }}>{value}</p>
    </div>
  );

  /* ── Section label ── */
  const SectionLabel = ({ children, mt = 12 }) => (
    <p style={{ fontSize: 11, fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: 1, margin: `${mt}px 0 4px` }}>
      {children}
    </p>
  );

  /* ── Pagination Button ── */
  const PageBtn = ({ page, active, onClick }) => (
    <button
      onClick={onClick}
      style={{
        minWidth: 32, height: 32, borderRadius: 8,
        border: active ? 'none' : '1px solid #e2e8f0',
        background: active ? '#18afb1' : '#fff',
        color: active ? '#fff' : '#64748b',
        fontWeight: 800, fontSize: 12,
        cursor: 'pointer', transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 8px',
      }}
    >
      {page}
    </button>
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-8 font-sans text-slate-900">

      {/* ── HEADER ── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-3 text-slate-800 uppercase">
            <Activity className="text-[#18afb1]" size={28} /> Patient Details
          </h1>
        </div>
      </div>

      {/* ── FILTERS ── */}
      <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-wrap items-center gap-3 mb-6">
        <div className="relative flex-1 min-w-[250px]">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
          <input
            type="text"
            placeholder="Search name, mobile or address..."
            className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-xl text-sm font-bold outline-none focus:ring-2 focus:ring-[#18afb1]/20 transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <select
          className="bg-slate-50 border-none rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-widest text-slate-500 outline-none cursor-pointer"
          value={filterGender}
          onChange={(e) => setFilterGender(e.target.value)}
        >
          <option value="">GENDER: ALL</option>
          <option value="Male">MALE</option>
          <option value="Female">FEMALE</option>
        </select>
      </div>

      {/* ── TABLE ── */}
      <div className="bg-white rounded-[24px] shadow-sm border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">#</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Name</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Contact</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Info</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Location</th>
                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-20 text-center">
                    <Loader2 className="text-[#18afb1] animate-spin mx-auto mb-2" size={32} />
                  </td>
                </tr>
              ) : paginatedPatients.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-16 text-center text-slate-400 font-bold text-sm">
                    No patients found
                  </td>
                </tr>
              ) : paginatedPatients.map((patient, index) => (
                <tr key={patient._id} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-6 py-4 text-xs font-black text-slate-300">
                    {(currentPage - 1) * ITEMS_PER_PAGE + index + 1}
                  </td>
                  <td className="px-6 py-4" onClick={() => setViewPatient(patient)}>
                    <div className="flex items-center gap-3 cursor-pointer">
                      <div className="w-10 h-10 bg-[#18afb1]/10 rounded-xl flex items-center justify-center text-[#18afb1] font-black group-hover:bg-[#18afb1] group-hover:text-white transition-all">
                        {patient.name.charAt(0).toUpperCase()}
                      </div>
                      <p className="text-sm font-black text-slate-700 uppercase leading-none">{patient.name}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-xs font-bold text-slate-600">
                    <Phone size={12} className="inline mr-2 text-slate-300" /> {patient.mobile}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${patient.gender === 'Male' ? 'bg-blue-50 text-blue-600' : 'bg-pink-50 text-pink-600'}`}>
                      {patient.age}Y • {patient.gender.charAt(0)}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-xs text-slate-500 truncate max-w-[150px]">
                    <MapPin size={12} className="inline mr-1 text-slate-300" /> {patient.address}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setViewPatient(patient)}
                        className="p-2 hover:text-blue-600 transition-colors text-slate-300"
                        title="View details"
                      >
                        <ChevronRight size={18} />
                      </button>
                      <button
                        onClick={() => window.confirm('Delete record?') && handleDelete(patient._id)}
                        className="p-2 hover:text-red-500 transition-colors text-slate-300"
                        title="Delete"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* ── PAGINATION ── */}
        {!loading && patients.length > 0 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 24px', borderTop: '1px solid #f1f5f9',
            background: '#fafafa',
          }}>
            {/* Left: showing info */}
            <p style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', margin: 0 }}>
              Showing{' '}
              <span style={{ color: '#0f172a' }}>
                {(currentPage - 1) * ITEMS_PER_PAGE + 1}–{Math.min(currentPage * ITEMS_PER_PAGE, patients.length)}
              </span>
              {' '}of{' '}
              <span style={{ color: '#0f172a' }}>{patients.length}</span>
              {' '}patients
            </p>

            {/* Right: page buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {/* Prev */}
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                style={{
                  minWidth: 32, height: 32, borderRadius: 8,
                  border: '1px solid #e2e8f0', background: '#fff',
                  color: currentPage === 1 ? '#cbd5e1' : '#64748b',
                  fontWeight: 800, fontSize: 12, cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <ChevronLeft size={14} />
              </button>

              {/* Page number buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <PageBtn
                  key={page}
                  page={page}
                  active={page === currentPage}
                  onClick={() => setCurrentPage(page)}
                />
              ))}

              {/* Next */}
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                style={{
                  minWidth: 32, height: 32, borderRadius: 8,
                  border: '1px solid #e2e8f0', background: '#fff',
                  color: currentPage === totalPages ? '#cbd5e1' : '#64748b',
                  fontWeight: 800, fontSize: 12, cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s',
                }}
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── PATIENT FORM MODAL ── */}
      <PatientFormModal
        show={showModal}
        onClose={() => setShowModal(false)}
        slug={slug}
        fetchPatients={fetchPatients}
        formData={currentPatient}
        setFormData={setCurrentPatient}
        isEditing={isEditing}
      />

      {/* ── PATIENT DETAIL MODAL ── */}
      {viewPatient && (
        <div
          onClick={() => setViewPatient(null)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.65)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            padding: '16px',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 20,
              width: '100%',
              maxWidth: 580,
              maxHeight: '92vh',
              overflowY: 'auto',
              boxShadow: '0 32px 80px rgba(0,0,0,0.3)',
            }}
          >
            {/* ── Modal Header ── */}
            <div style={{
              background: '#0f172a',
              padding: '1.25rem 1.5rem',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              borderRadius: '20px 20px 0 0',
              position: 'sticky', top: 0, zIndex: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width: 50, height: 50, borderRadius: '50%',
                  background: '#18afb1',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, fontWeight: 700, color: '#fff',
                }}>
                  {viewPatient.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p style={{ fontSize: 17, fontWeight: 800, color: '#fff', margin: 0, letterSpacing: 0.5 }}>
                    {viewPatient.name.toUpperCase()}
                  </p>
                  <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', margin: '3px 0 0' }}>
                    ID: {(viewPatient.clinicSlug || slug).slice(0, 4).toUpperCase()}{String(viewPatient._id).slice(-6).toUpperCase()}
                    &nbsp;·&nbsp;
                    Registered {new Date(viewPatient.createdAt).toLocaleDateString('en-GB')}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewPatient(null)}
                style={{
                  background: 'rgba(255,255,255,0.1)', border: 'none',
                  borderRadius: '50%', width: 34, height: 34,
                  cursor: 'pointer', color: '#fff', fontSize: 18,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.15s',
                }}
                onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
              >
                ✕
              </button>
            </div>

            {/* ── Top Stats Strip ── */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 1, background: '#e2e8f0' }}>
              <StatCell label="Age / Gender" value={`${viewPatient.age}Y / ${viewPatient.gender}`} />
              <StatCell label="Blood group" value={viewPatient.bloodGroup || '—'} color="#e24b4a" />
              <StatCell
                label="Last visit"
                value={viewPatient.lastVisit ? new Date(viewPatient.lastVisit).toLocaleDateString('en-GB') : '—'}
              />
            </div>

            {/* ── Body ── */}
            <div style={{ padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: 8 }}>

              {/* Contact */}
              <SectionLabel mt={0}>Contact</SectionLabel>
              <InfoRow icon="📞" label="Mobile" value={viewPatient.mobile} />
              <InfoRow icon="🚨" label="Emergency contact" value={viewPatient.emMobile} />
              <InfoRow icon="✉️" label="Email" value={viewPatient.email} />
              <InfoRow icon="📍" label="Address" value={viewPatient.address} />

              {/* Vitals */}
              <SectionLabel>Vitals</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                <VitalCard label="Weight" value={viewPatient.weight ? `${viewPatient.weight} kg` : '—'} />
                <VitalCard label="Height" value={viewPatient.height ? `${viewPatient.height} cm` : '—'} />
                <VitalCard
                  label="BMI"
                  value={viewPatient.bmi ? Number(viewPatient.bmi).toFixed(1) : '—'}
                  color={viewPatient.bmi > 30 ? '#e24b4a' : '#0f172a'}
                />
              </div>

              {/* Allergies */}
              {viewPatient.allergies && (
                <>
                  <SectionLabel>Allergies</SectionLabel>
                  <div style={{ padding: '10px 14px', background: '#fff8e1', borderRadius: 10, border: '1px solid #fbbf24' }}>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#92400e', margin: 0 }}>
                      {viewPatient.allergies || 'None reported'}
                    </p>
                  </div>
                </>
              )}

              {/* Reference */}
              <SectionLabel>Reference</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {[
                  { label: 'Type', value: viewPatient.referenceType || 'Self' },
                  { label: 'Ref name', value: viewPatient.referenceName || '—' },
                ].map(r => (
                  <div key={r.label} style={{ padding: '10px 14px', background: '#f8fafc', borderRadius: 10 }}>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>{r.label}</p>
                    <p style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', margin: 0 }}>{r.value}</p>
                  </div>
                ))}
              </div>
              {viewPatient.referenceMobile && (
                <InfoRow icon="📞" label="Reference mobile" value={viewPatient.referenceMobile} />
              )}

              {/* Consultation fee */}
              {viewPatient.consultationFee && (
                <>
                  <SectionLabel>Consultation fee</SectionLabel>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
                    <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 10, textAlign: 'center' }}>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 2px' }}>Paid amount</p>
                      <p style={{ fontSize: 14, fontWeight: 800, color: '#16a34a', margin: 0 }}>
                        ₹ {viewPatient.consultationFee?.paidAmount ?? '—'}
                      </p>
                    </div>
                    <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 10, textAlign: 'center' }}>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 2px' }}>Status</p>
                      <p style={{ fontSize: 14, fontWeight: 800, margin: 0,
                        color: viewPatient.consultationFee?.status === 'Paid' ? '#16a34a' : '#e24b4a' }}>
                        {viewPatient.consultationFee?.status || '—'}
                      </p>
                    </div>
                    <div style={{ padding: '10px 12px', background: '#f8fafc', borderRadius: 10, textAlign: 'center' }}>
                      <p style={{ fontSize: 11, color: '#94a3b8', margin: '0 0 2px' }}>Valid upto</p>
                      <p style={{ fontSize: 12, fontWeight: 700, color: '#0f172a', margin: 0 }}>
                        {viewPatient.consultationFee?.validUpto
                          ? new Date(viewPatient.consultationFee.validUpto).toLocaleDateString('en-GB')
                          : '—'}
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Records */}
              <SectionLabel>Records</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>📋</span>
                  <div>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Prescriptions</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {viewPatient.prescriptions?.length || 0}
                    </p>
                  </div>
                </div>
                <div style={{ padding: '12px 14px', background: '#f8fafc', borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 20 }}>🧾</span>
                  <div>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: 0 }}>Billing records</p>
                    <p style={{ fontSize: 18, fontWeight: 800, color: '#0f172a', margin: 0 }}>
                      {viewPatient.billingRecords?.length || 0}
                    </p>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </div>
      )}

      <style>{`
        .professional-input {
          width: 100%; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px;
          padding: 12px 16px; font-size: 13px; font-weight: 700; color: #1e293b; outline: none; transition: 0.2s;
        }
        .professional-input:focus {
          border-color: #18afb1; background: #fff; box-shadow: 0 0 0 4px rgba(24,175,177,0.08);
        }
      `}</style>
    </div>
  );
};

export default PatientManagement;