import React, { useState, useEffect } from 'react';
import { MessageSquare, Search, Plus, Sparkles, Star, Trash2, Edit3, Bookmark } from 'lucide-react';
import axios from 'axios';
import AddAdviceModal from './AddAdviceModal';
const API_BAS = import.meta.env.VITE_API_URL;


const AdviceMaster = ({ slug }) => {
    const [advices, setAdvices] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [activeTab, setActiveTab] = useState('All');
    const [showModal, setShowModal] = useState(false);
    const [editingData, setEditingData] = useState(null);

    const categories = ['All', 'Diet', 'Lifestyle', 'Follow-up', 'General'];

    const handleDelete = async (id) => {
        // 1. Confirm karein (User safety ke liye)
        if (!window.confirm("Are you sure you want to delete this advice?")) return;

        try {
            // 2. Backend ko request bhejein
            // Dhyan rakhein ki URL wahi ho jo humne backend routes mein likha hai
            const res = await axios.delete(`${API_BAS}/api/advices/${slug}/delete/${id}`);

            if (res.data.success) {
                // 3. Sabse Important: State update karna
                // Isse screen se wo card turant gayab ho jayega bina page refresh kiye
                setAdvices(prevAdvices => prevAdvices.filter(item => item._id !== id));

                // Optional: Success message
                alert("Advice deleted!");
            }
        } catch (err) {
            console.error("Delete Error:", err);
            alert(err.response?.data?.message || "Failed to delete advice!");
        }
    };

    const fetchAdvices = async () => {
        const res = await axios.get(`${API_BAS}/api/advices/${slug}/list`);
        setAdvices(res.data.data);
    };

    useEffect(() => { fetchAdvices(); }, [slug]);

    const filtered = advices.filter(a =>
        (activeTab === 'All' || a.category === activeTab) &&
        a.title.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="min-h-screen bg-[#f4f7fe] p-4 md:p-10 font-sans">
            <div className="max-w-6xl mx-auto">

                {/* Header Section */}
                <div className="flex flex-col md:flex-row justify-between items-end mb-10 gap-6">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-[#18afb1] shadow-xl">
                                <MessageSquare size={20} />
                            </div>
                            <h1 className="text-3xl font-black text-slate-800 tracking-tighter uppercase">Advice Library</h1>
                        </div>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[3px] ml-1">Pre-defined patient instructions</p>
                    </div>

                    <button
                        onClick={() => { setEditingData(null); setShowModal(true); }}
                        className="group bg-[#18afb1] text-white px-8 py-4 rounded-2xl font-black text-[11px] uppercase tracking-widest shadow-lg shadow-[#18afb1]/30 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                    >
                        <Plus size={18} /> Add New Instruction
                    </button>
                </div>

                {/* Search & Tabs Logic */}
                <div className="bg-white p-4 rounded-[30px] shadow-sm border border-slate-100 mb-8 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input
                            className="w-full pl-14 pr-6 py-4 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none focus:ring-2 focus:ring-[#18afb1]/20 transition-all"
                            placeholder="Search instructions (e.g. Bed rest, Drink water...)"
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <div className="flex gap-2 p-1 bg-slate-50 rounded-2xl overflow-x-auto w-full md:w-auto">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setActiveTab(cat)}
                                className={`px-6 py-3 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${activeTab === cat ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Advice Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filtered.map((advice) => (
                        <div key={advice._id} className="group bg-white p-6 rounded-[32px] border border-slate-100 hover:border-[#18afb1]/30 hover:shadow-xl hover:shadow-slate-200/50 transition-all relative overflow-hidden">
                            <div className="flex justify-between items-start mb-4">
                                <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest ${advice.category === 'Diet' ? 'bg-green-50 text-green-600' :
                                        advice.category === 'Warning' ? 'bg-red-50 text-red-600' : 'bg-slate-50 text-slate-500'
                                    }`}>
                                    {advice.category}
                                </span>
                                <Star size={16} className={advice.isFavorite ? "text-amber-400 fill-amber-400" : "text-slate-100"} />
                            </div>

                            <h3 className="text-sm font-black text-slate-700 leading-snug mb-6 group-hover:text-slate-900 transition-colors">
                                "{advice.title}"
                            </h3>

                            <div className="flex justify-between items-center pt-4 border-t border-slate-50 opacity-0 group-hover:opacity-100 transition-all">
                                <div className="flex gap-1">
                                    <button onClick={() => { setEditingData(advice); setShowModal(true); }} className="p-2 text-slate-300 hover:text-[#18afb1] hover:bg-[#18afb1]/5 rounded-lg transition-all"><Edit3 size={14} /></button>
                                    <button
                                        onClick={() => handleDelete(advice._id)} // Direct function call with ID
                                        className="p-2 text-slate-300 hover:text-rose-500"
                                    >
                                        <Trash2 size={15} />
                                    </button>         </div>
                                <button className="text-[9px] font-black uppercase text-slate-400 flex items-center gap-1">
                                    <Bookmark size={10} /> Usage: 124
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {showModal && <AddAdviceModal slug={slug} editData={editingData} onClose={() => setShowModal(false)} onRefresh={fetchAdvices} />}
        </div>
    );
};

export default AdviceMaster;