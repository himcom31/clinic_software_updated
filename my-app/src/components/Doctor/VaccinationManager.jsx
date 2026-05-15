import React, { useState, useEffect } from 'react';
import { Syringe, NotebookPen, CheckCircle2, Clock, History, Plus, X, ShieldCheck } from 'lucide-react';
import axios from 'axios';
import { useParams } from 'react-router-dom';

const API_BAS = import.meta.env.VITE_API_URL;


const VaccinationManager = () => {
    const { slug } = useParams(); // Doctor's slug from URL

    const [vaccineName, setVaccineName] = useState('');
    const [note, setNote] = useState('');
    const [action, setAction] = useState('');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    // 1. Fetch History on Load
    useEffect(() => {
        fetchHistory();
    }, [slug]);

    const fetchHistory = async () => {
        try {
            const res = await axios.get(`${API_BAS}/api/vaccination/${slug}/history`);
            if (res.data.success) setHistory(res.data.data);
        } catch (err) {
            console.error("History fetch error", err);
        }
    };

    // 2. Add New Record
    const handleSave = async () => {
        if (!vaccineName) return alert("Please enter Vaccine Name");
        setLoading(true);
        try {
            const res = await axios.post(`${API_BAS}/api/vaccination/${slug}/add`, {

                vaccineName,
                note,
                action
            });
            if (res.data.success) {
                setVaccineName('');
                setNote('');
                setAction('');
                fetchHistory(); // Refresh List
            }
        } catch (err) {
            console.error("Save error", err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-2">

            {/* --- LEFT: Entry Form (4 Cols) --- */}
            <div className="lg:col-span-4 bg-white rounded-[32px] border border-slate-100 shadow-sm p-6 space-y-6 self-start">
                <div className="flex items-center gap-3 mb-2">
                    <div className="p-2.5 bg-indigo-600 rounded-2xl text-white shadow-lg shadow-indigo-100">
                        <Syringe size={20} />
                    </div>
                    <div>
                        <h3 className="text-sm font-black text-slate-800 uppercase tracking-tight">New Dose</h3>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">Record Immunization</p>
                    </div>
                </div>

                <div className="space-y-4">
                    {/* Vaccine Name */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Vaccine Name</label>
                        <div className="relative">
                            <ShieldCheck className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                            <input
                                type="text"
                                value={vaccineName}
                                onChange={(e) => setVaccineName(e.target.value)}
                                placeholder="e.g. Covaxin, BCG, MMR"
                                className="w-full bg-slate-50 border border-slate-100 p-3.5 pl-12 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all"
                            />
                        </div>
                    </div>

                    {/* Note */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Observation Note</label>
                        <div className="relative">
                            <NotebookPen className="absolute left-4 top-4 text-slate-400" size={16} />
                            <textarea
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder="Write dosage or reaction notes..."
                                rows="3"
                                className="w-full bg-slate-50 border border-slate-100 p-3.5 pl-12 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all resize-none"
                            />
                        </div>
                    </div>

                    {/* Action / Status */}
                    <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-500 uppercase ml-1">Action</label>
                        <div className="relative">
                            <CheckCircle2 className="absolute left-4 top-4 text-slate-400" size={16} />
                            <textarea
                                value={action}
                                onChange={(e) => setAction(e.target.value)}
                                placeholder="Write the action taken..."
                                rows="3"
                                className="w-full bg-slate-50 border border-slate-100 p-3.5 pl-12 rounded-2xl text-xs font-bold outline-none focus:border-indigo-500 transition-all resize-none"
                            />
                        </div>
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={loading}
                        className="w-full bg-slate-900 text-white p-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-600 transition-all flex items-center justify-center gap-3 shadow-xl shadow-slate-200 disabled:opacity-50"
                    >
                        {loading ? 'Saving...' : <><Plus size={18} /> Save Vaccination</>}
                    </button>
                </div>
            </div>

            {/* --- RIGHT: History List (8 Cols) --- */}
            <div className="lg:col-span-8 space-y-4">
                <div className="flex items-center gap-2 px-2">
                    <History size={18} className="text-slate-400" />
                    <h4 className="text-[11px] font-black text-slate-500 uppercase tracking-widest">Immunization History</h4>
                </div>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {history.length > 0 ? history.map((record, idx) => (
                        <div key={idx} className="bg-white p-5 rounded-[28px] border border-slate-100 flex items-center gap-4 hover:shadow-md transition-all group">
                            <div className={`p-4 rounded-2xl ${record.action === 'Administered' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                <ShieldCheck size={24} />
                            </div>
                            <div className="flex-1">
                                <div className="flex justify-between items-start">
                                    <h5 className="text-sm font-black text-slate-800 uppercase tracking-tight">{record.vaccineName}</h5>
                                    <span className="text-[9px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-full uppercase tracking-tighter">
                                        {new Date(record.date).toLocaleDateString('en-GB')}
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 font-medium mt-1 italic">"{record.note || 'No notes added'}"</p>
                            </div>
                            <div className="text-right">
                                <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${record.action === 'Administered' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                    }`}>
                                    {record.action === 'Administered' ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                                    {record.action}
                                </div>
                            </div>
                        </div>
                    )) : (
                        <div className="text-center py-20 bg-slate-50 rounded-[32px] border-2 border-dashed border-slate-100">
                            <Syringe size={40} className="mx-auto text-slate-200 mb-3" />
                            <p className="text-[11px] font-black text-slate-400 uppercase tracking-widest">No Records Found</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default VaccinationManager;