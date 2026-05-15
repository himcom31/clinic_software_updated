import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Send, User, Building2, Calendar, ChevronRight } from 'lucide-react';
const API_BAS = import.meta.env.VITE_API_URL;


const DoctorForm = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', clinicName: '', address: '', mobile: '', password: ''
  });
  const [latestDoctors, setLatestDoctors] = useState([]);
  const [loading, setLoading] = useState(false);

  // 1. Latest 5 Doctors Fetch Karne ka Function
  const fetchLatestDoctors = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`${API_BAS}/api/doctors/all`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const latestFour = res.data.reverse().slice(0, 5);
      setLatestDoctors(latestFour); // Maan lete hain backend se latest 5 mil rahe hain
    } catch (err) {
      console.error("Error fetching doctors", err);
    }
  };

  useEffect(() => {
    fetchLatestDoctors();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post(`${API_BAS}/api/doctors/create`, formData, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert(`Success: Doctor registered successfully!`);
      setFormData({ name: '', email: '', clinicName: '', address: '', mobile: '', password: '' });
      fetchLatestDoctors(); // List refresh karne ke liye
    } catch (err) {
      alert(err.response?.data?.message || "Error creating doctor");
    }
    setLoading(false);
  };

  const inputStyle = "w-full bg-white border border-slate-200 rounded-lg py-2.5 px-4 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all text-slate-700 text-sm placeholder:text-slate-400";
  const labelStyle = "text-sm font-semibold text-slate-700 mb-1.5 block";

  return (
    <div className="flex flex-col lg:flex-row gap-8 items-start animate-in fade-in duration-500">
      
      {/* LEFT: FORM SECTION */}
      <div className="w-full lg:max-w-xl">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-800">Add New Doctor</h1>
        </div>

        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-xl border border-slate-200 shadow-sm">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className={labelStyle}>Full Name</label>
              <input type="text" required placeholder="Dr. Himanshu Chaudhary" className={inputStyle}
                value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} />
            </div>
            <div>
              <label className={labelStyle}>Clinic Name</label>
              <input type="text" required placeholder="Hexile Web Solutions" className={inputStyle}
                value={formData.clinicName} onChange={(e) => setFormData({...formData, clinicName: e.target.value})} />
            </div>
            <div>
              <label className={labelStyle}>Email Address</label>
              <input type="email" required placeholder="doctor@example.com" className={inputStyle}
                value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} />
            </div>
            <div>
              <label className={labelStyle}>Account Password</label>
              <input type="text" required placeholder="Create a password" className={inputStyle}
                value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} />
            </div>
            <div>
              <label className={labelStyle}>Mobile Number</label>
              <input type="text" placeholder="9876543210" className={inputStyle}
                value={formData.mobile} onChange={(e) => setFormData({...formData, mobile: e.target.value})} />
            </div>
            <div>
              <label className={labelStyle}>Location</label>
              <input type="text" placeholder="City, State" className={inputStyle}
                value={formData.address} onChange={(e) => setFormData({...formData, address: e.target.value})} />
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
            <button 
              disabled={loading} 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 px-8 rounded-lg transition-all active:scale-95 flex items-center gap-2 text-sm shadow-md shadow-blue-100"
            >
              {loading ? 'Processing...' : <><Send size={16}/> Save Doctor Details</>}
            </button>
          </div>
        </form>
      </div>

      {/* RIGHT: LATEST DOCTORS LIST (New Section) */}
      <div className="w-full lg:w-80 flex-shrink-0">
        <div className="mb-6 flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-800">Recently Added</h2>
          <span className="text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-bold">LATEST 5</span>
        </div>

        <div className="space-y-3">
          {latestDoctors.length > 0 ? (
            latestDoctors.map((doc, index) => (
              <div key={index} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4 hover:border-blue-300 transition-colors cursor-default group">
                <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <User size={18} />
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="text-sm font-bold text-slate-800 truncate uppercase">{doc.name}</h4>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1">
                    <Building2 size={10} /> {doc.clinicName}
                  </p>
                </div>
                <ChevronRight size={14} className="text-slate-300" />
              </div>
            ))
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 p-8 rounded-xl text-center">
              <p className="text-xs text-slate-400">No doctors added yet.</p>
            </div>
          )}
          
          {/* <button className="w-full py-3 text-[11px] font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-all uppercase tracking-widest mt-2"> */}
            {/* View All Clinics */}
          {/* </button> */}
        </div>
      </div>

    </div>
  );
};

export default DoctorForm;