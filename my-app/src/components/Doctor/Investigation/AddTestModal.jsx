import React, { useState, useEffect } from 'react';
import {
  X, Save, Microscope, IndianRupee, Activity,
  Zap, Beaker, Layers, Star, CheckCircle2
} from 'lucide-react';
import axios from 'axios';
const API_BAS = import.meta.env.VITE_API_URL;


const AddTestModal = ({ slug, onClose, onRefresh, editData }) => {
  const [formData, setFormData] = useState(editData || {
    testName: '', shortName: '', category: 'Pathology',
    sampleType: '', normalRange: '', unit: '', price: '',
    action: '',
    isFavorite: false // Add Favorite field
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BAS}/api/investigations/${slug}/save`, {
        ...formData,
        id: editData?._id
      });
      onRefresh();
      onClose();
    } catch (err) { alert("Bhai, save karne mein error aaya!"); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-[12px] animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-2xl rounded-[50px] shadow-[0_30px_100px_-20px_rgba(0,0,0,0.3)] border border-white/20 overflow-hidden animate-in zoom-in-95 duration-300">

        {/* Header Section - Sleek Design */}
        <div className="px-12 py-10 border-b border-slate-50 flex justify-between items-center bg-gradient-to-br from-slate-50 to-white">
          <div className="flex items-center gap-5">
            <div className="w-14 h-14 bg-[#18afb1] rounded-[22px] flex items-center justify-center text-white shadow-[0_15px_30px_-5px_rgba(24,175,177,0.4)] rotate-3">
              <Microscope size={28} />
            </div>
            <div>
              <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tighter leading-tight">
                {editData ? 'Modify Test' : 'Setup Investigation'}
              </h2>
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-[2px] mt-1">Laboratory Parameter Config</p>
            </div>
          </div>
          <button onClick={onClose} className="w-12 h-12 bg-white border border-slate-100 flex items-center justify-center rounded-2xl text-slate-300 hover:text-red-500 hover:border-red-100 hover:shadow-xl hover:shadow-red-500/10 transition-all">
            <X size={24} />
          </button>
        </div>

        {/* Form Body - Premium Inputs */}
        <form onSubmit={handleSubmit} className="p-12 space-y-8 max-h-[70vh] overflow-y-auto custom-scrollbar bg-white">

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-8">

            {/* Test Basic Info Section */}
            <div className="col-span-2 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-4 w-1 bg-[#18afb1] rounded-full"></div>
                <span className="text-[11px] font-black text-slate-400 uppercase tracking-[3px]">General Information</span>
              </div>

              {/* --- FAVORITE TOGGLE --- */}
              <button
                type="button"
                onClick={() => setFormData({ ...formData, isFavorite: !formData.isFavorite })}
                className={`flex items-center gap-2 px-4 py-2 rounded-full border transition-all ${formData.isFavorite ? 'bg-amber-50 border-amber-200 text-amber-600 shadow-sm' : 'bg-slate-50 border-slate-100 text-slate-400'}`}
              >
                <Star size={14} className={formData.isFavorite ? 'fill-amber-500' : ''} />
                <span className="text-[10px] font-black uppercase tracking-widest">{formData.isFavorite ? 'Featured' : 'Mark Favorite'}</span>
              </button>
            </div>

            <div className="space-y-3 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-[#18afb1] transition-colors">Investigation Name</label>
              <div className="relative">
                <Activity className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#18afb1] transition-all" size={18} />
                <input required className="premium-input" placeholder="e.g. Thyroid Profile" value={formData.testName} onChange={e => setFormData({ ...formData, testName: e.target.value })} />
              </div>
            </div>

            <div className="space-y-3 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 group-focus-within:text-[#18afb1] transition-colors">Test Code / Alias</label>
              <div className="relative">
                <Zap className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-[#18afb1] transition-all" size={18} />
                <input className="premium-input" placeholder="e.g. TFT" value={formData.shortName} onChange={e => setFormData({ ...formData, shortName: e.target.value })} />
              </div>
            </div>

            <div className="space-y-3 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Department</label>
              <div className="relative">
                <Layers className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <select className="premium-input appearance-none cursor-pointer" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })}>
                  <option>Pathology</option><option>Radiology</option><option>Cardiology</option><option>Neurology</option><option>Other</option>
                </select>
              </div>
            </div>

            <div className="space-y-3 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Sample Requirement</label>
              <div className="relative">
                <Beaker className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                <input className="premium-input" placeholder="e.g. Serum / EDTA Blood" value={formData.sampleType} onChange={e => setFormData({ ...formData, sampleType: e.target.value })} />
              </div>
            </div>

            {/* Diagnostic Values */}
            <div className="col-span-2 flex items-center gap-3 mt-4">
              <div className="h-4 w-1 bg-[#18afb1] rounded-full"></div>
              <span className="text-[11px] font-black text-slate-400 uppercase tracking-[3px]">Reference & Unit Parameters</span>
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Ref. Normal Range</label>
              <input className="premium-input no-icon" placeholder="e.g. 0.45 - 4.50" value={formData.normalRange} onChange={e => setFormData({ ...formData, normalRange: e.target.value })} />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Lab Unit</label>
              <input className="premium-input no-icon" placeholder="e.g. µIU/mL" value={formData.unit} onChange={e => setFormData({ ...formData, unit: e.target.value })} />
            </div>

            <div className="space-y-3">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Action</label>
              <input className="premium-input no-icon" placeholder="e.g. Fasting" value={formData.action} onChange={e => setFormData({ ...formData, action: e.target.value })} />
            </div>

            <div className="col-span-2 space-y-3 group">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1 text-[#18afb1]">Patient Billing Price (INR)</label>
              <div className="relative">
                <IndianRupee className="absolute left-6 top-1/2 -translate-y-1/2 text-[#18afb1]" size={20} />
                <input type="number" className="premium-input pl-14 font-mono text-xl text-slate-800 border-[#18afb1]/20 focus:border-[#18afb1] bg-slate-50/50" placeholder="0.00" value={formData.price} onChange={e => setFormData({ ...formData, price: e.target.value })} />
              </div>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="pt-10 flex gap-6">
            <button type="button" onClick={onClose} className="flex-1 py-5 rounded-[25px] font-black text-[11px] uppercase tracking-[2px] text-slate-400 hover:bg-slate-50 transition-all">
              Discard
            </button>
            <button type="submit" className="flex-[2] bg-slate-900 text-white py-5 rounded-[25px] font-black text-[11px] uppercase tracking-[4px] shadow-[0_20px_40px_-10px_rgba(0,0,0,0.2)] active:scale-95 hover:shadow-none transition-all flex items-center justify-center gap-3 group">
              <CheckCircle2 size={20} className="text-[#18afb1] group-hover:scale-110 transition-transform" />
              {editData ? 'Update Records' : 'Finalize Test'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .premium-input {
          width: 100%;
          background: #ffffff;
          border: 2px solid #f1f5f9;
          border-radius: 22px;
          padding: 18px 20px 18px 52px;
          font-size: 14px;
          font-weight: 700;
          color: #1e293b;
          outline: none;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .premium-input.no-icon {
          padding-left: 24px;
        }
        .premium-input:focus {
          border-color: #18afb1;
          background: #fff;
          box-shadow: 0 10px 25px -5px rgba(24, 175, 177, 0.1);
          transform: translateY(-1px);
        }
        .premium-input::placeholder {
          color: #cbd5e1;
          font-weight: 500;
          text-transform: none;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #f1f5f9;
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default AddTestModal;