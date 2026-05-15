import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Microscope, Search, Plus, Edit3, Trash2, Filter, X, SlidersHorizontal, Star } from 'lucide-react';
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
        } catch (err) { console.error(err); } finally { setLoading(false); }
    };

    useEffect(() => { fetchTests(); }, [slug]);

    const filteredData = tests.filter(t =>
        (activeCategory === 'All' || t.category === activeCategory) &&
        (t.testName.toLowerCase().includes(searchTerm.toLowerCase()) || t.shortName?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="min-h-screen bg-[#f4f7fe] p-4 md:p-8 font-sans">
            <div className="max-w-[1600px] mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8">

                {/* Left Side: Stats */}
                <div className="lg:col-span-3">
                    <InvestigationStats tests={tests} activeCategory={activeCategory} setActiveCategory={setActiveCategory} />
                </div>

                {/* Right Side: Content */}
                <div className="lg:col-span-9 space-y-6">

                    {/* Enhanced Search & Header Section */}
                    <div className="bg-white p-6 rounded-[32px] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-center gap-4 w-full md:w-auto">
                            <div className="p-3 bg-[#18afb1]/10 rounded-2xl">
                                <Microscope className="text-[#18afb1]" size={24} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none">Lab Inventory</h2>
                                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Manage Tests & Pricing</p>
                            </div>
                        </div>

                        {/* Modern Search Bar */}
                        <div className="relative w-full max-w-xl group">
                            <div className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-[#18afb1] transition-colors">
                                <Search size={20} />
                            </div>
                            <input
                                type="text"
                                className="w-full pl-14 pr-12 py-4 bg-slate-50 border-none rounded-[22px] text-sm font-bold text-slate-700 outline-none focus:ring-4 focus:ring-[#18afb1]/10 focus:bg-white transition-all shadow-inner"
                                placeholder="Search by test name, short code or category..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                            {searchTerm && (
                                <button
                                    onClick={() => setSearchTerm('')}
                                    className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"
                                >
                                    <X size={16} />
                                </button>
                            )}
                        </div>

                        <button
                            onClick={() => { setEditingTest(null); setShowModal(true); }}
                            className="w-full md:w-auto bg-slate-900 text-white px-8 py-4 rounded-[20px] font-black text-[11px] uppercase tracking-[2px] shadow-xl hover:bg-slate-800 active:scale-95 transition-all flex items-center justify-center gap-3"
                        >
                            <Plus size={18} /> Add New Test
                        </button>
                    </div>

                    {/* Table Section */}
                    <div className="bg-white rounded-[35px] border border-slate-100 shadow-sm overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead>
                                    <tr className="bg-slate-50/50 border-b border-slate-100">
                                        <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Test Name</th>
                                        <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Code</th>
                                        <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Range</th>
                                        <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Unit</th>
                                        <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Price</th>
                                        <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Fav</th>
                                        <th className="px-6 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {loading ? (
                                        <tr>
                                            <td colSpan="5" className="py-32 text-center">
                                                <div className="flex flex-col items-center gap-3">
                                                    <div className="w-10 h-10 border-4 border-slate-100 border-t-[#18afb1] rounded-full animate-spin" />
                                                    <span className="text-[10px] font-black text-slate-300 uppercase tracking-[4px]">Initializing Lab...</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredData.length > 0 ? (
                                        filteredData.map(test => (
                                            <tr key={test._id} className="group hover:bg-[#f8fafc] transition-all">
                                                <td className="px-8 py-5">
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-3 bg-white border border-slate-100 rounded-2xl text-slate-400 group-hover:border-[#18afb1]/30 group-hover:text-[#18afb1] transition-all shadow-sm">
                                                            <Microscope size={18} />
                                                        </div>
                                                        <div>
                                                            <p className="text-sm font-black text-slate-700 uppercase leading-none mb-1">{test.testName}</p>
                                                            <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">
                                                                <span className="text-[#18afb1]">{test.category}</span> • {test.sampleType || 'No Sample'}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td className="px-6 py-5 text-center">
                                                    <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-2 py-1 rounded-md">
                                                        {test.shortName || '---'}
                                                    </span>
                                                </td>

                                                {/* 5. normalRange */}
                                                <td className="px-6 py-5 text-center">
                                                    <p className="text-[11px] font-black text-slate-600">{test.normalRange}</p>
                                                </td>

                                                <td className="px-6 py-5 text-center">
                                                    <p className="text-[10px] font-bold text-slate-400 uppercase">{test.unit}</p>
                                                </td>
                                                {/* 7. price */}
                                                <td className="px-6 py-5 text-center">
                                                    <p className="text-sm font-black text-slate-900">₹{test.price}</p>
                                                </td>

                                                {/* 8. isFavorite */}
                                                <td className="px-6 py-5 text-center">
                                                    <Star
                                                        size={14}
                                                        className={test.isFavorite ? "text-amber-400 fill-amber-400 mx-auto" : "text-slate-100 mx-auto"}
                                                    />
                                                </td>

                                                <td className="px-6 py-5 text-center">
                                                    <p className="text-sm font-black text-slate-900">{test.action}</p>
                                                </td>

                                                <td className="px-6 py-5 text-right">
                                                    <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                        <button onClick={() => { setEditingTest(test); setShowModal(true); }} className="p-2 text-slate-400 hover:text-[#18afb1]">
                                                            <Edit3 size={16} />
                                                        </button>
                                                        <button className="p-2 text-slate-400 hover:text-red-500">
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                </td>

                                            </tr>
                                        ))
                                    ) : (
                                        <tr>
                                            <td colSpan="5" className="py-32 text-center">
                                                <div className="flex flex-col items-center opacity-20">
                                                    <Search size={48} className="mb-4" />
                                                    <p className="text-xs font-black uppercase tracking-[4px]">No matching tests found</p>
                                                </div>
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
            {showModal && <AddTestModal slug={slug} editData={editingTest} onClose={() => setShowModal(false)} onRefresh={fetchTests} />}
        </div>
    );
};

export default InvestigationMaster;