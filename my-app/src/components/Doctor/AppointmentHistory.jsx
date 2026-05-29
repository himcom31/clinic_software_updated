import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Search, ArrowLeft, CheckCircle2,
    RefreshCw, Phone, Clock, Zap, UserPlus,Calendar,Download
} from 'lucide-react';
const API_BAS = import.meta.env.VITE_API_URL;


const AppointmentHistory = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [clinicConfig, setClinicConfig] = useState({ validity: 7 });
    //const [prescriptions, setPrescriptions] = useState([]);

    useEffect(() => {
        const fetchData = async () => {
            try {
                setLoading(true);

                // 1. Clinic Settings Fetch
                const configRes = await axios.get(`${API_BAS}/api/clinic/${slug}/clinicData`);
                const validityDays = configRes.data.data?.appointmentValidity || 7;
                const clinicFees = configRes.data.data?.consultationFee || 500;
                setClinicConfig({ fees: clinicFees, validity: validityDays });

                // 2. Full History Fetch
                const res = await axios.get(`${API_BAS}/api/appointments/${slug}/full-history?status=Completed`);

                if (res.data.success) {
                    const rawData = res.data.data;



                    // 🔥 UPDATED SMART LOGIC
                    const processedData = rawData.map((current, index) => {
                        // Isse pehle ki saari visits check karo (Jo history mein niche hain)
                        const previousVisits = rawData.slice(index + 1).filter(v => v.mobile === current.mobile);

                        // CASE 1: Agar pichli koi visit hi nahi mili -> NEW PATIENT
                        if (previousVisits.length === 0) {
                            return { ...current, calculatedVisitType: 'NEW PATIENT', displayFees: clinicFees, color: 'bg-green-50 text-green-600 border-green-100' };
                        }

                        // CASE 2: Agar pichli visit mili, toh date compare karo
                        const lastVisitDate = new Date(previousVisits[0].appointmentDate);
                        const currentDate = new Date(current.appointmentDate);
                        const diffDays = Math.ceil(Math.abs(currentDate - lastVisitDate) / (1000 * 60 * 60 * 24));

                        if (diffDays <= validityDays) {
                            // Validity ke andar hai -> REVISIT
                            return { ...current, calculatedVisitType: 'REVISIT', displayFees: 0, color: 'bg-blue-50 text-blue-600 border-blue-100' };
                        } else {
                            // Validity khatam -> NEW VISIT (Purana patient but naye charges)
                            return { ...current, calculatedVisitType: 'NEW VISIT', displayFees: clinicFees, color: 'bg-orange-50 text-orange-600 border-orange-100' };
                        }
                    });

                    setHistory(processedData);
                }
            } catch (err) {
                console.error("History Error:", err);
            } finally {
                setLoading(false);
            }
        };
        if (slug) fetchData();
    }, [slug]);

    const filteredHistory = history.filter(item =>
        item.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.mobile?.includes(searchTerm)
    );

    const downloadPrescription = (pdfInput, patientName = "Patient") => {
    try {
        if (!pdfInput) {
            alert("Prescription data missing!");
            return;
        }

        let byteArray;

        // 1. Agar data MongoDB Buffer format mein hai { type: 'Buffer', data: [...] }
        if (pdfInput.data && Array.isArray(pdfInput.data)) {
            byteArray = new Uint8Array(pdfInput.data);
        } 
        // 2. Agar data seedha Base64 String hai (Jo aapke console mein aa raha hai)
        else if (typeof pdfInput === 'string') {
            // Agar string mein "data:application/pdf;base64," hai toh usey hatao
            const base64Content = pdfInput.includes(',') ? pdfInput.split(',')[1] : pdfInput;
            
            // Base64 ko decode karke bytes mein badlo
            const byteCharacters = atob(base64Content);
            const byteNumbers = new Array(byteCharacters.length);
            for (let i = 0; i < byteCharacters.length; i++) {
                byteNumbers[i] = byteCharacters.charCodeAt(i);
            }
            byteArray = new Uint8Array(byteNumbers);
        }
        else {
            console.error("Unknown format:", pdfInput);
            alert("PDF format nahi pehchana gaya!");
            return;
        }

        // 3. Blob banana
        const blob = new Blob([byteArray], { type: 'application/pdf' });

        // 4. Download link trigger karna
        const fileURL = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = fileURL;
        link.download = `Prescription-${patientName.replace(/\s+/g, '-')}.pdf`;
        document.body.appendChild(link);
        link.click();
        
        // Cleanup
        document.body.removeChild(link);
        URL.revokeObjectURL(fileURL);

    } catch (error) {
        console.error("Download Error:", error);
        alert("File open karne mein error: " + error.message);
    }
};
    return (

<div className="min-h-screen bg-[#f8fafc] p-6 md:p-10 font-sans text-slate-900">

    {/* HEADER SECTION - SAME */}
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-6">
        <div className="flex items-center gap-5">
            <button onClick={() => navigate(-1)} className="p-4 bg-white border border-slate-100 rounded-3xl hover:bg-slate-50 shadow-sm transition-all">
                <ArrowLeft size={20} className="text-slate-400" />
            </button>
            <div>
                <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tighter italic">Patient Archives</h1>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-[3px] mt-1 italic">Intelligent Visit Tracking On</p>
            </div>
        </div>

        <div className="relative w-full md:w-80">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
            <input
                type="text"
                placeholder="Search Archives..."
                className="w-full pl-12 pr-5 py-4 bg-white border border-slate-100 rounded-[22px] text-xs font-black shadow-sm outline-none focus:ring-4 focus:ring-[#18afb1]/5"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
            />
        </div>
    </div>

    {/* TABLE CONTAINER */}
    <div className="bg-white rounded-[40px] border border-slate-100 shadow-xl shadow-slate-200/40 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50/50 border-b border-slate-100">
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Token</th>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Patient Details</th>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Visit Date</th>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Category</th>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-right">Revenue</th>
                        {/* 🔥 Naya Column */}
                        <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Prescription</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                    {loading ? (
                        <tr><td colSpan="7" className="py-24 text-center"><RefreshCw className="animate-spin mx-auto text-[#18afb1]" size={32} /></td></tr>
                    ) : filteredHistory.length > 0 ? (
                        filteredHistory.map((item) => (
                            <tr key={item._id} className="group hover:bg-[#fcfdfe] transition-all">
                                <td className="px-8 py-6 text-center">
                                    <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex flex-col items-center justify-center mx-auto shadow-md">
                                        <span className="text-[7px] opacity-40">TK</span>
                                        <span className="text-sm font-black">{item.tokenNumber}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-6">
                                    <p className="text-sm font-black text-slate-800 uppercase leading-none mb-1">{item.patientName}</p>
                                    <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1"><Phone size={10} /> {item.mobile}</p>
                                </td>
                                <td className="px-8 py-6">
                                    <p className="text-sm font-black text-slate-700">{new Date(item.appointmentDate).toLocaleDateString('en-GB')}</p>
                                    <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1 mt-0.5"><Clock size={10} /> {item.slotTime || 'Walk-in'}</p>
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <div className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${item.visitType === 'NEW PATIENT' ? 'bg-blue-50 text-blue-600 border-blue-100' : 'bg-purple-50 text-purple-600 border-purple-100'}`}>
                                        {item.visitType}
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-center">
                                    <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg text-[9px] font-black uppercase tracking-wider border border-emerald-100">
                                        <CheckCircle2 size={12} /> {item.status}
                                    </div>
                                </td>
                                <td className="px-8 py-6 text-right font-black text-slate-800 text-sm italic">
                                    ₹{item.displayFees || item.billing?.paidAmount || 0}
                                </td>
                                
                                {/* 🔥 Action Column Logic */}
                                <td className="px-8 py-6 text-center">
                                    {item.prescriptions && item.prescriptions.length > 0 ? (
                                        <div className="flex justify-center gap-2">
                                            {item.prescriptions.map((p, idx) => (
                                                <button
                                                    key={p._id}
                                                    onClick={() => downloadPrescription(p.pdfBinary, item.patientName)}
                                                    className="p-2 bg-slate-900 text-white rounded-xl hover:bg-black transition-all shadow-lg shadow-slate-200 active:scale-90 group"
                                                    title="Download Prescription"
                                                >
                                                    <Download size={14} />
                                                </button>
                                            ))}
                                        </div>
                                    ) : (
                                        <span className="text-[8px] font-black text-slate-300 uppercase tracking-tighter italic">No File</span>
                                    )}
                                </td>
                            </tr>
                        ))
                    ) : (
                        <tr>
                            <td colSpan="7" className="py-40 text-center font-black text-slate-200 uppercase text-xs tracking-[5px]">No Archive Data</td>
                        </tr>
                    )}
                </tbody>
            </table>
        </div>
    </div>
</div>
    );
};

export default AppointmentHistory;