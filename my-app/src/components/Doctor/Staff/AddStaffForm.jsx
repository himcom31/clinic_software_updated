import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import { ArrowLeft, User, Mail, Lock, ShieldCheck, ArrowRight, Headset, Stethoscope, Eye, EyeOff } from 'lucide-react';
const API_BAS = import.meta.env.VITE_API_URL;


const AddStaffForm = () => {
    const { slug } = useParams();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = useState(false);

    const [newStaff, setNewStaff] = useState({
        name: '', email: '', password: '', role: 'Receptionist',
        permissions: {
            canAddPatients: true, canManageAppointments: true, canEditBilling: false,
            canViewReports: false, canAddPrescription: false, canAddMedicine: false,
            canAddTest: false, canAddAdvice: false, canDeleteData: false, canCreateAppointment: true,
        }
    });

    const permissionOptions = [
        { key: "canAddPatients", label: "Patient Entry", desc: "Add/Edit profiles" },
        { key: "canManageAppointments", label: "Appointments", desc: "Book/Cancel slots" },
        { key: "canEditBilling", label: "Billing", desc: "Invoices & Payments" },
        { key: "canViewReports", label: "Reports", desc: "Revenue stats" },
        { key: "canAddPrescription", label: "Prescription", desc: "Print/View" },
        { key: "canAddMedicine", label: "Medicines", desc: "Update drug list" },
        { key: "canAddTest", label: "Lab Tests", desc: "Manage investigations" },
        { key: "canAddAdvice", label: "Advice", desc: "Edit instructions" },
        { key: "canCreateAppointment", label: "Create Appointment", desc: "Schedule new appointments" },

    ];

    const handleToggle = (key) => {
        setNewStaff(prev => ({
            ...prev,
            permissions: { ...prev.permissions, [key]: !prev.permissions[key] }
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await axios.post(`${API_BAS}/api/staff/${slug}/add-staff`, newStaff);
            if (res.data.success) {
                alert("Staff Access Finalized!");
                navigate(`/${slug}/dashboard/staff`);
            }
        } catch (err) { alert(err.response?.data?.message || "Error"); }
    };

    return (
        <div className="p-10 bg-white min-h-screen">
            {/* Header */}
            <div className="flex items-center gap-6 mb-12 border-b border-slate-50 pb-8">
                <button onClick={() => navigate(-1)} className="p-3 hover:bg-slate-50 rounded-2xl border border-slate-100 transition-all">
                    <ArrowLeft size={20} className="text-slate-400" />
                </button>
                <div>
                    <h2 className="text-3xl font-black text-slate-800 uppercase tracking-tighter">New Staff Authorization</h2>
                    <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[3px] mt-1 text-teal-600">Step: Identity & Privilege Mapping</p>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="max-w-6xl mx-auto">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">

                    {/* Left Column: Identity */}
                    <div className="lg:col-span-5 space-y-8">
                        <section className="bg-slate-50/50 p-8 rounded-[40px] border border-slate-100 space-y-5 shadow-inner">
                            <div className="relative group">
                                <User size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" />
                                <input required className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[22px] font-bold text-sm outline-none focus:border-teal-500/50 transition-all" placeholder="Staff Name" onChange={(e) => setNewStaff({ ...newStaff, name: e.target.value })} />
                            </div>
                            <div className="relative group">
                                <Mail size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" />
                                <input required type="email" className="w-full pl-14 pr-6 py-4 bg-white border border-slate-200 rounded-[22px] font-bold text-sm outline-none focus:border-teal-500/50 transition-all" placeholder="Email Address" onChange={(e) => setNewStaff({ ...newStaff, email: e.target.value })} />
                            </div>
                            <div className="relative group">
                                <Lock size={18} className="absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-teal-500 transition-colors" />
                                <input required type={showPassword ? "text" : "password"} className="w-full pl-14 pr-14 py-4 bg-white border border-slate-200 rounded-[22px] font-bold text-sm outline-none focus:border-teal-500/50 transition-all" placeholder="Create Password" onChange={(e) => setNewStaff({ ...newStaff, password: e.target.value })} />
                                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-300">
                                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </section>

                        <div className="bg-slate-100 p-2 rounded-[30px] flex gap-2 border border-slate-200 shadow-sm">
                            <button type="button" onClick={() => setNewStaff({ ...newStaff, role: 'Receptionist' })} className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[24px] font-black text-[11px] uppercase tracking-widest transition-all ${newStaff.role === 'Receptionist' ? 'bg-white text-teal-600 shadow-md' : 'text-slate-400'}`}><Headset size={16} /> Receptionist</button>
                            <button type="button" onClick={() => setNewStaff({ ...newStaff, role: 'Assistant' })} className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[24px] font-black text-[11px] uppercase tracking-widest transition-all ${newStaff.role === 'Assistant' ? 'bg-white text-teal-600 shadow-md' : 'text-slate-400'}`}><Stethoscope size={16} /> Assistant</button>
                        </div>
                    </div>

                    {/* Right Column: Privilege Matrix */}
                    <div className="lg:col-span-7">
                        <div className="bg-white p-10 rounded-[50px] border border-slate-100 shadow-sm">
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest flex items-center gap-2 mb-8">
                                <ShieldCheck size={20} className="text-teal-500" /> Feature Access Matrix
                            </h3>
                            <div className="grid grid-cols-2 gap-4">
                                {permissionOptions.map((opt) => (
                                    <div key={opt.key} onClick={() => handleToggle(opt.key)} className={`p-4 rounded-3xl border-2 transition-all cursor-pointer flex items-center justify-between group ${newStaff.permissions[opt.key] ? 'border-teal-500 bg-teal-50/50 shadow-md' : 'border-white bg-slate-50'}`}>
                                        <div className="flex flex-col">
                                            <span className={`text-[11px] font-black uppercase tracking-tight ${newStaff.permissions[opt.key] ? 'text-teal-600' : 'text-slate-400'}`}>{opt.label}</span>
                                            <span className="text-[9px] font-bold text-slate-300 lowercase leading-none mt-1">{opt.desc}</span>
                                        </div>
                                        <div className={`w-10 h-5 rounded-full p-1 transition-all ${newStaff.permissions[opt.key] ? 'bg-teal-500' : 'bg-slate-200'}`}>
                                            <div className={`w-3 h-3 bg-white rounded-full shadow-sm transition-all ${newStaff.permissions[opt.key] ? 'translate-x-5' : 'translate-x-0'}`}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="mt-12 flex justify-end gap-6 items-center border-t border-slate-50 pt-10">
                    <button type="button" onClick={() => navigate(-1)} className="text-[11px] font-black uppercase tracking-widest text-slate-300 hover:text-red-500 px-6">Discard Entry</button>
                    <button type="submit" className="bg-slate-900 text-white px-12 py-6 rounded-[28px] font-black text-xs uppercase tracking-[4px] shadow-2xl hover:bg-teal-600 transition-all flex items-center gap-4 group">
                        Confirm Authorization <ArrowRight size={20} className="group-hover:translate-x-2 transition-transform" />
                    </button>
                </div>
            </form>
        </div>
    );
};

export default AddStaffForm;