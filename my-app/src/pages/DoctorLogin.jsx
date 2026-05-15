import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate, useParams } from 'react-router-dom';
import { Mail, Lock, Eye, EyeOff, Activity } from 'lucide-react';
import { DotLottieReact } from '@lottiefiles/dotlottie-react';
const API_BAS = import.meta.env.VITE_API_URL;


const DoctorLogin = () => {
    const { slug } = useParams(); // URL se clinic ka naam lega
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
            const res = await axios.post(`${API_BAS}/api/doctors/login/${slug}`, {
                email,
                password
            });
            localStorage.setItem('doctorToken', res.data.token);
            localStorage.setItem('doctorInfo', JSON.stringify(res.data.doctor));
            navigate(`/${slug}/dashboard/main`);
        } catch (err) {
            setError(err.response?.data?.message || 'Invalid Credentials');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen flex font-sans antialiased bg-[#e0f7f9]">

            {/* LEFT SIDE: DOCTOR LOGIN FORM */}
            <div className="w-full lg:w-1/2 flex flex-col justify-center items-center p-8 md:p-12 relative border-r border-slate-100">

                <div className="w-full max-w-[400px]">
                    {/* Clinic Name (Dynamic from Slug) */}
                    <div className="text-center mb-10">
                        <h1 className="text-[32px] font-black text-[#006e78] uppercase tracking-[2px]">
                            {slug ? slug.replace(/-/g, ' ') : 'Doctor Login'}
                        </h1>
                        <p className="text-xs font-bold text-slate-700 uppercase tracking-[4px] mt-1">Management Portal</p>
                    </div>

                    {error && <div className="mb-6 p-3 bg-red-50 text-red-500 text-[10px] font-bold rounded-lg border border-red-100 text-center uppercase tracking-widest">{error}</div>}

                    <form onSubmit={handleLogin} className="space-y-6">
                        {/* Email Field */}
                        <div className="relative group">
                            <span className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-bold text-slate-400 uppercase">Email Address</span>
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input
                                type="email" required placeholder="dr.name@example.com"
                                className="w-full border border-slate-200 rounded-lg py-4 pl-12 pr-4 outline-none focus:border-[#006e78] transition-all text-sm font-medium"
                                value={email} onChange={(e) => setEmail(e.target.value)}
                            />
                        </div>

                        {/* Password Field */}
                        <div className="relative group">
                            <span className="absolute -top-2.5 left-4 bg-white px-2 text-[10px] font-bold text-slate-400 uppercase">Secret Password</span>
                            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                            <input
                                type={showPassword ? 'text' : 'password'}
                                required placeholder="••••••••"
                                className="w-full border border-slate-200 rounded-lg py-4 pl-12 pr-4 outline-none focus:border-[#006e78] transition-all text-sm font-medium"
                                value={password} onChange={(e) => setPassword(e.target.value)}
                            />
                            <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300">
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>

                        <div className="flex items-center justify-between text-[11px] text-slate-500 font-bold uppercase tracking-wider">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input type="checkbox" className="h-4 w-4 rounded border-slate-200 text-[#006e78]" />
                                <span>Remember Me</span>
                            </label>
                            <a href="#" className="hover:text-[#006e78]">Forgot?</a>
                        </div>

                        {/* Login Button (Image 3 Color) */}
                        <button
                            disabled={loading}
                            className="w-full bg-[#0097a7] hover:bg-[#007c8a] text-white font-bold py-4 rounded-lg shadow-lg shadow-cyan-100 flex items-center justify-center transition-all active:scale-95 text-xs uppercase tracking-widest"
                        >
                            {loading ? 'Authenticating...' : 'Doctor Login'}
                        </button>
                    </form>
                    <div className="pt-4 border-t border-slate-200">
                        <button
                            onClick={() => navigate(`/${slug}/staff-login`)}
                            className="flex items-center justify-center gap-2 mx-auto bg-white border-2 border-[#006e78] text-[#006e78] px-6 py-2 rounded-full font-black text-[10px] uppercase tracking-widest hover:bg-[#006e78] hover:text-white transition-all shadow-sm"
                        >
                            <Activity size={14} /> Staff Login Portal
                        </button>
                    </div>
                </div>

                {/* Footer Credit */}
                <div className="absolute bottom-6 text-center">
                    <p className="text-slate-600 text-[9px] font-bold uppercase tracking-[4px]">
                        Powered by <span className="text-[#12398e] font-bold text-[17px] tracking-[2px]">DocEdge</span>
                    </p>

                </div>
            </div>

            {/* RIGHT SIDE: GRAPHIC SECTION (Exact Background from Image 3) */}
            <div className="hidden lg:flex w-1/2 bg-[#fffdfd] flex-col justify-center items-center relative overflow-hidden">
                {/* Aapne jo image bheji hai uska circle graphic yahan aayega */}
                <div className="relative z-10 w-full max-w-[750px] p-15 scale-150"> {/* 450 se badha kar 650 kar diya */}
                    <DotLottieReact
                        src="https://lottie.host/6efaabbc-d33c-465c-825a-08ba89085d89/AaXulFzLOw.lottie"
                        loop
                        autoplay
                        style={{ width: '100%', height: '100%' }} // Force full size
                    />
                </div>

                {/* Halka sa bottom pattern jaisa image 3 mein hai */}
                <div className="absolute bottom-0 w-full h-32 opacity-10 grayscale pointer-events-none">
                    <img src="/bottom_sketch.png" alt="sketch" className="w-full h-full object-cover" />
                </div>
            </div>

        </div>
    );
};

export default DoctorLogin;