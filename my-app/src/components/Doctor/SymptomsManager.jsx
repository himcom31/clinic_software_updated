import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Activity, ChevronDown, Check } from 'lucide-react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
const API_BAS = import.meta.env.VITE_API_URL;


const SymptomsManager = () => {
    const { slug } = useParams();

    const [searchTerm, setSearchTerm] = useState('');
    const [category, setCategory] = useState('General');
    const [showAddForm, setShowAddForm] = useState(false);
    const [suggestions, setSuggestions] = useState([]);
    const [popularSymptoms, setPopularSymptoms] = useState([]);
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);

    // Categories ki list (Aap ise badha sakte hain)
    const categories = ['General', 'Respiratory', 'Cardiac', 'Neurology', 'ENT', 'Orthopedic', 'Pediatric'];

    useEffect(() => { fetchPopular(); }, [slug]);

    const fetchPopular = async () => {
        const res = await axios.get(`${API_BAS}/api/symptoms/${slug}`);
        if (res.data.success) setPopularSymptoms(res.data.data.slice(0, 10));
    };

    const handleAddClick = async () => {
        if (!searchTerm.trim()) return;

        try {
            // Backend call with Name and Category
            const res = await axios.post(`${API_BAS}/api/symptoms/${slug}/add`, { 
                name: searchTerm.trim(), 
                category: category 
            });

            if (res.data.success) {
                if (!selectedSymptoms.includes(searchTerm.trim())) {
                    setSelectedSymptoms([...selectedSymptoms, searchTerm.trim()]);
                }
                setSearchTerm('');
                setShowAddForm(false); // Form close karo
                fetchPopular(); // List refresh karo
            }
        } catch (err) {
            console.error("Add failed", err);
        }
    };

    return (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-5">
            {/* Header */}
            <div className="flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="p-2.5 bg-blue-600 rounded-2xl text-white shadow-lg shadow-blue-100"><Activity size={18}/></div>
                    <h3 className="text-sm font-black text-slate-800 uppercase">Chief Complaints</h3>
                </div>
            </div>

            {/* Search & Add Section */}
            <div className="space-y-3">
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 p-4 pl-12 rounded-2xl text-xs font-bold outline-none focus:border-blue-600 transition-all"
                            placeholder="Type symptom name..."
                            value={searchTerm}
                            onChange={(e) => {
                                setSearchTerm(e.target.value);
                                if(e.target.value.length > 0) setShowAddForm(true);
                                else setShowAddForm(false);
                            }}
                        />
                    </div>
                </div>

                {/* --- Dynamic Add Option (Only shows when typing) --- */}
                {showAddForm && (
                    <div className="bg-slate-900 p-4 rounded-2xl flex flex-wrap items-center gap-3 animate-in slide-in-from-top-2 duration-300">
                        <div className="flex-1">
                            <p className="text-[9px] text-slate-400 font-black uppercase mb-1">Select Category for "{searchTerm}"</p>
                            <select 
                                value={category}
                                onChange={(e) => setCategory(e.target.value)}
                                className="w-full bg-slate-800 text-white border-none rounded-xl p-2 text-xs font-bold outline-none cursor-pointer"
                            >
                                {categories.map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                        </div>
                        <button 
                            onClick={handleAddClick}
                            className="bg-blue-600 text-white px-5 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-blue-500 flex items-center gap-2 transition-all"
                        >
                            <Plus size={14}/> Add to Records
                        </button>
                    </div>
                )}
            </div>

            {/* Selected Symptoms Pills */}
            <div className="flex flex-wrap gap-2">
                {selectedSymptoms.map((s, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-slate-100 text-slate-700 px-4 py-2.5 rounded-2xl text-[11px] font-black uppercase tracking-tight border border-slate-200">
                        {s}
                        <X size={14} className="cursor-pointer hover:text-red-500" onClick={() => setSelectedSymptoms(selectedSymptoms.filter(item => item !== s))}/>
                    </div>
                ))}
            </div>

            {/* Popular/Quick Add */}
            <div className="pt-4 border-t border-slate-50">
                <p className="text-[9px] font-black text-slate-400 uppercase mb-3 tracking-widest">Common Symptoms</p>
                <div className="flex flex-wrap gap-2">
                    {popularSymptoms.map((s) => (
                        <button
                            key={s._id}
                            onClick={() => !selectedSymptoms.includes(s.name) && setSelectedSymptoms([...selectedSymptoms, s.name])}
                            className="px-3 py-2 rounded-xl border border-slate-100 text-[10px] font-bold text-slate-500 hover:bg-blue-50 hover:text-blue-600 transition-all"
                        >
                            {s.name} <span className="text-[8px] opacity-50 ml-1">({s.category})</span>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default SymptomsManager;