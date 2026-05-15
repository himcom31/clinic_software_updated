import React from 'react';
import { Microscope, Star, Activity, Beaker } from 'lucide-react';

const InvestigationStats = ({ tests, activeCategory, setActiveCategory }) => {
  const categories = ['All', 'Pathology', 'Radiology', 'Cardiology', 'Neurology', 'Other'];
  const favCount = tests.filter(t => t.isFavorite).length;

  return (
    <div className="space-y-6">
      {/* Stats Card */}
      <div className="bg-slate-900 rounded-[32px] p-8 text-white shadow-2xl relative overflow-hidden">
        <div className="absolute -right-4 -bottom-4 opacity-10">
          <Microscope size={100} />
        </div>
        <h4 className="text-[10px] font-black uppercase tracking-[3px] text-[#18afb1] mb-6">Test Overview</h4>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-3xl font-black">{tests.length}</p>
            <p className="text-[8px] uppercase font-bold text-slate-400 tracking-widest">Total Tests</p>
          </div>
          <div>
            <p className="text-3xl font-black text-amber-400">{favCount}</p>
            <p className="text-[8px] uppercase font-bold text-slate-400 tracking-widest">Favorites</p>
          </div>
        </div>
      </div>

      {/* Categories Sidebar */}
      <div className="bg-white rounded-[32px] p-6 border border-slate-100 shadow-sm">
        <h4 className="text-[10px] font-black uppercase tracking-[3px] text-slate-400 mb-6">Specializations</h4>
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
                <Beaker size={14} /> {cat}
              </div>
              <span className={`text-[9px] ${activeCategory === cat ? 'text-white/60' : 'text-slate-300'}`}>
                {cat === 'All' ? tests.length : tests.filter(t => t.category === cat).length}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InvestigationStats;