import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams } from 'react-router-dom';
import { 
    User, Mail, MapPin, Phone, Calendar, Hash, 
    Edit3, Save, X, Loader2, ShieldCheck, Moon, Sun, 
    Lock, Bell, CheckCircle2, Globe, ArrowLeft
} from 'lucide-react';
const API_BAS = import.meta.env.VITE_API_URL;

const AccountSettings = () => {
    const { slug } = useParams();
    
    // View States: 'overview' | 'edit' | 'password' | 'notifications'
    const [view, setView] = useState('overview'); 
    const [loading, setLoading] = useState(false);
    const [doctor, setDoctor] = useState(null);
    const [formData, setFormData] = useState({});
    const [passwords, setPasswords] = useState({ oldPassword: '', newPassword: '' });

    // Axios Instance with Token
    const api = axios.create({
        baseURL: `${API_BAS}/api/doctors/${slug}`,
        headers: { Authorization: `Bearer ${localStorage.getItem('doctorToken')}` }
    });

    // --- 1. Load Initial Data ---


    const toggleDarkMode = async () => {
    const newMode = !doctor.settings?.darkMode;

    // Pure HTML element par dark class lagao (Bina Tailwind config ke bhi ye Variables ko trigger karega)
    if (newMode) {
        document.documentElement.classList.add('dark');
    } else {
        document.documentElement.classList.remove('dark');
    }

    // State aur LocalStorage update
    setDoctor(prev => ({ ...prev, settings: { ...prev.settings, darkMode: newMode } }));
    localStorage.setItem('theme', newMode ? 'dark' : 'light');

    // Backend sync
    await api.put('/settings/update', { darkMode: newMode });
};
    const fetchDoctorData = async () => {
        try {
            const res = await api.get('/profileDoc');
            if (res.data.success) {
                setDoctor(res.data.data);
                setFormData(res.data.data);
                // Apply theme from DB
                if (res.data.data.settings?.darkMode) {
                    document.documentElement.classList.add('dark');
                }
            }
        } catch (err) {
            console.error("Data fetch error:", err);
        }
    };

    useEffect(() => {
        fetchDoctorData();
    }, [slug]);

    // --- 2. Action Handlers ---

    // Update Profile Info
    const handleUpdateProfile = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.put('/profile/update', formData);
            if (res.data.success) {
                setDoctor(res.data.data);
                setView('overview');
                alert("Profile synchronized successfully!");
            }
        } catch (err) {
            alert("Failed to update profile data");
        } finally { setLoading(false); }
    };

    // Change Password Logic
    const handlePasswordUpdate = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.put('/change-password', passwords);
            if (res.data.success) {
                alert("Security key updated!");
                setPasswords({ oldPassword: '', newPassword: '' });
                setView('overview');
            }
        } catch (err) {
            alert(err.response?.data?.message || "Password change failed");
        } finally { setLoading(false); }
    };

    // Dark Mode Toggle Logic
    const toggleDarkMode1 = async () => {
        const newMode = !doctor.settings?.darkMode;
        // Update UI immediately
        document.documentElement.classList.toggle('dark');
        setDoctor(prev => ({ ...prev, settings: { ...prev.settings, darkMode: newMode } }));
        
        try {
            await api.put('/settings/update', { darkMode: newMode });
        } catch (err) {
            console.error("Theme sync failed");
        }
    };

    if (!doctor) return (
        <div className="h-screen flex items-center justify-center bg-white">
            <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
    );

    return (
        <div className="min-h-screen bg-white text-slate-900 transition-all p-4 md:p-12">
            <div className="max-w-5xl mx-auto">
                
                {/* --- TOP NAVIGATION / HEADER --- */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 border-b border-slate-50 pb-8 gap-4">
                    <div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase text-slate-900">
                            {view === 'overview' ? 'Account Overview' : view === 'edit' ? 'Update Profile' : 'Security Settings'}
                        </h1>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[3px] mt-1 italic">
                            Clinic Identity: {doctor.clinicName}
                        </p>
                    </div>
                    {view !== 'overview' ? (
                        <button onClick={() => setView('overview')} className="flex items-center gap-2 text-slate-400 hover:text-slate-900 font-black text-[10px] uppercase tracking-widest transition-all">
                            <ArrowLeft size={14} /> Back to Profile
                        </button>
                    ) : (
                        <button onClick={() => setView('edit')} className="bg-slate-900 text-white px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[2px] hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 flex items-center gap-2">
                            <Edit3 size={16} /> Edit Profile Data
                        </button>
                    )}
                </div>

                {/* --- MAIN CONTENT AREA --- */}
                <div className="mt-4">
                    
                    {/* VIEW 1: DATA OVERVIEW (Read Only) */}
                    {view === 'overview' && (
                        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                <DataCard label="Full Identity" value={doctor.name} icon={<User size={20}/>} color="bg-blue-50 text-blue-600" />
                                <DataCard label="Database ID" value={doctor._id} icon={<Hash size={20}/>} color="bg-slate-50 text-slate-400" />
                                <DataCard label="Official Email" value={doctor.email} icon={<Mail size={20}/>} color="bg-orange-50 text-orange-600" />
                                <DataCard label="Mobile Contact" value={doctor.mobile} icon={<Phone size={20}/>} color="bg-green-50 text-green-600" />
                                <DataCard label="Clinic Slug" value={doctor.slug} icon={<ShieldCheck size={20}/>} color="bg-purple-50 text-purple-600" />
                                <DataCard label="Location/Address" value={doctor.address} icon={<MapPin size={20}/>} color="bg-red-50 text-red-600" />
                                <DataCard label="Joining Date" value={new Date(doctor.createdAt).toLocaleDateString()} icon={<Calendar size={20}/>} color="bg-indigo-50 text-indigo-600" />
                            </div>

                            {/* Section: Action Options */}
                            <div className="mt-12 pt-12 border-t border-slate-100 grid grid-cols-1 md:grid-cols-3 gap-6">
                                <ActionBtn label="Security Key" sub="Change Password" icon={<Lock size={20}/>} onClick={() => setView('password')} />
                                <ActionBtn label="Alert System" sub="Notifications" icon={<Bell size={20}/>} onClick={() => setView('notifications')} />
                            </div>
                        </div>
                    )}

                    {/* VIEW 2: EDIT PROFILE FORM */}
                    {view === 'edit' && (
                        <form onSubmit={handleUpdateProfile} className="bg-slate-50 p-10 rounded-[40px] border border-slate-100 animate-in fade-in zoom-in-95 duration-300">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <InputField label="Full Name" value={formData.name} onChange={(v) => setFormData({...formData, name: v})} />
                                <InputField label="Clinic Name" value={formData.clinicName} onChange={(v) => setFormData({...formData, clinicName: v})} />
                                <InputField label="Phone/Mobile" value={formData.mobile} onChange={(v) => setFormData({...formData, mobile: v})} />
                                <InputField label="Location Address" value={formData.address} onChange={(v) => setFormData({...formData, address: v})} />
                            </div>
                            <div className="mt-10 flex items-center gap-4">
                                <button type="submit" disabled={loading} className="bg-blue-600 text-white px-12 py-5 rounded-[22px] font-black text-[11px] uppercase tracking-[3px] shadow-2xl shadow-blue-200 hover:bg-blue-700 transition-all flex items-center gap-3">
                                    {loading ? <Loader2 className="animate-spin" size={18}/> : <Save size={18}/>} Save Updates
                                </button>
                                <button type="button" onClick={() => setView('overview')} className="text-slate-400 font-black text-[11px] uppercase tracking-widest px-6 hover:text-red-500 transition-colors">Discard</button>
                            </div>
                        </form>
                    )}

                    {/* VIEW 3: CHANGE PASSWORD FORM */}
                    {view === 'password' && (
                        <form onSubmit={handlePasswordUpdate} className="max-w-lg mx-auto bg-slate-50 p-10 rounded-[40px] border border-slate-100 animate-in slide-in-from-bottom-8 duration-500">
                            <div className="text-center mb-8">
                                <div className="w-16 h-16 bg-white rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-sm text-blue-600">
                                    <Lock size={30} />
                                </div>
                                <h3 className="text-xl font-black uppercase text-slate-800">Reset Access Key</h3>
                            </div>
                            <div className="space-y-6">
                                <InputField label="Old Password" type="password" value={passwords.oldPassword} onChange={(v) => setPasswords({...passwords, oldPassword: v})} />
                                <InputField label="New Secure Password" type="password" value={passwords.newPassword} onChange={(v) => setPasswords({...passwords, newPassword: v})} />
                            </div>
                            <button type="submit" disabled={loading} className="w-full mt-10 bg-slate-900 text-white py-5 rounded-[22px] font-black text-[11px] uppercase tracking-[3px] hover:bg-blue-600 transition-all shadow-xl shadow-slate-200">
                                {loading ? <Loader2 className="animate-spin" size={18}/> : 'Update Password'}
                            </button>
                        </form>
                    )}

                    {/* VIEW 4: NOTIFICATIONS */}
                    {view === 'notifications' && (
                        <div className="max-w-2xl mx-auto bg-slate-50 p-10 rounded-[40px] border border-slate-100 animate-in fade-in">
                            <h3 className="text-sm font-black uppercase text-slate-400 tracking-widest mb-8 text-center">Notification Management</h3>
                            <div className="space-y-4">
                                <div className="bg-white p-6 rounded-3xl border border-slate-100 flex items-center justify-between">
                                    <div>
                                        <p className="font-bold text-sm text-slate-800">Email Notifications</p>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-tight">Receive alerts for new patients</p>
                                    </div>
                                    <div className="w-12 h-6 bg-blue-600 rounded-full flex items-center justify-end px-1">
                                        <div className="w-4 h-4 bg-white rounded-full"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    );
};

// --- SUB-COMPONENTS (ATOMS) ---

// 1. Overview Card
const DataCard = ({ label, value, icon, color }) => (
    <div className="bg-white border border-slate-100 p-6 rounded-[32px] hover:shadow-lg hover:shadow-slate-100 transition-all flex items-start gap-5 group">
        <div className={`p-4 rounded-[22px] transition-all group-hover:scale-110 ${color}`}>{icon}</div>
        <div>
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1.5">{label}</p>
            <p className="text-sm font-bold text-slate-800 break-all">{value || 'N/A'}</p>
        </div>
    </div>
);

// 2. Action Bottom Buttons
const ActionBtn = ({ label, sub, icon, onClick }) => (
    <button onClick={onClick} className="flex items-center justify-between p-6 bg-white border border-slate-100 rounded-[30px] hover:border-blue-500 hover:shadow-xl transition-all group text-left">
        <div className="flex items-center gap-5">
            <div className="p-4 bg-slate-50 text-slate-400 group-hover:bg-blue-50 group-hover:text-blue-600 rounded-[20px] transition-all">{icon}</div>
            <div>
                <p className="text-[10px] font-black uppercase text-slate-800 tracking-widest leading-none">{label}</p>
                <p className="text-[9px] font-bold uppercase text-slate-400 mt-1 tracking-tighter">{sub}</p>
            </div>
        </div>
        <CheckCircle2 size={16} className="text-slate-100 group-hover:text-blue-500 transition-colors" />
    </button>
);

// 3. Form Input Field
const InputField = ({ label, value, onChange, type = "text" }) => (
    <div className="space-y-2">
        <label className="text-[10px] font-black text-slate-400 uppercase ml-3 tracking-[2px]">{label}</label>
        <input 
            type={type} 
            value={value || ''} 
            onChange={(e) => onChange(e.target.value)}
            className="w-full px-6 py-4.5 bg-white border border-slate-100 rounded-[22px] font-bold text-sm text-slate-800 outline-none focus:border-blue-500/50 transition-all shadow-sm placeholder:text-slate-200"
        />
    </div>
);

export default AccountSettings;