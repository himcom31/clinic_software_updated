import React, { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Mail, Lock } from 'lucide-react';
import doctorIllu from '../assets/indomay41.jpg';
const API_BAS = import.meta.env.VITE_API_URL;

const LoginPage = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // 1. Backend hit karna (Postman wala data)
      const res = await axios.post(`${API_BAS}/api/auth/login`, { 
        email, 
        password,
        role: "admin" // Aapne kaha ki admin role zaroori hai
      });

      // 2. 🔥 LOCAL STORAGE MEIN SAVE KARNA 🔥
      // Hum pura object save kar rahe hain taaki baad mein use kar sakein
      localStorage.setItem('adminToken', res.data.token);
      localStorage.setItem('adminInfo', JSON.stringify({
        email: email,
        role: "admin",
        loginTime: new Date()
      }));

      // 3. Success message aur Redirect
      console.log("Login Successful! Token saved.");
      navigate('admin/admin/dashboard');

    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your email/password');
    }
  };

  return (
    <div className="flex min-h-screen bg-[#2b59c3]">
      {/* LEFT SIDE: Blue Illustration Area */}
      <div className="hidden lg:flex w-[45%] flex-col p-12 relative overflow-hidden">
        <div className="z-10 flex items-center gap-2 text-white opacity-90">
          <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-[#2b59c3] rounded-sm rotate-45"></div>
          </div>
          <span className="text-xl font-semibold tracking-wide uppercase">docedge</span>
        </div>

        <div className="flex-1 flex items-center justify-center relative z-10">
          <div className="relative">
            <img 
              src={doctorIllu} 
              alt="Doctor Illustration" 
              className="w-full max-w-sm drop-shadow-2xl rounded-2xl" 
            />
            <div className="absolute top-0 right-0 w-12 h-12 bg-white/10 rounded-full blur-xl"></div>
            <div className="absolute bottom-10 left-0 w-20 h-8 bg-white/5 rounded-full rotate-45"></div>
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: Login Form Area */}
      <div className="w-full lg:w-[55%] bg-white lg:rounded-l-[60px] flex items-center justify-center px-8 md:px-20">
        <div className="max-w-md w-full text-center">
          <h1 className="text-4xl font-bold text-[#2b59c3] mb-12 tracking-tight">Welcome!</h1>

          {error && (
            <div className="bg-red-50 text-red-500 p-3 rounded-lg mb-6 text-sm border border-red-100">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-400">
                <Mail size={18} />
              </span>
              <input
                type="email"
                className="w-full bg-[#f1f4fb] text-xs font-bold tracking-[0.15em] text-slate-600 placeholder-slate-400 rounded-full py-5 px-16 outline-none focus:ring-2 focus:ring-blue-300 transition-all"
                placeholder="YOUR E-MAIL"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="relative">
              <span className="absolute left-6 top-1/2 -translate-y-1/2 text-blue-400">
                <Lock size={18} />
              </span>
              <input
                type="password"
                className="w-full bg-[#f1f4fb] text-xs font-bold tracking-[0.15em] text-slate-600 placeholder-slate-400 rounded-full py-5 px-16 outline-none focus:ring-2 focus:ring-blue-300 transition-all"
                placeholder="YOUR PASSWORD"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="flex items-center justify-between px-4">
              <label className="flex items-center gap-2 cursor-pointer group">
                <input type="checkbox" className="w-4 h-4 border-2 border-blue-400 rounded-full accent-blue-500 cursor-pointer" />
                <span className="text-[10px] font-bold text-slate-400 tracking-wider">REMEMBER MY PASSWORD</span>
              </label>
              <span className="text-[10px] font-bold text-blue-500 tracking-wider hover:underline cursor-pointer">FORGOT YOUR PASSWORD?</span>
            </div>

            <div className="pt-8">
              <button
                type="submit"
                className="bg-[#00c2cb] hover:bg-[#00b0b8] text-white font-bold py-4 px-14 rounded-full shadow-lg shadow-cyan-100 transition-all active:scale-95 tracking-[0.2em] text-xs"
              >
                LOGIN
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;