import React, { useState, useEffect } from 'react';
import { X, Pill, Star, Info, Activity, Beaker, Save } from 'lucide-react';
import axios from 'axios';
const API_BAS = import.meta.env.VITE_API_URL;


const AddMedicineModal = ({ slug, onClose, onRefresh, editData }) => {
  const [submitting, setSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    brandName: '',
    category: 'Tablet',
    saltComposition: '',
    strength: '',
    isFavorite: false,
    instructions: '',
    unit_per_Dose: '',
    timing: '',
    duration: '',
    action: '',
    route: ''
  });
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      if (editData) {
        // EDIT MODE: PATCH request
        await axios.patch(`${API_BAS}/api/medicines/${slug}/update/${editData._id}`, formData);
      } else {
        // ADD MODE: POST request
        await axios.post(`${API_BAS}/api/medicines/${slug}/add`, formData);
      }
      onRefresh();
      onClose();
    } catch (err) { alert("Action failed!"); }
  };

  useEffect(() => {
    if (editData) {
      setFormData(editData);
    } else {
      // Reset form for Add mode
      setFormData({
        name: '', brandName: '', category: 'Tablet',
        saltComposition: '', strength: '', isFavorite: false, instructions: '',
        unit_per_Dose: '', timing: '', duration: '', action: '', route: ''
      });
    }
  }, [editData]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md">
      <div className="bg-white w-full max-w-2xl rounded-[48px] shadow-2xl border border-slate-100 overflow-hidden animate-in zoom-in-95 duration-200">

        {/* MODAL HEADER */}
        <div className="p-10 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-[#18afb1] shadow-lg shadow-slate-200">
              <Pill size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-none">New Medicine</h2>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[3px] mt-1.5">Inventory Management</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* FAVORITE TOGGLE */}
            <button
              type="button"
              onClick={() => setFormData({ ...formData, isFavorite: !formData.isFavorite })}
              className={`p-3 rounded-2xl transition-all border ${formData.isFavorite ? 'bg-amber-50 border-amber-200 text-amber-500' : 'bg-white border-slate-100 text-slate-300'}`}
            >
              <Star size={20} fill={formData.isFavorite ? "currentColor" : "none"} />
            </button>
            <button onClick={onClose} className="p-3 hover:bg-white rounded-full text-slate-300 transition-all">
              <X size={24} />
            </button>
          </div>
        </div>

        {/* FORM */}
        <form onSubmit={handleSubmit} className="p-10 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">

          <div className="grid grid-cols-2 gap-6">
            {/* NAME */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Generic Name</label>
              <input
                required
                className="professional-input"
                placeholder="e.g. Paracetamol"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>

            {/* BRAND NAME */}
            <div className="space-y-2 col-span-2 md:col-span-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Brand Name (Optional)</label>
              <input
                className="professional-input"
                placeholder="e.g. Dolo 650"
                value={formData.brandName}
                onChange={e => setFormData({ ...formData, brandName: e.target.value })}
              />
            </div>

            {/* CATEGORY */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Form / Category</label>
              <select
                className="professional-input cursor-pointer"
                value={formData.category}
                onChange={e => setFormData({ ...formData, category: e.target.value })}
              >
                <option value="Tablet">Tablet</option>
                <option value="Capsule">Capsule</option>
                <option value="Syrup">Syrup</option>
                <option value="Injection">Injection</option>
                <option value="Cream">Cream</option>
                <option value="Drops">Drops</option>
              </select>
            </div>

            {/* STRENGTH */}
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Frequency</label>
              <input
                className="professional-input"
                placeholder="e.g. 500mg"
                value={formData.strength}
                onChange={e => setFormData({ ...formData, strength: e.target.value })}
              />
            </div>
          </div>

          {/* COMPOSITION */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
              <Beaker size={12} /> Salt Composition
            </label>
            <input
              className="professional-input"
              placeholder="e.g. Acetaminophen"
              value={formData.saltComposition}
              onChange={e => setFormData({ ...formData, saltComposition: e.target.value })}
            />
          </div>

          {/* INSTRUCTIONS */}
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
              <Info size={12} /> Default Instructions
            </label>
            <textarea
              rows="2"
              className="professional-input resize-none"
              placeholder="e.g. Take after food"
              value={formData.instructions}
              onChange={e => setFormData({ ...formData, instructions: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
              <Info size={12} /> Unit Per Dose
            </label>
            <textarea
              rows="2"
              className="professional-input resize-none"
              placeholder="e.g. 1 tablet"
              value={formData.unit_per_Dose}
              onChange={e => setFormData({ ...formData, unit_per_Dose: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
              <Info size={12} /> Timing
            </label>
            <textarea
              rows="2"
              className="professional-input resize-none"
              placeholder="e.g. Take after food"
              value={formData.timing}
              onChange={e => setFormData({ ...formData, timing: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
              <Info size={12} /> Duration
            </label>
            <textarea
              rows="2"
              className="professional-input resize-none"
              placeholder="e.g. Take after food"
              value={formData.duration}
              onChange={e => setFormData({ ...formData, duration: e.target.value })}
            />
          </div>



          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
              <Info size={12} /> Action
            </label>
            <textarea
              rows="2"
              className="professional-input resize-none"
              placeholder="e.g. Take after food"
              value={formData.action}
              onChange={e => setFormData({ ...formData, action: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 flex items-center gap-1">
              <Info size={12} /> Route
            </label>
            <textarea
              rows="2"
              className="professional-input resize-none"
              placeholder="e.g. Take after food"
              value={formData.route}
              onChange={e => setFormData({ ...formData, route: e.target.value })}
            />
          </div>

          {/* SUBMIT BUTTON */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-slate-900 text-white py-6 rounded-[24px] font-black text-[11px] uppercase tracking-[4px] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70 mt-4"
          >
            {submitting ? 'Syncing...' : <><Save size={16} /> Save to Inventory</>}
          </button>
        </form>
      </div>

      <style>{`
        .professional-input {
          width: 100%; background: #f8fafc; border: 2px solid #f1f5f9; border-radius: 20px;
          padding: 16px 22px; font-size: 14px; font-weight: 800; color: #1e293b; outline: none; transition: 0.3s;
        }
        .professional-input:focus { border-color: #18afb1; background: #fff; box-shadow: 0 10px 30px -10px rgba(24, 175, 177, 0.15); }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: #f1f1f1; border-radius: 10px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #18afb1; border-radius: 10px; }
      `}</style>
    </div>
  );
};

export default AddMedicineModal;