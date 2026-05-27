import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, User, Building2, ChevronRight, Search, X, Pencil, Lock } from 'lucide-react';

const API_BAS = import.meta.env.VITE_API_URL;

// ─── Edit Modal ───────────────────────────────────────────────────────────────
const EditModal = ({ doctor, onClose, onSaved }) => {
  const [form, setForm] = useState({
    name: doctor.name || '',
    email: doctor.email || '',
    mobile: doctor.mobile || '',
    address: doctor.address || '',
    password: '',          // leave blank = don't change
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const inputStyle =
    'w-full bg-white border border-slate-200 rounded-lg py-2.5 px-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-700 text-sm placeholder:text-slate-400 disabled:bg-slate-50 disabled:text-slate-400 disabled:cursor-not-allowed';
  const labelStyle = 'text-sm font-semibold text-slate-700 mb-1.5 block';

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const token = localStorage.getItem('adminToken');
      const payload = { ...form };
      if (!payload.password) delete payload.password; // don't send empty password
      await axios.put(`${API_BAS}/api/doctors/${doctor._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update doctor.');
    }
    setSaving(false);
  };

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-bold text-slate-800">Edit Doctor Details</h2>
            <p className="text-xs text-slate-400 mt-0.5">Clinic name is locked and cannot be changed.</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-all"
          >
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Clinic Name — locked */}
          <div className="md:col-span-2">
            <label className={labelStyle}>
              Clinic Name
              <span className="ml-2 inline-flex items-center gap-1 text-[10px] bg-amber-100 text-amber-600 px-1.5 py-0.5 rounded-full font-bold">
                <Lock size={9} /> LOCKED
              </span>
            </label>
            <input
              disabled
              value={doctor.clinicName}
              className={inputStyle}
              title="Clinic name cannot be changed"
            />
          </div>

          <div>
            <label className={labelStyle}>Full Name</label>
            <input
              type="text"
              placeholder="Dr. Full Name"
              className={inputStyle}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          </div>

          <div>
            <label className={labelStyle}>Email Address</label>
            <input
              type="email"
              placeholder="doctor@example.com"
              className={inputStyle}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div>
            <label className={labelStyle}>Mobile Number</label>
            <input
              type="text"
              placeholder="9876543210"
              className={inputStyle}
              value={form.mobile}
              onChange={(e) => setForm({ ...form, mobile: e.target.value })}
            />
          </div>

          <div>
            <label className={labelStyle}>Location</label>
            <input
              type="text"
              placeholder="City, State"
              className={inputStyle}
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
            />
          </div>

          <div className="md:col-span-2">
            <label className={labelStyle}>
              New Password
              <span className="ml-2 text-[10px] text-slate-400 font-normal">(leave blank to keep current)</span>
            </label>
            <input
              type="text"
              placeholder="Enter new password or leave blank"
              className={inputStyle}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
            />
          </div>
        </div>

        {/* Error */}
        {error && (
          <p className="px-6 pb-2 text-xs text-red-500 font-medium">{error}</p>
        )}

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="py-2.5 px-6 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="py-2.5 px-8 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all active:scale-95 shadow-md shadow-blue-100 disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const DoctorForm = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', clinicName: '', address: '', mobile: '', password: '',
  });
  const [allDoctors, setAllDoctors] = useState([]);        // full list for search
  const [latestDoctors, setLatestDoctors] = useState([]);  // displayed list
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingDoctor, setEditingDoctor] = useState(null);

  const fetchLatestDoctors = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${API_BAS}/api/doctors/all`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const reversed = res.data.reverse();
      setAllDoctors(reversed);
      setLatestDoctors(reversed.slice(0, 5));
      setSearchQuery(''); // reset search on refresh
    } catch (err) {
      console.error('Error fetching doctors', err);
    }
  };

  useEffect(() => {
    fetchLatestDoctors();
  }, []);

  // Live search filter
  useEffect(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) {
      setLatestDoctors(allDoctors.slice(0, 5));
    } else {
      const filtered = allDoctors.filter(
        (d) =>
          d.name?.toLowerCase().includes(q) ||
          d.email?.toLowerCase().includes(q)
      );
      setLatestDoctors(filtered);
    }
  }, [searchQuery, allDoctors]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(`${API_BAS}/api/doctors/create`, formData, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert('Success: Doctor registered successfully!');
      setFormData({ name: '', email: '', clinicName: '', address: '', mobile: '', password: '' });
      fetchLatestDoctors();
    } catch (err) {
      alert(err.response?.data?.message || 'Error creating doctor');
    }
    setLoading(false);
  };

  const inputStyle =
    'w-full bg-white border border-slate-200 rounded-lg py-2.5 px-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-700 text-sm placeholder:text-slate-400';
  const labelStyle = 'text-sm font-semibold text-slate-700 mb-1.5 block';

  const isSearching = searchQuery.trim().length > 0;

  return (
    <>
      {/* Edit Modal */}
      {editingDoctor && (
        <EditModal
          doctor={editingDoctor}
          onClose={() => setEditingDoctor(null)}
          onSaved={fetchLatestDoctors}
        />
      )}

      <div className="flex flex-col lg:flex-row gap-8 items-start animate-in fade-in duration-500">

        {/* ── LEFT: FORM ── */}
        <div className="w-full lg:max-w-xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-slate-800">Add New Doctor</h1>
          </div>

          <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className={labelStyle}>Full Name</label>
                <input type="text" required placeholder="Dr. Himanshu Chaudhary" className={inputStyle}
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div>
                <label className={labelStyle}>Clinic Name</label>
                <input type="text" required placeholder="Hexile Web Solutions" className={inputStyle}
                  value={formData.clinicName} onChange={(e) => setFormData({ ...formData, clinicName: e.target.value })} />
              </div>
              <div>
                <label className={labelStyle}>Email Address</label>
                <input type="email" required placeholder="doctor@example.com" className={inputStyle}
                  value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>
              <div>
                <label className={labelStyle}>Account Password</label>
                <input type="text" required placeholder="Create a password" className={inputStyle}
                  value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} />
              </div>
              <div>
                <label className={labelStyle}>Mobile Number</label>
                <input type="text" placeholder="9876543210" className={inputStyle}
                  value={formData.mobile} onChange={(e) => setFormData({ ...formData, mobile: e.target.value })} />
              </div>
              <div>
                <label className={labelStyle}>Location</label>
                <input type="text" placeholder="City, State" className={inputStyle}
                  value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
              <button
                disabled={loading}
                type="submit"
                className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-8 rounded-lg transition-all active:scale-95 flex items-center gap-2 text-sm shadow-md shadow-blue-100"
              >
                {loading ? 'Processing...' : <><Send size={16} /> Save Doctor Details</>}
              </button>
            </div>
          </form>
        </div>

        {/* ── RIGHT: DOCTORS LIST ── */}
        <div className="w-full lg:w-80 flex-shrink-0">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-800">
              {isSearching ? 'Search Results' : 'Recently Added'}
            </h2>
            {!isSearching && (
              <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">LATEST 5</span>
            )}
          </div>

          {/* Search Bar */}
          <div className="relative mb-4">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search by name or email…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-lg py-2.5 pl-8 pr-9 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-700 placeholder:text-slate-400"
            />
            {isSearching && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Doctor Cards */}
          <div className="space-y-3">
            {latestDoctors.length > 0 ? (
              latestDoctors.map((doc, index) => (
                <div
                  key={doc._id || index}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 transition-colors cursor-default group"
                >
                  <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all flex-shrink-0">
                    <User size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-bold text-slate-800 truncate uppercase">{doc.name}</h4>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 truncate">
                      <Building2 size={10} className="flex-shrink-0" /> {doc.clinicName}
                    </p>
                    {isSearching && (
                      <p className="text-[10px] text-slate-400 truncate mt-0.5">{doc.email}</p>
                    )}
                  </div>

                  {/* Edit Button */}
                  <button
                    onClick={() => setEditingDoctor(doc)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-300 hover:bg-blue-50 hover:text-blue-500 transition-all flex-shrink-0"
                    title="Edit doctor"
                  >
                    <Pencil size={13} />
                  </button>
                </div>
              ))
            ) : (
              <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-xl text-center">
                <p className="text-xs text-slate-400">
                  {isSearching ? 'No doctors match your search.' : 'No doctors added yet.'}
                </p>
              </div>
            )}
          </div>
        </div>

      </div>
    </>
  );
};

export default DoctorForm;