import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Mail, Phone, Globe, ExternalLink, ShieldCheck, Clipboard, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
const API_BAS = import.meta.env.VITE_API_URL;

const DoctorsDataList = () => {
    const [doctors, setDoctors] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDoctors = async () => {
            try {
                const token = localStorage.getItem('adminToken');
                const res = await axios.get(`${API_BAS}/api/doctors/all`, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                setDoctors(res.data);
            } catch (err) {
                console.error("Error fetching data", err);
            } finally {
                setLoading(false);
            }
        };
        fetchDoctors();
    }, []);

    // URL Copy karne ke liye function
    const copyToClipboard = (url) => {
        navigator.clipboard.writeText(url);
        alert("Portal URL copied to clipboard!");
    };

    if (loading) return <div className="p-10 text-center font-bold text-slate-500 italic">Fetching Clinics Info...</div>;

    return (
        <div className="animate-in fade-in duration-500 pb-10">
            <div className="mb-6">
                <h1 className="text-2xl font-bold text-slate-800">Clinic Management</h1>
                <p className="text-slate-500 text-sm">Verify clinic slugs and portal status.</p>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[2px]">Clinic & Slug</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[2px]">Login Portal URL</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[2px]">Status</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[2px]">Contact</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[2px] text-center">Location</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[2px] text-center">Letterhead</th>
                                <th className="px-6 py-4 text-[10px] font-bold text-slate-400 uppercase tracking-[2px] text-center">Form setup</th>


                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {doctors.map((doc) => {
                                // Full Portal URL generate karna (Admin link jo doctor ko bheja gaya hai)
                                const fullPortalUrl = `https://docedge.tbskit.cloud/${doc.slug}/login`;
                                const LetterHeadUrl = `/admin/setup-letterhead/${doc.slug}`;
                                const formBuilder = `/admin/setup-form/${doc.slug}`;

                                return (
                                    <tr key={doc._id} className="hover:bg-slate-50/50 transition-colors">
                                        {/* Clinic & Slug */}
                                        <td className="px-6 py-4">
                                            <p className="text-sm font-bold text-slate-800 uppercase">{doc.clinicName}</p>
                                            <span className="text-[10px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded mt-1 inline-block font-mono">
                                                slug: {doc.slug}
                                            </span>
                                        </td>

                                        {/* Full Slug URL with Copy Button */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 group">
                                                <div className="bg-blue-50 text-blue-600 px-3 py-2 rounded-lg text-[11px] font-medium border border-blue-100 max-w-[200px] truncate">
                                                    {fullPortalUrl}
                                                </div>
                                                <button
                                                    onClick={() => copyToClipboard(fullPortalUrl)}
                                                    className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                                    title="Copy Link"
                                                >
                                                    <Clipboard size={14} />
                                                </button>
                                                <a
                                                    href={fullPortalUrl}
                                                    target="_blank"
                                                    rel="noreferrer"
                                                    className="p-2 text-slate-400 hover:text-green-600 transition-colors"
                                                >
                                                    <ExternalLink size={14} />
                                                </a>
                                            </div>
                                        </td>

                                        {/* Email/Login Status */}
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-1.5 text-green-600 font-bold text-[10px] uppercase tracking-wider bg-green-50 px-3 py-1 rounded-full border border-green-100 inline-flex">
                                                <ShieldCheck size={12} /> Credentials Sent
                                            </div>
                                        </td>

                                        {/* Contact */}
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                                                    <Mail size={12} /> {doc.email}
                                                </div>
                                                <div className="flex items-center gap-2 text-slate-500 text-[11px]">
                                                    <Phone size={12} /> {doc.mobile}
                                                </div>
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-2 text-slate-600 text-xs">
                                                <MapPin size={14} className="text-slate-400" /> {doc.address}
                                            </div>
                                        </td>

                                        <td className="px-6 py-4">
                                            <Link
                                                to={LetterHeadUrl}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 text-slate-400 hover:text-green-600 transition-colors"
                                            >
                                                <ExternalLink size={14} />
                                            </Link>
                                        </td>

                                        <td className="px-6 py-4">
                                            <Link
                                                to={formBuilder}
                                                target="_blank"
                                                rel="noreferrer"
                                                className="p-2 text-slate-400 hover:text-blue-600 transition-colors"
                                            >
                                                <ExternalLink size={14} />
                                            </Link>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default DoctorsDataList;