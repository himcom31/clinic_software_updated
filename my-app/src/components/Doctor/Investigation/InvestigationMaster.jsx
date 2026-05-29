import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Microscope, Search, Plus, Edit3, Trash2, Star, X } from 'lucide-react';
import InvestigationStats from './InvestigationStats';
import AddTestModal from './AddTestModal';

const API_BAS = import.meta.env.VITE_API_URL;

const InvestigationMaster = () => {
  const { slug } = useParams();
  const [tests, setTests] = useState([]);
  const [activeCategory, setActiveCategory] = useState('All');
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTest, setEditingTest] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchTests = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BAS}/api/investigations/${slug}/list`);
      setTests(res.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTests(); }, [slug]);

  const filteredData = tests.filter(t =>
    (activeCategory === 'All' || t.category === activeCategory) &&
    (t.testName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.shortName?.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const deleteTest = async (id) => {
    if (window.confirm("Delete this test?")) {
      try {
        await axios.delete(`${API_BAS}/api/investigations/${slug}/delete/${id}`);
        setTests(tests.filter(t => t._id !== id));
      } catch (err) {
        alert("Delete failed!");
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-slate-800">
      <div className="flex h-screen overflow-hidden">

        {/* LEFT SIDEBAR */}
        <div className="w-56 flex-shrink-0 bg-white border-r border-gray-200 overflow-y-auto">
          <div className="p-4 border-b border-gray-100">
            <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest">Categories</h2>
          </div>
          <InvestigationStats
            tests={tests}
            activeCategory={activeCategory}
            setActiveCategory={setActiveCategory}
          />
        </div>

        {/* MAIN CONTENT */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Top toolbar */}
          <div className="bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between gap-4 flex-shrink-0">
            <div className="flex items-center gap-2">
              <Microscope size={15} className="text-blue-600" />
              <span className="text-sm font-bold text-gray-700">Investigation Master</span>
              <span className="ml-2 text-[10px] font-semibold text-gray-400 bg-gray-100 px-2 py-0.5 rounded">
                {filteredData.length} records
              </span>
            </div>

            <div className="flex items-center gap-2 flex-1 max-w-md">
              <div className="relative flex-1">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  className="w-full pl-8 pr-8 py-1.5 text-xs border border-gray-200 rounded bg-gray-50 outline-none focus:border-blue-400 focus:bg-white transition-all"
                  placeholder="Search by test name or code..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button
                    onClick={() => setSearchTerm('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            </div>

            <button
              onClick={() => { setEditingTest(null); setShowModal(true); }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-semibold text-white bg-blue-600 border border-blue-600 rounded hover:bg-blue-700 transition-colors"
            >
              <Plus size={13} />
              Add Test
            </button>
          </div>

          {/* Table — no horizontal scroll, fixed columns */}
          <div className="flex-1 overflow-y-auto overflow-x-hidden">
            <table className="w-full text-left border-collapse table-fixed">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-100 border-b border-gray-200">
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-8">#</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[28%]">Test Name</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[12%]">Code</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[12%]">Category</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[12%]">Normal Range</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[8%]">Unit</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[10%]">Price</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[8%]">Action</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[6%] text-center">Fav</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-gray-500 uppercase tracking-wider w-[10%] text-right">Edit</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-100">
                {loading ? (
                  <tr>
                    <td colSpan="10" className="py-20 text-center text-xs text-gray-400">
                      Loading tests...
                    </td>
                  </tr>
                ) : filteredData.length > 0 ? (
                  filteredData.map((test, index) => (
                    <tr key={test._id} className="hover:bg-blue-50/40 transition-colors group">

                      {/* Serial */}
                      <td className="px-4 py-2.5 text-[10px] text-gray-400">{index + 1}</td>

                      {/* Test Name */}
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-semibold text-gray-800 truncate">{test.testName}</p>
                        {test.sampleType && (
                          <p className="text-[10px] text-gray-400 truncate">{test.sampleType}</p>
                        )}
                      </td>

                      {/* Code */}
                      <td className="px-4 py-2.5">
                        <span className="text-[10px] font-mono text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                          {test.shortName || '—'}
                        </span>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-2.5">
                        <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-semibold ${
                          test.category === 'Pathology'   ? 'bg-blue-50 text-blue-700' :
                          test.category === 'Radiology'   ? 'bg-purple-50 text-purple-700' :
                          test.category === 'Cardiology'  ? 'bg-red-50 text-red-700' :
                          test.category === 'Neurology'   ? 'bg-amber-50 text-amber-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {test.category || '—'}
                        </span>
                      </td>

                      {/* Normal Range */}
                      <td className="px-4 py-2.5">
                        <p className="text-[11px] text-gray-600 truncate">{test.normalRange || '—'}</p>
                      </td>

                      {/* Unit */}
                      <td className="px-4 py-2.5">
                        <p className="text-[11px] text-gray-500 truncate">{test.unit || '—'}</p>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-2.5">
                        <p className="text-xs font-semibold text-gray-800">
                          {test.price ? `₹ ${test.price}` : '—'}
                        </p>
                      </td>

                      {/* Action notes */}
                      <td className="px-4 py-2.5">
                        <p className="text-[11px] text-gray-500 truncate">{test.action || '—'}</p>
                      </td>

                      {/* Favorite */}
                      <td className="px-4 py-2.5 text-center">
                        <Star
                          size={13}
                          className={test.isFavorite
                            ? "text-amber-400 fill-amber-400 mx-auto"
                            : "text-gray-200 mx-auto"}
                        />
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-2.5 text-right">
                        <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => { setEditingTest(test); setShowModal(true); }}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-all"
                            title="Edit"
                          >
                            <Edit3 size={13} />
                          </button>
                          <button
                            onClick={() => deleteTest(test._id)}
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
                    <td colSpan="10" className="py-20 text-center text-xs text-gray-400">
                      No tests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Footer status bar */}
          <div className="bg-white border-t border-gray-200 px-5 py-2 flex items-center justify-between flex-shrink-0">
            <p className="text-[10px] text-gray-400">
              Showing <span className="font-semibold text-gray-600">{filteredData.length}</span> of{' '}
              <span className="font-semibold text-gray-600">{tests.length}</span> tests
            </p>
            <p className="text-[10px] text-gray-400">
              Category: <span className="font-semibold text-gray-600">{activeCategory}</span>
            </p>
          </div>
        </div>
      </div>

      {showModal && (
        <AddTestModal
          slug={slug}
          editData={editingTest}
          onClose={() => { setShowModal(false); setEditingTest(null); }}
          onRefresh={fetchTests}
        />
      )}
    </div>
  );
};

export default InvestigationMaster;