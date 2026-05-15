import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams,Link } from 'react-router-dom';
import { 
  Pill, Plus, Search, Star, MoreVertical, 
  Trash2, Edit3, Beaker, Zap, Filter,Upload,FileSpreadsheet,CheckCircle2,AlertCircle,X,ArrowUpRight
} from 'lucide-react';
import MedicineStats from './MedicineStats';
import AddMedicineModal from './AddMedicineModal';
//import * as XLSX from 'xlsx'; // Excel read karne ke liye
import MedicineImport from './MedicineImport';
const API_BAS = import.meta.env.VITE_API_URL;


const MedicineMaster = () => {
  const { slug } = useParams();
  const [medicines, setMedicines] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
const [showImport,setShowImport]=useState(false);
const [editingMedicine, setEditingMedicine] = useState(null);

const deleteMedicine = async (id) => {
  if (window.confirm("delete from database")) {
    try {
      const res = await axios.delete(`${API_BAS}/api/medicines/${slug}/delete/${id}`);
      if (res.data.success) {
        // Bina page refresh kiye list se hatane ke liye
        setMedicines(medicines.filter(med => med._id !== id));
      }
    } catch (err) {
      alert("Delete failed! Check Console ");
    }
  }
};
  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BAS}/api/medicines/${slug}/list`);
      setMedicines(res.data.data);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  useEffect(() => { fetchMedicines(); }, [slug]);

  const filteredData = medicines.filter(m => 
    (activeCategory === 'All' || m.category === activeCategory) &&
    (m.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
     m.saltComposition?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] p-6 md:p-10 font-sans text-slate-900">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* LEFT: STATS & CATEGORIES */}
        <div className="lg:col-span-3">
          <MedicineStats 
            medicines={medicines} 
            activeCategory={activeCategory} 
            setActiveCategory={setActiveCategory} 
          />
        </div>

        {/* RIGHT: MAIN TABLE LIST */}
        <div className="lg:col-span-9">
          {/* Header & Search */}
          <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
            <div className="relative flex-1 w-full max-w-md">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
              <input 
                className="w-full pl-12 pr-4 py-4 bg-white border border-slate-100 rounded-[22px] text-xs font-bold outline-none focus:ring-4 focus:ring-[#18afb1]/5 transition-all shadow-sm" 
                placeholder="Search by name or salt composition..."
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          <div>
    {/* Button to open import */}
<button 
  onClick={() => setShowImport(true)} 
  className="flex items-center gap-2 px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-emerald-200 transition-all active:scale-95 group"
>
  {/* Excel Icon */}
  <div className="bg-white/20 p-1.5 rounded-lg group-hover:scale-110 transition-transform">
    <FileSpreadsheet size={18} className="text-white" />
  </div>
  
  <span>Import from Excel</span>
  
  {/* Chota arrow icon professional look ke liye */}
  <ArrowUpRight size={14} className="opacity-50 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
</button>    {/* YAHAN SE PROPS PASS HO RAHE HAIN */}
    
    {showImport && (
      <MedicineImport 
        slug={slug}                   // 1. Slug bhej diya
        onRefresh={fetchMedicines}    // 2. Refresh function bhej diya 
        onClose={() => setShowImport(false)} // 3. Close function bhej 
      />
    )}
  </div>

            <button 
              onClick={() => setShowModal(true)} 
              className="w-full md:w-auto bg-slate-900 text-white px-10 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-2xl hover:shadow-slate-300 transition-all active:scale-95 flex items-center justify-center gap-2"
            >
              <Plus size={16} /> Add New Medicine
            </button>
          </div>

          {/* TABLE CONTAINER */}
          <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Medicine Name</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Salt & Composition</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Category</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Fav</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="py-24 text-center">
                        <div className="flex flex-col items-center">
                          <div className="w-12 h-12 border-4 border-slate-100 border-t-[#18afb1] rounded-full animate-spin mb-4" />
                          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[4px]">Fetching Inventory...</p>
                        </div>
                      </td>
                    </tr>
                  ) : filteredData.length > 0 ? (
                    filteredData.map((med) => (
                      <tr key={med._id} className="group hover:bg-[#fcfdfe] transition-all">
                        {/* 1. Name & Strength */}
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-slate-50 rounded-xl text-[#18afb1] group-hover:bg-[#18afb1] group-hover:text-white transition-all">
                              <Pill size={18} />
                            </div>
                            <div>
                              <p className="text-sm font-black text-slate-800 uppercase leading-none mb-1">{med.name}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{med.strength || 'N/A'}</p>
                            </div>
                          </div>
                        </td>

                        {/* 2. Salt Composition */}
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-2 max-w-[200px]">
                            <Beaker size={12} className="text-slate-300 shrink-0" />
                            <p className="text-[10px] font-bold text-slate-500 uppercase truncate leading-tight">
                              {med.saltComposition || 'No Salt Info'}
                            </p>
                          </div>
                        </td>

                        {/* 3. Category Badge */}
                        <td className="px-8 py-6 text-center">
                          <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                            med.category === 'Tablet' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                            med.category === 'Injection' ? 'bg-red-50 text-red-600 border-red-100' :
                            'bg-slate-50 text-slate-500 border-slate-100'
                          }`}>
                            {med.category}
                          </span>
                        </td>

                        {/* 4. Favorite Status */}
                        <td className="px-8 py-6 text-center">
                          <Star 
                            size={16} 
                            className={med.isFavorite ? "text-amber-400 fill-amber-400 mx-auto" : "text-slate-100 mx-auto"} 
                          />
                        </td>

                        {/* 5. Actions */}
                        <td className="px-8 py-6 text-right">
                          <div className="flex justify-end gap-2">
                            <button  onClick={() => {
    setEditingMedicine(med); // Purana data pass kar diya
    setShowModal(true);      // Modal khol diya
  }} className="p-2 text-slate-300 hover:text-slate-600 hover:bg-slate-50 rounded-lg transition-all">
                              <Edit3 size={16} />
                            </button>
                            <button onClick={() => deleteMedicine(med._id)} className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-40 text-center">
                        <p className="text-[10px] font-black text-slate-200 uppercase tracking-[6px]">No Medicines Found</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {showModal && <AddMedicineModal slug={slug} onClose={() => {
      setShowModal(false);
      setEditingMedicine(null); // Close par data clear
    }}
     onRefresh={fetchMedicines}
     editData={editingMedicine} />}
      
      <style>{`
        .professional-input {
          width: 100%; background: #f8fafc; border: 2px solid #f1f5f9; border-radius: 20px;
          padding: 16px 22px; font-size: 14px; font-weight: 800; color: #1e293b; outline: none; transition: 0.3s;
        }
        .professional-input:focus { border-color: #18afb1; background: #fff; box-shadow: 0 10px 30px -10px rgba(24, 175, 177, 0.15); }
      `}</style>
    </div>
  );
};

export default MedicineMaster;