import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { Send, Loader2, AlertCircle, Clock, CheckCircle2, MessageSquare, Tag } from 'lucide-react';
const API_BAS = import.meta.env.VITE_API_URL;


const SupportTicket = () => {
    const { slug } = useParams();
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);
    const [tickets, setTickets] = useState([]);
    const [formData, setFormData] = useState({
        subject: '',
        category: 'Technical',
        priority: 'Medium',
        message: ''
    });

    const token = localStorage.getItem('doctorToken');

    // --- FETCH TICKETS LOGIC ---
    const fetchTickets = async () => {
        try {
            const res = await axios.get(`${API_BAS}/api/support/${slug}/my-tickets`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) setTickets(res.data.tickets);
        } catch (err) {
            console.error("Failed to fetch tickets");
        } finally {
            setFetching(false);
        }
    };

    useEffect(() => { fetchTickets(); }, [slug]);

    // --- SUBMIT TICKET LOGIC ---
    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await axios.post(`${API_BAS}/api/support/${slug}/raise-ticket`, formData, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (res.data.success) {
                alert("Ticket Raised Successfully!");
                setFormData({ subject: '', category: 'Technical', priority: 'Medium', message: '' });
                fetchTickets(); // List refresh karo
            }
        } catch (err) {
            alert("Failed to raise ticket");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                
                {/* --- LEFT SIDE: RAISE TICKET FORM --- */}
                <div className="bg-white p-8 md:p-10 rounded-[35px] border border-slate-100 shadow-sm h-fit">
                    <div className="flex items-center gap-3 mb-8">
                        <div className="p-3 bg-blue-50 text-blue-600 rounded-2xl">
                            <AlertCircle size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-black uppercase tracking-tight text-slate-800">Raise Ticket</h2>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Submit your technical queries</p>
                        </div>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Category</label>
                                <select 
                                    value={formData.category}
                                    onChange={(e) => setFormData({...formData, category: e.target.value})}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-xs outline-none focus:ring-2 ring-blue-100 transition-all"
                                >
                                    <option>Technical</option>
                                    <option>Billing</option>
                                    <option>Feature Request</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Priority</label>
                                <select 
                                    value={formData.priority}
                                    onChange={(e) => setFormData({...formData, priority: e.target.value})}
                                    className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-xs outline-none focus:ring-2 ring-blue-100 transition-all"
                                >
                                    <option>Low</option>
                                    <option>Medium</option>
                                    <option>High</option>
                                </select>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Subject</label>
                            <input 
                                type="text" required value={formData.subject}
                                onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                placeholder="Issue title..."
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-blue-100 transition-all"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase ml-1">Message</label>
                            <textarea 
                                required rows="4" value={formData.message}
                                onChange={(e) => setFormData({...formData, message: e.target.value})}
                                placeholder="Describe your problem..."
                                className="w-full p-4 bg-slate-50 border-none rounded-2xl font-bold text-sm outline-none focus:ring-2 ring-blue-100 resize-none transition-all"
                            ></textarea>
                        </div>

                        <button 
                            disabled={loading}
                            className="w-full bg-slate-900 text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[2px] flex items-center justify-center gap-3 hover:bg-blue-600 transition-all shadow-lg"
                        >
                            {loading ? <Loader2 className="animate-spin" size={16} /> : <Send size={16} />} 
                            Submit Support Ticket
                        </button>
                    </form>
                </div>

                {/* --- RIGHT SIDE: TICKET STATUS TRACKER --- */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-2">
                        <h3 className="text-sm font-black uppercase text-slate-800 tracking-widest flex items-center gap-2">
                            <Clock size={18} className="text-blue-600" /> Recent Tickets
                        </h3>
                        <span className="text-[10px] font-bold bg-slate-100 px-3 py-1 rounded-full text-slate-500">
                            Total: {tickets.length}
                        </span>
                    </div>

                    <div className="space-y-4 overflow-y-auto max-h-[650px] pr-2 custom-scrollbar">
                        {fetching ? (
                            <div className="flex justify-center p-10"><Loader2 className="animate-spin text-blue-600" /></div>
                        ) : tickets.length === 0 ? (
                            <div className="bg-white border border-dashed border-slate-200 p-10 rounded-[30px] text-center">
                                <MessageSquare className="mx-auto text-slate-200 mb-4" size={40} />
                                <p className="text-xs font-bold text-slate-400 uppercase italic">No tickets raised yet</p>
                            </div>
                        ) : (
                            tickets.map((ticket, index) => (
                                <div key={index} className="bg-white p-6 rounded-[30px] border border-slate-100 shadow-sm hover:border-blue-100 transition-all group">
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center gap-2">
                                            <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${
                                                ticket.status === 'Open' ? 'bg-blue-50 text-blue-600' : 
                                                ticket.status === 'Resolved' ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-500'
                                            }`}>
                                                {ticket.status}
                                            </div>
                                            <div className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">
                                                ID: {ticket._id.slice(-6)}
                                            </div>
                                        </div>
                                        <span className="text-[10px] font-bold text-slate-400 italic">
                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                    <h4 className="text-sm font-bold text-slate-800 mb-1 group-hover:text-blue-600 transition-colors">
                                        {ticket.subject}
                                    </h4>
                                    <p className="text-xs text-slate-500 line-clamp-2 mb-4 font-medium">
                                        {ticket.message}
                                    </p>
                                    <div className="flex items-center gap-4 pt-4 border-t border-slate-50">
                                        <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 uppercase">
                                            <Tag size={12} /> {ticket.category}
                                        </div>
                                        <div className={`flex items-center gap-1.5 text-[10px] font-bold uppercase ${
                                            ticket.priority === 'High' ? 'text-red-500' : 'text-slate-400'
                                        }`}>
                                            <AlertCircle size={12} /> {ticket.priority}
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SupportTicket;