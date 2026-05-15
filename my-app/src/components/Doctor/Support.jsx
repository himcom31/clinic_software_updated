import React from 'react';
import { 
    HelpCircle, PlayCircle, Ticket, MessageSquare, 
    Phone, Mail, Search, ChevronRight, LifeBuoy, 
    ShieldQuestion, MessageCircle
} from 'lucide-react';
import { Link ,useParams} from 'react-router-dom'; // Ise top par import kar lena

const Support = () => {
    const { slug } = useParams(); // Get the slug parameter

    return (
        <div className="min-h-screen bg-white text-slate-900 transition-all p-6 md:p-12">
            <div className="max-w-5xl mx-auto">
                
                {/* --- Header Section --- */}
                <div className="mb-16 border-b border-slate-100 pb-12">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                            <LifeBuoy size={20} />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[3px] text-slate-400">Customer Success</span>
                    </div>
                    <h1 className="text-4xl font-black tracking-tighter uppercase mb-4 text-slate-900">
                        Help & <span className="text-blue-600">Support Center</span>
                    </h1>
                    <p className="text-slate-500 max-w-xl font-medium text-sm leading-relaxed mb-8">
                        Welcome to the DocEdge support hub. Find tutorials, get technical help, or chat with our experts to keep your clinic running smoothly.
                    </p>
                    
                    {/* Simplified Search */}
                    <div className="relative max-w-lg">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                        <input 
                            type="text" 
                            placeholder="Search for answers..."
                            className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:border-blue-500/50 focus:ring-4 ring-blue-50 transition-all text-sm font-semibold"
                        />
                    </div>
                </div>

                {/* --- Support Grid --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    
                    {/* Help Center Section */}
                    <SupportItem 
                        icon={<HelpCircle size={22} />}
                        title="Help Center"
                        desc="Detailed documentation on every DocEdge feature, from billing to prescriptions."
                        btnText="Explore Articles"
                    />

                    {/* Video Tutorials Section */}
                    <SupportItem 
                        icon={<PlayCircle size={22} />}
                        title="Video Tutorials"
                        desc="Quick 2-minute videos to help you master the dashboard efficiently."
                        btnText="Watch Tutorials"
                    />

                    {/* Raise Ticket Section */}
                    <SupportItem 
                        icon={<Ticket size={22} />}
                        title="Raise Support Ticket"
                        desc="Having a technical issue? Submit a ticket and our team will fix it within 4 hours."
                        btnText="Open New Ticket"
                        path={`/${slug}/dashboard/support/ticket`}
                    />

                    {/* Chat Support Section */}
                    <SupportItem 
                        icon={<MessageCircle size={22} />}
                        title="Live Chat Support"
                        desc="Connect instantly with our support agents for real-time troubleshooting."
                        btnText="Start Conversation"
                    />

                </div>

                {/* --- Contact Strip --- */}
                <div className="mt-16 p-10 bg-slate-50 rounded-[32px] border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-8">
                    <div>
                        <h3 className="text-xl font-black uppercase text-slate-800 mb-2">Still need help?</h3>
                        <p className="text-sm text-slate-500 font-medium italic">Our executive team is available Monday - Saturday (10 AM to 7 PM)</p>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 border border-slate-100">
                                <Phone size={16} />
                            </div>
                            <span className="text-sm font-bold text-slate-700">+91 8787654532</span>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl shadow-sm flex items-center justify-center text-blue-600 border border-slate-100">
                                <Mail size={16} />
                            </div>
                            <span className="text-sm font-bold text-slate-700">support@docedge.com</span>
                        </div>
                    </div>
                </div>

                {/* --- Footer Note --- */}
                <div className="mt-12 text-center pb-12">
                    <p className="text-[9px] font-black uppercase tracking-[4px] text-slate-300">
                        DocEdge Clinical Suite • Enterprise Support
                    </p>
                </div>
            </div>
        </div>
    );
};

// --- Reusable Support Item Component ---
const SupportItem = ({ icon, title, desc, btnText , path}) => (
    <div className="flex gap-6 group">
        <div className="shrink-0 w-14 h-14 bg-white border border-slate-100 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-blue-600 group-hover:border-blue-100 group-hover:shadow-lg group-hover:shadow-blue-50 transition-all duration-300">
            {icon}
        </div>
        <div className="space-y-2">
            <h3 className="text-lg font-bold text-slate-800 uppercase tracking-tight">{title}</h3>
            <p className="text-sm text-slate-500 font-medium leading-relaxed max-w-sm">
                {desc}
            </p>
            
            
            <Link to={path} className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-blue-600 hover:gap-3 transition-all pt-2">
                {btnText} <ChevronRight size={14} />
            </Link>
        </div>
    </div>
);

export default Support;