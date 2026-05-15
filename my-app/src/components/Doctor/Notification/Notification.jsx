import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Bell, Smartphone, Mail, CheckCircle, Info } from 'lucide-react';
import { toast, Toaster } from 'react-hot-toast';
import { useParams } from 'react-router-dom';
const API_BAS = import.meta.env.VITE_API_URL;


const NotificationManager = () => {
        const { slug } = useParams();
    
  const [activeTab, setActiveTab] = useState('sms');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({
    smsEnabled: false, smsProvider: 'MSG91', smsApiKey: '',
    waEnabled: false, waPhoneId: '', waToken: '', waTemplate: '',
    emailHost: '', emailPort: 587, emailUser: '', emailPass: '', emailFrom: ''
  });

  // Fetch Existing Config
  useEffect(() => {
    const loadConfig = async () => {
      try {
        const res = await axios.get(`${API_BAS}/api/notifications/${slug}`);
        if (res.data.data) setConfig(res.data.data);
      } catch (err) { console.error("Error loading config"); }
    };
    loadConfig();
  }, [slug]);

  const handleSave = async () => {
    setLoading(true);
    try {
      await axios.post(`${API_BAS}/api/notifications/${slug}`, config);
      toast.success("All configurations saved securely!");
    } catch (err) {
      toast.error("Failed to update settings");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-6">
      <Toaster />
      <div className="max-w-5xl mx-auto bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Banner */}
        <div className="bg-slate-900 p-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <Bell className="text-blue-400" /> Notification Gateway
            </h1>
            <p className="text-slate-400 text-sm mt-1">Configure your SMS, WhatsApp and Email API settings</p>
          </div>
          <div className="bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full text-xs font-bold border border-emerald-500/20">
            System Connected
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex bg-slate-50 border-b">
          <button onClick={() => setActiveTab('sms')} className={`flex-1 py-4 font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'sms' ? 'text-blue-600 border-b-4 border-blue-600 bg-white' : 'text-slate-500'}`}>
            SMS Gateway
          </button>
          <button onClick={() => setActiveTab('wa')} className={`flex-1 py-4 font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'wa' ? 'text-green-600 border-b-4 border-green-600 bg-white' : 'text-slate-500'}`}>
            WhatsApp Cloud API
          </button>
          <button onClick={() => setActiveTab('email')} className={`flex-1 py-4 font-bold text-sm uppercase tracking-wider transition-all ${activeTab === 'email' ? 'text-purple-600 border-b-4 border-purple-600 bg-white' : 'text-slate-500'}`}>
            Email (SMTP)
          </button>
        </div>

        {/* Forms Container */}
        <div className="p-10">
          
          {/* SMS SECTION */}
          {activeTab === 'sms' && (
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="flex items-center justify-between bg-blue-50 p-4 rounded-2xl border border-blue-100">
                <span className="text-blue-900 font-bold">Enable SMS Triggers for Bookings</span>
                <input type="checkbox" checked={config.smsEnabled} onChange={(e)=>setConfig({...config, smsEnabled: e.target.checked})} className="w-6 h-6 accent-blue-600" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Provider</label>
                  <select value={config.smsProvider} onChange={(e)=>setConfig({...config, smsProvider: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-xl outline-none focus:ring-2 ring-blue-500">
                    <option>MSG91</option>
                    <option>Twilio</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">API Key</label>
                  <input type="password" value={config.smsApiKey} onChange={(e)=>setConfig({...config, smsApiKey: e.target.value})} className="w-full p-4 bg-slate-50 border rounded-xl outline-none" placeholder="Paste Auth Key" />
                </div>
              </div>
            </div>
          )}

          {/* WHATSAPP SECTION */}
          {activeTab === 'wa' && (
            
            <div className="space-y-6 animate-in slide-in-from-bottom-2 duration-300">
                <div className="flex items-center justify-between bg-green-50 p-4 rounded-2xl border border-green-100">
      <span className="text-green-900 font-bold">Enable WhatsApp Notifications</span>
      <input
        type="checkbox"
        checked={config.waEnabled}
        onChange={(e) => setConfig({ ...config, waEnabled: e.target.checked })}
        className="w-6 h-6 accent-green-600"
      />
    </div>
              <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl flex gap-3 text-amber-800 text-sm">
                <Info size={20} /> Use Meta Cloud API credentials for PDF automation.
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Phone Number ID</label>
                  <input type="text" value={config.waPhoneId} onChange={(e)=>setConfig({...config, waPhoneId: e.target.value})} className="w-full p-4 border rounded-xl" />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Message Template</label>
                  <input type="text" value={config.waTemplate} onChange={(e)=>setConfig({...config, waTemplate: e.target.value})} className="w-full p-4 border rounded-xl" placeholder="e.g. prescription_v1" />
                </div>
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-bold text-slate-500 uppercase">Access Token</label>
                  <textarea rows="3" value={config.waToken} onChange={(e)=>setConfig({...config, waToken: e.target.value})} className="w-full p-4 border rounded-xl font-mono text-sm" />
                </div>
              </div>
            </div>
          )}

          {/* EMAIL SECTION */}
          {activeTab === 'email' && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-bottom-2 duration-300">
              <div className="md:col-span-2 space-y-2">
                 <div className="flex items-center justify-between bg-purple-50 p-4 rounded-2xl border border-purple-100">
            <span className="text-purple-900 font-bold">Enable Email Notifications</span>
            <input 
                type="checkbox" 
                checked={config.emailEnabled}
                onChange={(e) => setConfig({ ...config, emailEnabled: e.target.checked })}
                className="w-6 h-6 accent-purple-600" 
            />
        </div>

                <label className="text-xs font-bold text-slate-500 uppercase">SMTP Host</label>
                <input type="text" value={config.emailHost} onChange={(e)=>setConfig({...config, emailHost: e.target.value})} className="w-full p-4 border rounded-xl" placeholder="smtp.gmail.com" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">Port</label>
                <input type="number" value={config.emailPort} onChange={(e)=>setConfig({...config, emailPort: e.target.value})} className="w-full p-4 border rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">User Email</label>
                <input type="email" value={config.emailUser} onChange={(e)=>setConfig({...config, emailUser: e.target.value})} className="w-full p-4 border rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">App Password</label>
                <input type="password" value={config.emailPass} onChange={(e)=>setConfig({...config, emailPass: e.target.value})} className="w-full p-4 border rounded-xl" />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 uppercase">From Address</label>
                <input type="text" value={config.emailFrom} onChange={(e)=>setConfig({...config, emailFrom: e.target.value})} className="w-full p-4 border rounded-xl" />
              </div>
            </div>
          )}

          {/* Save Button */}
          <div className="mt-12 flex justify-end">
            <button
              onClick={handleSave}
              disabled={loading}
              className="bg-slate-900 text-white px-12 py-4 rounded-2xl font-bold flex items-center gap-2 hover:bg-black transition-all active:scale-95 disabled:opacity-50"
            >
              {loading ? "Saving..." : <><Save size={20} /> Update Configuration</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationManager;