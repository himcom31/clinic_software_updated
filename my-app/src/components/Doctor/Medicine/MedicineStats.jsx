import React from 'react';
import { Star, Pill, Box, Activity } from 'lucide-react';
const API_BAS = import.meta.env.VITE_API_URL;

const MedicineStats = ({ medicines, activeCategory, setActiveCategory }) => {
  const categories = ['All', 'Tablet', 'Capsule', 'Syrup', 'Injection', 'Cream','Drops','Other'];
  
  // Calculate counts
  const favoriteCount = medicines.filter(m => m.isFavorite).length;
  
  return (
    <div className="space-y-6">
      {/* Quick Stats Card */}
      <div className="bg-slate-900 rounded-[32px] p-6 text-white shadow-xl">
        <h4 className="text-[10px] font-black uppercase tracking-[3px] text-[#18afb1] mb-4">Inventory Summary</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 p-4 rounded-2xl">
            <p className="text-2xl font-black">{medicines.length}</p>
            <p className="text-[8px] uppercase font-bold text-slate-400">Total Items</p>
          </div>
          <div className="bg-white/5 p-4 rounded-2xl">
            <p className="text-2xl font-black text-amber-400">{favoriteCount}</p>
            <p className="text-[8px] uppercase font-bold text-slate-400">Favorites</p>
          </div>
        </div>
      </div>

      {/* Category Sidebar */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
        <h4 className="text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-6">Categories</h4>
        <div className="space-y-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-xs font-black transition-all ${
                activeCategory === cat 
                ? 'bg-[#18afb1] text-white shadow-lg shadow-[#18afb1]/20' 
                : 'text-slate-500 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <Box size={14} /> {cat}
              </div>
              <span className={`text-[10px] ${activeCategory === cat ? 'text-white/60' : 'text-slate-300'}`}>
                {cat === 'All' ? medicines.length : medicines.filter(m => m.category === cat).length}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MedicineStats;