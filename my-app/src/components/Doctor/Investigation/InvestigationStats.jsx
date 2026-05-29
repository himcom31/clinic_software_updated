import React from 'react';

const categories = ['All', 'Pathology', 'Radiology', 'Cardiology', 'Neurology', 'Other'];

const InvestigationStats = ({ tests, activeCategory, setActiveCategory }) => {
  const favCount = tests.filter(t => t.isFavorite).length;

  return (
    <div className="flex flex-col h-full">

      {/* Summary strip */}
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[10px] text-gray-400 font-medium">Total Tests</span>
          <span className="text-xs font-bold text-gray-700">{tests.length}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-gray-400 font-medium">Favourites</span>
          <span className="text-xs font-bold text-amber-500">{favCount}</span>
        </div>
      </div>

      {/* Category list */}
      <div className="flex-1 overflow-y-auto py-2">
        {categories.map((cat) => {
          const count = cat === 'All'
            ? tests.length
            : tests.filter(t => t.category === cat).length;
          const isActive = activeCategory === cat;

          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`w-full flex items-center justify-between px-4 py-2 text-left transition-colors
                ${isActive
                  ? 'bg-blue-50 border-r-2 border-blue-600 text-blue-700'
                  : 'text-gray-600 hover:bg-gray-50'
                }`}
            >
              <span className={`text-xs ${isActive ? 'font-semibold' : 'font-medium'}`}>
                {cat}
              </span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium
                ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default InvestigationStats;