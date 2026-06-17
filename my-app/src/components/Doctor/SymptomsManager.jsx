import React, { useState, useEffect, useRef } from 'react';
import { Search, Plus, X, Activity, Check, AlertCircle, Loader2, Tag } from 'lucide-react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const API_BAS = import.meta.env.VITE_API_URL;

const CATEGORIES = [
    'General', 'Respiratory', 'Cardiac', 'Neurology',
    'ENT', 'Orthopedic', 'Pediatric', 'Gastrointestinal',
    'Dermatology', 'Urological',
];

const CATEGORY_COLORS = {
    General:          { bg: 'bg-slate-100',   text: 'text-slate-600',   dot: 'bg-slate-400'   },
    Respiratory:      { bg: 'bg-sky-100',     text: 'text-sky-700',     dot: 'bg-sky-400'     },
    Cardiac:          { bg: 'bg-red-100',     text: 'text-red-700',     dot: 'bg-red-400'     },
    Neurology:        { bg: 'bg-purple-100',  text: 'text-purple-700',  dot: 'bg-purple-400'  },
    ENT:              { bg: 'bg-amber-100',   text: 'text-amber-700',   dot: 'bg-amber-400'   },
    Orthopedic:       { bg: 'bg-orange-100',  text: 'text-orange-700',  dot: 'bg-orange-400'  },
    Pediatric:        { bg: 'bg-pink-100',    text: 'text-pink-700',    dot: 'bg-pink-400'    },
    Gastrointestinal: { bg: 'bg-green-100',   text: 'text-green-700',   dot: 'bg-green-400'   },
    Dermatology:      { bg: 'bg-rose-100',    text: 'text-rose-700',    dot: 'bg-rose-400'    },
    Urological:       { bg: 'bg-teal-100',    text: 'text-teal-700',    dot: 'bg-teal-400'    },
};

const getCat = (cat) => CATEGORY_COLORS[cat] || CATEGORY_COLORS['General'];

// ── Recorded Pill ────────────────────────────────────────────────────────────
const SymptomPill = ({ name, category, onRemove }) => {
    const s = getCat(category);
    return (
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${s.bg} ${s.text} select-none`}>
            <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${s.dot}`} />
            {name}
            {category && <span className="opacity-40 font-normal">· {category}</span>}
            {onRemove && (
                <button onClick={onRemove} className="ml-0.5 hover:opacity-60 transition-opacity" aria-label={`Remove ${name}`}>
                    <X size={11} strokeWidth={2.5} />
                </button>
            )}
        </span>
    );
};

// ── Add Modal ────────────────────────────────────────────────────────────────
const AddModal = ({ onClose, onAdd, loading }) => {
    const [name, setName]         = useState('');
    const [category, setCategory] = useState('General');
    const inputRef                = useRef(null);

    useEffect(() => { inputRef.current?.focus(); }, []);

    const handleSubmit = () => {
        if (!name.trim()) return;
        onAdd(name.trim(), category);
    };

    return (
        /* Backdrop */
        <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md mx-4 overflow-hidden">

                {/* Modal Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 bg-blue-600 rounded-lg flex items-center justify-center">
                            <Plus size={14} className="text-white" />
                        </div>
                        <h2 className="text-sm font-bold text-slate-800">Add New Symptom</h2>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={18} />
                    </button>
                </div>

                {/* Modal Body */}
                <div className="px-5 py-4 space-y-4">

                    {/* Symptom Name */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Symptom Name
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            onKeyDown={e => { if (e.key === 'Enter') handleSubmit(); if (e.key === 'Escape') onClose(); }}
                            placeholder="e.g. Chest Pain, Nausea..."
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-400 transition-all"
                        />
                    </div>

                    {/* Category Select */}
                    <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                            Category
                        </label>
                        <div className="flex flex-wrap gap-1.5">
                            {CATEGORIES.map(c => {
                                const s = getCat(c);
                                const sel = category === c;
                                return (
                                    <button
                                        key={c}
                                        onClick={() => setCategory(c)}
                                        className={`px-3 py-1.5 rounded-full text-[11px] font-semibold border transition-all focus:outline-none ${
                                            sel
                                                ? `${s.bg} ${s.text} border-transparent ring-2 ring-offset-1 ring-blue-300`
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        {c}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Preview */}
                    {name.trim() && (
                        <div className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-xl px-4 py-2.5">
                            <Tag size={12} className="text-slate-400" />
                            <span className="text-xs text-slate-500">Preview:</span>
                            <SymptomPill name={name.trim()} category={category} />
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="flex items-center justify-end gap-3 px-5 py-4 bg-slate-50 border-t border-slate-100">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-xs font-semibold text-slate-500 hover:text-slate-700 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={!name.trim() || loading}
                        className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold px-5 py-2.5 rounded-xl transition-all"
                    >
                        {loading ? <Loader2 size={13} className="animate-spin" /> : <Plus size={13} />}
                        Add Symptom
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Main Component ───────────────────────────────────────────────────────────
const SymptomsManager = () => {
    const { slug } = useParams();

    const [searchTerm, setSearchTerm]             = useState('');
    const [showModal, setShowModal]               = useState(false);
    const [popularSymptoms, setPopularSymptoms]   = useState([]);
    const [selectedSymptoms, setSelectedSymptoms] = useState([]);
    const [loading, setLoading]                   = useState(false);
    const [addLoading, setAddLoading]             = useState(false);
    const [error, setError]                       = useState('');
    const [successMsg, setSuccessMsg]             = useState('');
    const [filterCat, setFilterCat]               = useState('All');

    useEffect(() => { fetchPopular(); }, [slug]);

    const fetchPopular = async () => {
        setLoading(true);
        try {
            const res = await axios.get(`${API_BAS}/api/symptoms/${slug}`);
            if (res.data.success) setPopularSymptoms(res.data.data);
        } catch {
            setError('Failed to load symptoms.');
        } finally {
            setLoading(false);
        }
    };

    const flash = (type, msg) => {
        if (type === 'success') { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(''), 2500); }
        else                    { setError(msg);       setTimeout(() => setError(''), 2500);      }
    };

    const handleAddSymptom = async (name, category) => {
        if (selectedSymptoms.some(s => s.name.toLowerCase() === name.toLowerCase())) {
            flash('error', `"${name}" is already recorded.`);
            return;
        }
        setAddLoading(true);
        try {
            const res = await axios.post(`${API_BAS}/api/symptoms/${slug}/add`, { name, category });
            if (res.data.success) {
                setSelectedSymptoms(prev => [...prev, { name, category }]);
                setShowModal(false);
                fetchPopular();
                flash('success', `"${name}" added successfully.`);
            }
        } catch (err) {
            flash('error', err?.response?.data?.message || 'Failed to add. Please try again.');
        } finally {
            setAddLoading(false);
        }
    };

    const handleQuickAdd = (symptom) => {
        if (selectedSymptoms.some(s => s.name.toLowerCase() === symptom.name.toLowerCase())) return;
        setSelectedSymptoms(prev => [...prev, { name: symptom.name, category: symptom.category }]);
        flash('success', `"${symptom.name}" added.`);
    };

    const isSelected = (name) => selectedSymptoms.some(s => s.name.toLowerCase() === name.toLowerCase());

    // Search filters common symptoms list
    const filtered = popularSymptoms.filter(s => {
        const matchSearch = s.name.toLowerCase().includes(searchTerm.toLowerCase());
        const matchCat    = filterCat === 'All' || s.category === filterCat;
        return matchSearch && matchCat;
    });

    const availableCats = ['All', ...new Set(popularSymptoms.map(s => s.category).filter(Boolean))];

    return (
        <>
            {showModal && (
                <AddModal
                    onClose={() => setShowModal(false)}
                    onAdd={handleAddSymptom}
                    loading={addLoading}
                />
            )}

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

                {/* ── Header ── */}
                <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center shadow-sm shadow-blue-200">
                            <Activity size={15} className="text-white" />
                        </div>
                        <div>
                            <h3 className="text-sm font-bold text-slate-800 leading-none">Chief Complaints</h3>
                            <p className="text-[11px] text-slate-400 mt-0.5">
                                {selectedSymptoms.length} symptom{selectedSymptoms.length !== 1 ? 's' : ''} recorded
                            </p>
                        </div>
                    </div>

                    {/* ── ADD BUTTON (top right) ── */}
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-all shadow-sm shadow-blue-200"
                    >
                        <Plus size={14} />
                        Add Symptom
                    </button>
                </div>

                <div className="px-6 py-5 space-y-5">

                    {/* ── Feedback ── */}
                    {error && (
                        <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-600 text-xs font-medium px-3 py-2.5 rounded-xl">
                            <AlertCircle size={13} className="flex-shrink-0" /> {error}
                        </div>
                    )}
                    {successMsg && (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-100 text-green-700 text-xs font-medium px-3 py-2.5 rounded-xl">
                            <Check size={13} className="flex-shrink-0" /> {successMsg}
                        </div>
                    )}

                    {/* ── Recorded Symptoms ── */}
                    {selectedSymptoms.length > 0 && (
                        <div>
                            <div className="flex items-center justify-between mb-2.5">
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Recorded</p>
                                <button
                                    onClick={() => setSelectedSymptoms([])}
                                    className="text-[10px] text-slate-400 hover:text-red-500 font-medium transition-colors"
                                >
                                    Clear all
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {selectedSymptoms.map((s, idx) => (
                                    <SymptomPill
                                        key={idx}
                                        name={s.name}
                                        category={s.category}
                                        onRemove={() => setSelectedSymptoms(prev => prev.filter((_, i) => i !== idx))}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* ── Search Bar (sirf filter karta hai) ── */}
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={15} />
                        <input
                            type="text"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-10 py-3 text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all"
                            placeholder="Search common symptoms..."
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                            autoComplete="off"
                        />
                        {searchTerm && (
                            <button
                                onClick={() => setSearchTerm('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X size={14} />
                            </button>
                        )}
                    </div>

                    {/* ── Common Symptoms ── */}
                    <div>
                        <div className="flex items-center justify-between mb-2.5">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Common Symptoms</p>
                            {loading && <Loader2 size={12} className="animate-spin text-slate-400" />}
                        </div>

                        {/* Category filter tabs */}
                        {availableCats.length > 1 && (
                            <div className="flex flex-wrap gap-1.5 mb-3">
                                {availableCats.map(c => (
                                    <button
                                        key={c}
                                        onClick={() => setFilterCat(c)}
                                        className={`px-2.5 py-1 rounded-full text-[10px] font-semibold border transition-all ${
                                            filterCat === c
                                                ? 'bg-slate-800 text-white border-slate-800'
                                                : 'bg-white text-slate-500 border-slate-200 hover:border-slate-300'
                                        }`}
                                    >
                                        {c}
                                    </button>
                                ))}
                            </div>
                        )}

                        {filtered.length === 0 && !loading && (
                            <div className="text-center py-6">
                                <p className="text-xs text-slate-400">
                                    {searchTerm ? `No results for "${searchTerm}"` : 'No symptoms found.'}
                                </p>
                                {searchTerm && (
                                    <button
                                        onClick={() => setShowModal(true)}
                                        className="mt-2 text-xs text-blue-500 font-semibold hover:text-blue-600 flex items-center gap-1 mx-auto"
                                    >
                                        <Plus size={12} /> Add "{searchTerm}" as new symptom
                                    </button>
                                )}
                            </div>
                        )}

                        <div className="flex flex-wrap gap-2">
                            {filtered.map((s) => {
                                const already = isSelected(s.name);
                                return (
                                    <button
                                        key={s._id}
                                        onClick={() => !already && handleQuickAdd(s)}
                                        disabled={already}
                                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-[11px] font-semibold transition-all focus:outline-none ${
                                            already
                                                ? 'bg-slate-50 text-slate-400 border-slate-100 cursor-default'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50 active:scale-95'
                                        }`}
                                    >
                                        {already
                                            ? <Check size={11} strokeWidth={2.5} className="text-green-500" />
                                            : <Plus size={11} strokeWidth={2.5} />
                                        }
                                        {s.name}
                                        {s.category && (
                                            <span className="text-[9px] font-normal opacity-40 ml-0.5">{s.category}</span>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                </div>
            </div>
        </>
    );
};

export default SymptomsManager;