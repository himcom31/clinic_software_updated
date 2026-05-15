import React from 'react';
import { X } from 'lucide-react';
import axios from 'axios';
const API_BAS = import.meta.env.VITE_API_URL;


const PatientFormModal = ({ 
  show, 
  onClose, 
  slug, 
  fetchPatients, 
  formData, 
  setFormData, 
  isEditing 
}) => {
  if (!show) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
        // UPDATE API CALL
        await axios.put(`${API_BAS}/api/patients/${slug}/update/${formData._id}`, formData);
        alert("Record Updated Successfully!");
      } else {
        // ADD API CALL
        await axios.post(`${API_BAS}/api/patients/${slug}/add`, { 
          ...formData, 
          clinicSlug: slug,
          doctorId: slug 
        });
        alert("Patient Added!");
      }
      
      onClose(); // Modal close logic
      fetchPatients(); // Refresh list
    } catch (err) {
      alert(err.response?.data?.message || "Something went wrong");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-lg rounded-[32px] shadow-2xl overflow-hidden border border-slate-100">
        <form onSubmit={handleSubmit}>
          <div className="p-8 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
            <h2 className="text-lg font-black text-slate-800 uppercase tracking-tight">
              {isEditing ? 'Update Record' : 'Patient Registration'}
            </h2>
            <button onClick={onClose} type="button" className="p-2 hover:bg-white shadow-sm rounded-full text-slate-400">
              <X size={20} />
            </button>
          </div>

          <div className="p-8 space-y-4">
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Full Name</label>
              <input 
                required 
                className="professional-input" 
                value={formData.name} 
                onChange={(e) => setFormData({...formData, name: e.target.value})} 
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Mobile Number</label>
                <input 
                  required 
                  className="professional-input" 
                  value={formData.mobile} 
                  onChange={(e) => setFormData({...formData, mobile: e.target.value})} 
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Age</label>
                <input 
                  required 
                  type="number" 
                  className="professional-input" 
                  value={formData.age} 
                  onChange={(e) => setFormData({...formData, age: e.target.value})} 
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Residential Address</label>
              <textarea 
                rows="2" 
                className="professional-input resize-none" 
                placeholder="Enter building name, street, city..."
                value={formData.address} 
                onChange={(e) => setFormData({...formData, address: e.target.value})} 
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Gender</label>
                  <select 
                    className="professional-input" 
                    value={formData.gender} 
                    onChange={(e) => setFormData({...formData, gender: e.target.value})}
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Other">Other</option>
                  </select>
               </div>
               <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Special Notes</label>
                  <input 
                    className="professional-input" 
                    placeholder="Allergies etc." 
                    value={formData.notes} 
                    onChange={(e) => setFormData({...formData, notes: e.target.value})} 
                  />
               </div>
            </div>
          </div>

          <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4">
            <button type="submit" className="flex-1 bg-[#18afb1] text-white py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-xl shadow-[#18afb1]/20 active:scale-95 transition-all">
              {isEditing ? 'Update Digital Record' : 'Save Digital Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default PatientFormModal;