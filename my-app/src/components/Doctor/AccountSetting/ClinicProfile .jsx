import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import {
    User, Mail, MapPin, Phone, Globe, ShieldCheck,
    Stethoscope, GraduationCap, CreditCard, Clock,
    Building2, FileText, Hash, Calendar, ArrowLeft
} from 'lucide-react';
const API_BAS = import.meta.env.VITE_API_URL;


const ClinicProfile = () => {
    const { slug } = useParams();
    const [clinic, setClinic] = useState(null);
    const [loading, setLoading] = useState(true);
    

    useEffect(() => {
        const fetchClinicData = async () => {
            try {
                const res = await axios.get(`${API_BAS}/api/clinic/${slug}/clinicData`);
                if (res.data) setClinic(res.data);
            } catch (err) {
                console.error("Clinic Data Load Error:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchClinicData();
    }, [slug]);

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-3">
                <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                <p className="text-slate-500 font-medium text-sm">Loading Profile...</p>
            </div>
        </div>
    );

    if (!clinic) return <div className="p-10 text-center text-slate-500">Clinic records not found.</div>;

    return (
        <div className="min-h-screen bg-[#f8fafc] pb-20">
            {/* Top Minimal Header */}
            <div className="bg-white border-b border-slate-200">
                <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-500 hover:text-slate-800 cursor-pointer transition-colors">
                        <ArrowLeft size={18} />
                        <span className="text-sm font-medium">Back to Dashboard</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-green-50 text-green-700 rounded-full border border-green-100">
                        <ShieldCheck size={14} />
                        <span className="text-xs font-bold uppercase tracking-wider">Verified Clinic</span>
                    </div>
                </div>
            </div>

            <div className="max-w-7xl mx-auto px-6 mt-8">
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

                    {/* Left Sidebar: Branding */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm text-center">
                            <div className="w-32 h-32 mx-auto mb-4 bg-slate-50 rounded-xl border border-slate-100 flex items-center justify-center overflow-hidden">
                                {clinic.data.logo ? (
                                    <img src={`${API_BAS}${clinic.data.logo}`} alt="Logo" className="w-full h-full object-contain" />
                                ) : (
                                    <Building2 size={48} className="text-slate-300" />
                                )}
                            </div>
                            <h2 className="text-xl font-bold text-slate-900">{clinic.data.clinicName}</h2>
                            <p className="text-[20px] font-bold text-green-500 mt-1">{clinic.data.specialization}</p>
                        </div>

                        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
                            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Authorized Signature</h3>
                            <div className="bg-slate-50 rounded-lg p-4 border border-dashed border-slate-300 flex items-center justify-center">
                                {clinic.data.signature ? (
                                    <img src={`${API_BAS}${clinic.data.signature}`} alt="Signature" className="h-12 grayscale hover:grayscale-0 transition-all" />
                                ) : (
                                    <span className="text-xs text-slate-400">No signature on file</span>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Content: Details */}
                    <div className="lg:col-span-8 space-y-6">
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                            <div className="px-8 py-6 border-b border-slate-100 bg-slate-50/50">
                                <div className="flex items-center gap-3 mb-6 border-l-4 border-blue-600 pl-4">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-900 tracking-tight leading-none">
                                            Clinic Details
                                        </h3>
                                        <p className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wider">
                                            Verification & Registration Info
                                        </p>
                                    </div>
                                </div>
                            </div>
                            <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
                                <InfoItem label="Chief Medical Officer" value={clinic.data.doctorName} icon={<User />} />
                                <InfoItem label="Medical Degree" value={clinic.data.degree} icon={<GraduationCap />} />
                                <InfoItem label="Registration Number" value={clinic.data.regNumber} icon={<Hash />} />
                                <InfoItem label="Branch / Location" value={clinic.data.branchName} icon={<MapPin />} />
                                <InfoItem label="Email Address" value={clinic.data.email} icon={<Mail />} />
                                <InfoItem label="Contact Number" value={clinic.data.mobile} icon={<Phone />} />
                                <InfoItem label="Consultation Fee" value={`₹${clinic.data.consultationFee}`} icon={<CreditCard />} />
                                <InfoItem label="Follow-up Validity" value={`${clinic.data.appointmentValidity} Days`} icon={<Clock />} />
                            </div>
                        </div>

                        {/* Full Width Address Card */}
                        <div className="bg-white p-8 rounded-2xl border border-slate-200 shadow-sm flex items-start gap-4">
                            <div className="p-3 bg-blue-50 text-blue-600 rounded-lg">
                                <MapPin size={20} />
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Physical Address</h4>
                                <p className="text-slate-700 leading-relaxed">{clinic.data.address || 'Address details not available'}</p>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </div>
    );
};

const InfoItem = ({ label, value, icon }) => (
    <div className="flex items-start gap-4">
        <div className="mt-1 text-slate-400">
            {React.cloneElement(icon, { size: 18 })}
        </div>
        <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">{label}</p>
            <p className="text-[15px] font-semibold text-slate-800">{value || '—'}</p>
        </div>
    </div>
);

export default ClinicProfile;