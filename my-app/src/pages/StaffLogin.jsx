import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, UserCircle2 } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
const API_BAS = import.meta.env.VITE_API_URL;

const StaffLogin = () => {
    const { slug } = useParams(); 
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            // Note: API endpoint staff ke hisab se hai
            const res = await axios.post(`${API_BAS}/api/staff/login`, {
                slug, // Clinic slug bhej rahe hain taaki sahi collection search ho
                email,
                password
            });
            
            localStorage.setItem('staffToken', res.data.token);
            localStorage.setItem('staffInfo', JSON.stringify(res.data.staff));
            const staffRaw = localStorage.getItem('staffInfo');
console.log("Raw Storage Data:", staffRaw); // 👈 Check karo string mein kya hai

const staffInfo = JSON.parse(staffRaw);
console.log("Parsed Staff Object:", staffInfo); // 👈 Yahan structure dekho
            
            // Staff ko Dashboard par redirect karein
            navigate(`/${slug}/dashboard/main`);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid Staff Credentials');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex font-sans antialiased bg-[#f0f4f8]"> {/* Halka greyish-blue bg */}

            {/* LEFT SIDE: STAFF LOGIN FORM */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 md:p-12 relative border-r border-slate-100 bg-[#b1ecf1]">

                <div className="w-full max-w-[400px]">
                    <div className="text-center mb-10">
                        <div className="inline-flex p-3 bg-teal-50 text-teal-600 rounded-2xl mb-4">
                            <UserCircle2 size={32} />
                        </div>
                        <h1 className="text-[32px] font-black text-slate-800 uppercase tracking-[2px]">
                            {slug ? slug.replace(/-/g, ' ') : 'Clinic Login'}
                        </h1>
                        <p className="text-xs font-bold text-teal-600 uppercase tracking-[4px] mt-1">Staff Access Portal</p>
                    </div>

                    {error && <div className="mb-6 p-3 bg-red-50 text-red-500 text-[10px] font-bold rounded-lg border border-red-100 text-center uppercase tracking-widest">{error}</div>}

                    <form onSubmit={handleLogin} className="space-y-6">
                        <div className="relative group">
                            <span className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-bold text-slate-400 uppercase">Staff Email</span>
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input
                                type="email" required placeholder="your.name@clinic.com"
                                className="w-full border border-slate-200 rounded-lg py-4 pl-12 pr-4 outline-none focus:border-teal-500 transition-all text-sm font-medium"
                                value={email} onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        <div className="relative group">
                            <span className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-bold text-slate-400 uppercase">Access Password</span>
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required placeholder="••••••••"
                                className="w-full border border-slate-200 rounded-lg py-4 pl-12 pr-4 outline-none focus:border-teal-500 transition-all text-sm font-medium"
                                value={password} onChange={(e) => setPassword(e.target.value)}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <button
                            disabled={loading}
                            className="w-full bg-slate-900 hover:bg-teal-700 text-white font-black py-4 rounded-lg shadow-lg flex items-center justify-center transition-all active:scale-95 text-xs uppercase tracking-[3px]"
                        >
                            {loading ? 'Verifying...' : 'Staff Login'}
                        </button>
                    </form>

                    <div className="mt-8 text-center">
                        <button 
                            onClick={() => navigate(`/${slug}/login`)} 
                            className="text-[12px] font-black text-slate-700 uppercase tracking-widest hover:text-teal-600 transition-all"
                        >
                            ← Back to Doctor Login
                        </button>
                    </div>
                </div>

                <div className="absolute bottom-6">
                    <p className="text-slate-600 text-[9px] font-bold uppercase tracking-[2px]">
                        Secure Access by <span className="text-slate-900 text-[20px] font-black">DocEdge</span>
                    </p>
                </div>
            </div>

            {/* RIGHT SIDE: ANIMATION */}
            <div className="hidden lg:flex w-1/2 bg-[#ffffff] flex-col justify-center items-center relative overflow-hidden">
                <div className="relative z-10 w-full max-w-[700px] scale-125">
                    <DotLottieReact
                        src="https://lottie.host/6efaabbc-d33c-465c-825a-08ba89085d89/AaXulFzLOw.lottie"
                        loop
                        autoplay
                    />
                </div>
            </div>
        </div>
    );
};

export default StaffLogin;