import React, { useState } from 'react';
import { X, Save, Sparkles, Star } from 'lucide-react';
import axios from 'axios';

const API_BAS = import.meta.env.VITE_API_URL;


const AddAdviceModal = ({ slug, onClose, onRefresh, editData }) => {
  const [formData, setFormData] = useState(editData || {
    title: '', category: 'General', isFavorite: false
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API_BAS}/api/advices/${slug}/save`, {
        ...formData,
        id: editData?._id
      });
      onRefresh();
      onClose();
    } catch (err) { alert("Error saving advice"); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
      <div className="bg-white w-full max-w-lg rounded-[40px] shadow-2xl border border-white/20 overflow-hidden animate-in zoom-in-95">
        <div className="p-8 border-b border-slate-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <Sparkles className="text-[#18afb1]" size={20} />
             <h2 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Add Advice</h2>
          </div>
          <button onClick={onClose} className="text-slate-300 hover:text-slate-600"><X size={24}/></button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Instruction Text</label>
            <textarea 
              required 
              rows="3"
              className="w-full p-5 bg-slate-50 border-2 border-transparent focus:border-[#18afb1] focus:bg-white rounded-3xl outline-none text-sm font-bold text-slate-700 transition-all resize-none"
              placeholder="e.g. Take complete bed rest for 3 days and avoid oily food."
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Category</label>
              <select 
                className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold outline-none border-2 border-transparent focus:border-[#18afb1]"
                value={formData.category}
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                <option>General</option><option>Diet</option><option>Lifestyle</option><option>Follow-up</option><option>Warning</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Pin to Quick-Add</label>
              <button 
                type="button"
                onClick={() => setFormData({...formData, isFavorite: !formData.isFavorite})}
                className={`w-full p-4 rounded-2xl flex items-center justify-center gap-2 transition-all border-2 ${formData.isFavorite ? 'bg-amber-50 border-amber-100 text-amber-600' : 'bg-slate-50 border-transparent text-slate-400'}`}
              >
                <Star size={16} className={formData.isFavorite ? 'fill-amber-500' : ''} />
                <span className="text-[10px] font-black uppercase tracking-widest">{formData.isFavorite ? 'Pinned' : 'Pin This'}</span>
              </button>
            </div>
          </div>

          <button type="submit" className="w-full bg-slate-900 text-white py-5 rounded-3xl font-black text-[11px] uppercase tracking-[4px] shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-3">
            <Save size={18} /> Save to Library
          </button>
        </form>
      </div>
    </div>
  );
};

export default AddAdviceModal;