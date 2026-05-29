import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import {
  Pill, Plus, Search, Star,
  Trash2, Edit3, Beaker, FileSpreadsheet
} from 'lucide-react';
import MedicineStats from './MedicineStats';
import AddMedicineModal from './AddMedicineModal';
import MedicineImport from './MedicineImport';

const API_BAS = import.meta.env.VITE_API_URL;

const MedicineMaster = () => {
  const { slug } = useParams();
  const [medicines, setMedicines] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showImport, setShowImport] = useState(false);
  const [editingMedicine, setEditingMedicine] = useState(null);

  const deleteMedicine = async (id) => {
    if (window.confirm("Delete this medicine from database?")) {
      try {
        const res = await axios.delete(`${API_BAS}/api/medicines/${slug}/delete/${id}`);
        if (res.data.success) {
          setMedicines(medicines.filter(med => med._id !== id));
        }
      } catch (err) {
        alert("Delete failed!");
      }
    }
  };

  const fetchMedicines = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BAS}/api/medicines/${slug}/list`);
      setMedicines(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMedicines(); }, [slug]);

  const filteredData = medicines.filter(m =>
    (activeCategory === 'All' || m.category === activeCategory) &&
    (m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.saltComposition?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800">
      <div className="flex h-screen overflow-hidden">

        {/* LEFT SIDEBAR */}
        <div className="w-56 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Categories</h2>
          </div>
          <MedicineStats
            medicines={medicines}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          />
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Top toolbar */}
          <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between gap-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Pill size={15} className="text-blue-600" />
              <span className="text-sm font-bold text-gray-700">Medicine Master</span>
              <span className="ml-2 text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                {filteredData.length} records
              </span>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded bg-gray-50 outline-none focus:border-blue-400 focus:bg-white transition-all"
                  placeholder="Search by name or salt composition..."
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowImport(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded hover:bg-emerald-100 transition-colors"
              >
                <FileSpreadsheet size={13} />
                Import Excel
              </button>
              <button
                onClick={() => { setEditingMedicine(null); setShowModal(true); }}
                className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-blue-600 border border-blue-600 rounded hover:bg-blue-700 transition-colors"
              >
                <Plus size={13} />
                Add Medicine
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-8">#</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Brand Name</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Generic / Salt</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Strength</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Category</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider">Timing</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-center">Fav</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="py-20 text-center text-xs text-gray-400">
                      Loading medicines...
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((med, index) => (
                    <tr
                      key={med._id}
                      className="hover:bg-blue-50/40 transition-colors group"
                    >
                      {/* Serial */}
                      <td className="px-4 py-2.5 text-[10px] text-gray-400">{index + 1}</td>

                      {/* Brand Name */}
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-semibold text-gray-800">{med.name}</p>
                      </td>

                      {/* Salt */}
                      <td className="px-4 py-2.5">
                        <p className="text-[11px] text-gray-500 max-w-[180px] truncate">
                          {med.saltComposition || '—'}
                        </p>
                      </td>

                      {/* Strength */}
                      <td className="px-4 py-2.5">
                        <p className="text-[11px] text-gray-500">{med.strength || '—'}</p>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          med.category === 'Tablet'    ? 'bg-blue-50 text-blue-700' :
                          med.category === 'Injection' ? 'bg-red-50 text-red-700' :
                          med.category === 'Syrup'     ? 'bg-purple-50 text-purple-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {med.category || '—'}
                        </span>
                      </td>

                      {/* Timing */}
                      <td className="px-4 py-2.5">
                        <p className="text-[11px] text-gray-500">{med.timing || '—'}</p>
                      </td>

                      {/* Favorite */}
                      <td className="px-4 py-2.5 text-center">
                        <Star
                          size={13}
                          className={med.isFavorite
                            ? "text-amber-400 fill-amber-400 mx-auto"
                            : "text-gray-200 mx-auto"}
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingMedicine(med); setShowModal(true); }}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => deleteMedicine(med._id)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-all"
                            title="Delete"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="8" className="py-20 text-center text-xs text-gray-400">
                      No medicines found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer status bar */}
          <div className="bg-white border-t border-gray-200 px-5 py-2 flex items-center justify-between flex-shrink-0">
            <p className="text-[10px] text-gray-400">
              Showing <span className="font-semibold text-gray-600">{filteredData.length}</span> of <span className="font-semibold text-gray-600">{medicines.length}</span> medicines
            </p>
            <p className="text-[10px] text-gray-400">
              Category: <span className="font-semibold text-gray-600">{activeCategory}</span>
            </p>
          </div>
        </div>
      </div>

      {/* Import Modal */}
      {showImport && (
        <MedicineImport
          slug={slug}
          onRefresh={fetchMedicines}
          onClose={() => setShowImport(false)}
        />
      )}

      {/* Add / Edit Modal */}
      {showModal && (
        <AddMedicineModal
          slug={slug}
          onClose={() => { setShowModal(false); setEditingMedicine(null); }}
          onRefresh={fetchMedicines}
          editData={editingMedicine}
        />
      )}
    </div>
  );
};

export default MedicineMaster;