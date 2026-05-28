import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import {
    UserPlus, Activity, UserCog, Loader2, Trash2, ShieldCheck, ChevronDown
} from 'lucide-react';
const API_BAS = import.meta.env.VITE_API_URL;


const StaffManagement = () => {
    const { slug } = useParams();
    const [staff, setStaff] = useState([]);
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('staff');
    const [expandedStaffId, setExpandedStaffId] = useState(null);

    useEffect(() => {
        fetchData();
    }, [slug]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [staffRes, logsRes] = await Promise.all([
                axios.get(`${API_BAS}/api/staff/${slug}/list`),
                axios.get(`${API_BAS}/api/staff/${slug}/activity-logs`)
            ]);
            setStaff(staffRes.data.data);
            setLogs(logsRes.data.data);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    if (loading) return <div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-teal-600" size={40} /></div>;

    return (
        <div className="p-8 bg-slate-50 min-h-screen">
            {/* Header */}
            <div className="flex justify-between items-center mb-10">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tighter text-slate-800">Staff Control</h1>
                    <div className="flex gap-4 mt-4">
                        <button onClick={() => setActiveTab('staff')} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'staff' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-200'}`}>Members</button>
                        <button onClick={() => setActiveTab('logs')} className={`px-6 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all ${activeTab === 'logs' ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-200'}`}>Activity Logs</button>
                    </div>
                </div>

                {/* --- YAHAN LINK KA USE KIYA HAI --- */}
                <Link
                    to={`/${slug}/dashboard/staff/add`}
                    className="bg-teal-600 text-white px-8 py-4 rounded-[22px] font-black text-[11px] uppercase tracking-widest flex items-center gap-3 shadow-lg shadow-teal-600/20 hover:scale-105 transition-all"
                >
                    <UserPlus size={18} /> Authorize New Staff
                </Link>
            </div>

            {activeTab === 'staff' ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {staff.map((s) => (
                        <div key={s._id} className="bg-white p-8 rounded-[40px] border border-slate-100 shadow-sm overflow-hidden">
                            <div className="flex justify-between items-start mb-6">
                                <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400"><UserCog size={28} /></div>
                                <span className="px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest bg-blue-50 text-blue-600 border border-blue-100">{s.role}</span>
                            </div>
                            <h3 className="text-xl font-black text-slate-800 uppercase tracking-tight">{s.name}</h3>
                            <p className="text-xs font-bold text-slate-700 lowercase mb-6">{s.email}</p>

                            <button
                                onClick={() => setExpandedStaffId(expandedStaffId === s._id ? null : s._id)}
                                className="w-full flex items-center justify-between p-4 bg-slate-50 rounded-[22px] transition-all"
                            >
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-600 flex items-center gap-2"><ShieldCheck size={14} /> Access Control</span>
                                <ChevronDown className={`transition-transform duration-300 ${expandedStaffId === s._id ? 'rotate-180' : ''}`} size={16} />
                            </button>

                            <div className={`transition-all duration-500 overflow-hidden ${expandedStaffId === s._id ? 'max-h-[500px] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
                                <div className="bg-slate-50/50 rounded-[24px] p-6 space-y-3">
                                    <PermissionRow label="Patient Access" active={s.permissions.canAddPatients} />
                                    <PermissionRow label="Appt. Manager" active={s.permissions.canManageAppointments} />
                                    <PermissionRow label="Create Appointment" active={s.permissions.canCreateAppointment} />

                                    {/* 2. Billing & Finance */}
                                    <PermissionRow label="Billing Edit" active={s.permissions.canEditBilling} />
                                    <PermissionRow label="Financial Reports" active={s.permissions.canViewReports} />
                                    {/* 3. Clinical Master Access */}
                                    <PermissionRow label="Prescriptions" active={s.permissions.canAddPrescription} />
                                    <PermissionRow label="Medicine Master" active={s.permissions.canAddMedicine} />
                                    <PermissionRow label="Investigations" active={s.permissions.canAddTest} />
                                    <PermissionRow label="Advice Master" active={s.permissions.canAddAdvice} />

                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                /* Logs UI (Same as before) */
                <div className="bg-white rounded-[40px] border border-slate-100 divide-y divide-slate-50">
                    {logs.map(log => (
                        <div key={log._id} className="p-6 flex justify-between items-center hover:bg-slate-50/50 transition-colors">
                            <div className="flex items-center gap-4">
                                <div className="p-3 bg-teal-50 text-teal-600 rounded-xl"><Activity size={16} /></div>
                                <div>
                                    <p className="text-sm font-black text-slate-700">{log.action}</p>
                                    <p className="text-[10px] font-bold text-slate-700 uppercase">{log.staffName}</p>
                                </div>
                            </div>
                            <p className="text-[12px] font-black text-slate-700">{new Date(log.timestamp).toLocaleString()}</p>
                            <p className="text-[13px] font-bold text-green-600 uppercase">{log.details}</p>


                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

const PermissionRow = ({ label, active }) => (
    <div className="flex justify-between py-1 border-b border-slate-100 last:border-0">
        <span className="text-[10px] font-bold text-slate-500 uppercase">{label}</span>
        <span className={`text-[9px] font-black uppercase ${active ? 'text-teal-600' : 'text-slate-300'}`}>{active ? 'Active' : 'Locked'}</span>
    </div>
);

export default StaffManagement;