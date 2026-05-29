// RealClinicDashboard.jsx
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
    Users, Calendar, IndianRupee, CreditCard, PlusCircle,
    FileText, Send, Loader2, Eye, ChevronRight, ChevronLeft,
    TrendingUp, TrendingDown, CalendarDays, Sparkles,
    MoreVertical, ArrowUpRight, Bell, AlertCircle,
} from 'lucide-react';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer,
} from 'recharts';
import { useParams } from 'react-router-dom';

const API_BASE = import.meta.env.VITE_API_URL;

const initials = (name = '') => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
const avatarPalette = ['bg-blue-500', 'bg-emerald-500', 'bg-indigo-500', 'bg-rose-500', 'bg-amber-500', 'bg-violet-500'];
const avatarColor = (name = '') => avatarPalette[name.charCodeAt(0) % avatarPalette.length];

const fmt = {
    inr: n => `₹ ${Number(n || 0).toLocaleString('en-IN')}`,
    date: dt => new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
    pad: n => String(n).padStart(2, '0'),
};

const Delta = ({ val }) => {
    if (val == null) return null;
    const up = val >= 0;
    return (
        <span className={`flex items-center gap-0.5 text-[10px] font-bold mt-0.5 ${up ? 'text-emerald-600' : 'text-rose-500'}`}>
            {up ? <TrendingUp size={9} /> : <TrendingDown size={9} />}
            {Math.abs(val)}% vs yesterday
        </span>
    );
};

const THEMES = {
    blue:    { icon: 'text-blue-600',    bg: 'bg-blue-50',    hover: 'hover:border-blue-200' },
    emerald: { icon: 'text-emerald-600', bg: 'bg-emerald-50', hover: 'hover:border-emerald-200' },
    indigo:  { icon: 'text-indigo-600',  bg: 'bg-indigo-50',  hover: 'hover:border-indigo-200' },
    orange:  { icon: 'text-orange-500',  bg: 'bg-orange-50',  hover: 'hover:border-orange-200' },
    rose:    { icon: 'text-rose-500',    bg: 'bg-rose-50',    hover: 'hover:border-rose-200' },
};

const StatCard = ({ label, val, icon: Icon, color, delta }) => {
    const t = THEMES[color] || THEMES.blue;
    return (
        <div className={`bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md ${t.hover} transition-all`}>
            <div className={`${t.icon} ${t.bg} w-8 h-8 rounded-lg flex items-center justify-center mb-2`}>
                <Icon size={15} />
            </div>
            <h2 className="text-lg font-black text-slate-900 leading-none">{val}</h2>
            <p className="text-slate-500 text-[10px] font-semibold mt-0.5 leading-tight">{label}</p>
            <Delta val={delta} />
        </div>
    );
};

const ACT_ICON = {
    prescription: { Icon: FileText,     bg: 'bg-blue-50',    fg: 'text-blue-600' },
    payment:      { Icon: CreditCard,   bg: 'bg-emerald-50', fg: 'text-emerald-600' },
    appointment:  { Icon: CalendarDays, bg: 'bg-indigo-50',  fg: 'text-indigo-600' },
    patient:      { Icon: Users,        bg: 'bg-amber-50',   fg: 'text-amber-600' },
};

const ActivityIcon = ({ type }) => {
    const { Icon, bg, fg } = ACT_ICON[type] || ACT_ICON.patient;
    return (
        <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${bg}`}>
            <Icon size={12} className={fg} />
        </div>
    );
};

const MiniCalendar = () => {
    const today = new Date();
    const [cur, setCur] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
    const yr = cur.getFullYear();
    const mo = cur.getMonth();
    const firstDay = new Date(yr, mo, 1).getDay();
    const daysInMonth = new Date(yr, mo + 1, 0).getDate();
    const monthName = cur.toLocaleString('default', { month: 'long' });
    const DAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

    const cells = [
        ...Array(firstDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
    ];

    return (
        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-3">
            <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-slate-700 text-xs">{monthName} {yr}</span>
                <div className="flex gap-1 items-center">
                    <button onClick={() => setCur(new Date(yr, mo - 1, 1))} className="p-0.5 hover:bg-slate-100 rounded-lg transition-colors">
                        <ChevronLeft size={13} className="text-slate-500" />
                    </button>
                    <button
                        onClick={() => setCur(new Date(today.getFullYear(), today.getMonth(), 1))}
                        className="px-1.5 py-0.5 text-[9px] font-black text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    >
                        Today
                    </button>
                    <button onClick={() => setCur(new Date(yr, mo + 1, 1))} className="p-0.5 hover:bg-slate-100 rounded-lg transition-colors">
                        <ChevronRight size={13} className="text-slate-500" />
                    </button>
                </div>
            </div>
            <div className="grid grid-cols-7 gap-0.5 mb-1">
                {DAY_LABELS.map(d => (
                    <div key={d} className="text-center text-[8px] font-black text-slate-400 uppercase py-0.5">{d}</div>
                ))}
            </div>
            <div className="grid grid-cols-7 gap-0.5">
                {cells.map((d, i) => {
                    const isToday = d === today.getDate() && mo === today.getMonth() && yr === today.getFullYear();
                    return (
                        <div
                            key={i}
                            className={`text-center text-[10px] py-1 rounded-md transition-colors
                                ${!d ? '' : isToday
                                    ? 'bg-blue-600 text-white font-black'
                                    : 'text-slate-600 hover:bg-slate-100 font-medium cursor-pointer'
                                }`}
                        >
                            {d || ''}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const ErrorState = ({ message, onRetry }) => (
    <div className="h-screen flex flex-col items-center justify-center bg-slate-50 gap-4">
        <div className="w-16 h-16 bg-rose-50 rounded-2xl flex items-center justify-center">
            <AlertCircle size={32} className="text-rose-500" />
        </div>
        <div className="text-center">
            <h2 className="font-black text-slate-800 text-xl">Failed to load dashboard</h2>
            <p className="text-slate-500 text-sm mt-1">{message}</p>
        </div>
        <button
            onClick={onRetry}
            className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 transition-colors"
        >
            Retry
        </button>
    </div>
);

const RealClinicDashboard = () => {
    const { slug } = useParams();

    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [chartRange, setChartRange] = useState('Last 7 Days');

    const fetchDashboard = async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await axios.get(`${API_BASE}/api/advices/dashboard/${slug}`);
            if (res.data.success) {
                setData(res.data);
            } else {
                throw new Error(res.data.message || 'API returned failure');
            }
        } catch (err) {
            setError(err.response?.data?.message || err.message || 'Network error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchDashboard(); }, [slug]);

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-slate-50">
            <Loader2 className="animate-spin text-blue-600" size={40} />
        </div>
    );

    if (error) return <ErrorState message={error} onRetry={fetchDashboard} />;

    const { stats, appointments, recentPatients, chartData, recentActivity } = data;

    const todayLabel = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'long', year: 'numeric', weekday: 'long',
    });

    return (
        <div className="min-h-screen bg-[#F5F7FA]">

            {/* Top bar */}
            <div className="bg-white border-b border-slate-100 px-4 xl:px-6 py-3 flex items-center justify-between sticky top-0 z-20 shadow-sm">
                <div>
                    <h1 className="text-base font-extrabold text-slate-900 flex items-center gap-1.5">
                        Welcome back <span>👋</span>
                    </h1>
                    <p className="text-[11px] text-slate-500">Here's what's happening in your clinic today.</p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="hidden md:flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[11px] text-slate-600 font-semibold">
                        <CalendarDays size={12} />
                        {todayLabel}
                    </div>
                    <button className="relative p-1.5 rounded-lg bg-slate-50 border border-slate-200 text-slate-500 hover:text-blue-600 transition-colors">
                        <Bell size={15} />
                        {appointments.some(a => a.paymentStatus !== 'Paid') && (
                            <span className="absolute top-0.5 right-0.5 w-1.5 h-1.5 bg-rose-500 rounded-full" />
                        )}
                    </button>
                </div>
            </div>

            <div className="p-3 xl:p-5">
                <div className="grid grid-cols-12 gap-3">

                    {/* Left + centre (9 cols) */}
                    <div className="col-span-12 lg:col-span-9 space-y-3">

                        {/* Stat cards */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            <StatCard label="Total Patients"  val={stats.totalPatients}              icon={Users}       color="blue"    delta={stats.totalPatientsDelta} />
                            <StatCard label="New Patients"    val={stats.newPatientsToday}           icon={PlusCircle}  color="emerald" delta={stats.newPatientsDelta} />
                            <StatCard label="Appointments"    val={fmt.pad(stats.appointmentsCount)} icon={Calendar}    color="indigo"  delta={stats.appointmentsDelta} />
                            <StatCard label="Today's Revenue" val={fmt.inr(stats.todayRevenue)}      icon={IndianRupee} color="orange"  delta={stats.revenueDelta} />
                        </div>

                        {/* Chart + Activity */}
                        <div className="grid grid-cols-12 gap-3">

                            {/* Line chart */}
                            <div className="col-span-12 md:col-span-7 bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <div>
                                        <h3 className="font-bold text-slate-800 text-xs">Patients Overview</h3>
                                        <div className="flex items-center gap-3 mt-1">
                                            <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                                <span className="w-2.5 h-0.5 bg-blue-500 rounded inline-block" /> New Patients
                                            </span>
                                            <span className="flex items-center gap-1 text-[10px] text-slate-500">
                                                <span className="w-2.5 h-0.5 bg-emerald-500 rounded inline-block" /> Follow-up
                                            </span>
                                        </div>
                                    </div>
                                    <select
                                        value={chartRange}
                                        onChange={e => setChartRange(e.target.value)}
                                        className="text-[10px] border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-slate-50 font-semibold outline-none cursor-pointer"
                                    >
                                        <option>Last 7 Days</option>
                                    </select>
                                </div>

                                {chartData && chartData.length > 0 ? (
                                    <ResponsiveContainer width="100%" height={160}>
                                        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                                            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
                                            <YAxis tick={{ fontSize: 9, fill: '#94a3b8' }} axisLine={false} tickLine={false} allowDecimals={false} />
                                            <Tooltip
                                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: 11 }}
                                                labelStyle={{ fontWeight: 700, color: '#1e293b' }}
                                            />
                                            <Line type="monotone" dataKey="newPatients" name="New Patients" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: '#3b82f6', strokeWidth: 0 }} activeDot={{ r: 4 }} />
                                            <Line type="monotone" dataKey="followUp"    name="Follow-up"    stroke="#10b981" strokeWidth={2} dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }} activeDot={{ r: 4 }} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                ) : (
                                    <div className="h-[160px] flex items-center justify-center text-slate-400 text-xs">
                                        No chart data available yet.
                                    </div>
                                )}
                            </div>

                            {/* Recent activity */}
                            <div className="col-span-12 md:col-span-5 bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                                <h3 className="font-bold text-slate-800 text-xs mb-3">Recent Activity</h3>
                                {recentActivity && recentActivity.length > 0 ? (
                                    <div className="space-y-3">
                                        {recentActivity.slice(0, 5).map(act => (
                                            <div key={act.id} className="flex items-start gap-2.5">
                                                <ActivityIcon type={act.type} />
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs text-slate-700 font-medium leading-snug">{act.text}</p>
                                                    <p className="text-[9px] text-slate-400 mt-0.5">{act.time}</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-slate-400 text-xs text-center py-4">No recent activity.</p>
                                )}
                            </div>
                        </div>

                        {/* Recent patients table */}
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm overflow-hidden">
                            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                                <h3 className="font-bold text-slate-800 text-xs">Recent Patients</h3>
                            </div>
                            <table className="w-full">
                                <thead className="bg-slate-50">
                                    <tr>
                                        {['Name', 'Age / Gender', 'Contact', 'Last Visit', 'Action'].map(h => (
                                            <th key={h} className="px-4 py-2.5 text-left text-[9px] font-black text-slate-400 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {recentPatients && recentPatients.length > 0 ? recentPatients.slice(0, 6).map(p => (
                                        <tr key={p._id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-2">
                                                    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 ${avatarColor(p.name)}`}>
                                                        {initials(p.name)}
                                                    </div>
                                                    <span className="font-semibold text-slate-800 text-xs">{p.name}</span>
                                                </div>
                                            </td>
                                            <td className="px-4 py-2.5 text-xs text-slate-500">{p.age ?? '—'} / {p.gender ?? '—'}</td>
                                            <td className="px-4 py-2.5 text-xs text-slate-500">{p.mobile ?? '—'}</td>
                                            <td className="px-4 py-2.5 text-xs text-slate-500">{fmt.date(p.createdAt)}</td>
                                            <td className="px-4 py-2.5">
                                                <div className="flex items-center gap-1">
                                                    <button className="p-1 hover:bg-blue-50 rounded-lg text-slate-400 hover:text-blue-600 transition-colors"><Eye size={12} /></button>
                                                    <button className="p-1 hover:bg-emerald-50 rounded-lg text-slate-400 hover:text-emerald-600 transition-colors"><FileText size={12} /></button>
                                                    <button className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"><MoreVertical size={12} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="px-4 py-6 text-center text-slate-400 text-xs">No patients registered yet.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Right sidebar (3 cols) */}
                    <div className="col-span-12 lg:col-span-3 space-y-3">

                        {/* Today's appointments */}
                        <div className="bg-white rounded-xl border border-slate-100 shadow-sm p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-black text-slate-800 text-[9px] uppercase tracking-widest">Today's Appointments</h3>
                            </div>
                            <div className="space-y-2">
                                {appointments && appointments.length > 0 ? appointments.slice(0, 6).map(apt => (
                                    <div key={apt._id} className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100 hover:border-slate-200 transition-colors">
                                        <p className="text-[9px] font-black text-slate-400 min-w-[44px] text-right">{apt.time}</p>
                                        <div className="w-px h-6 bg-slate-200 flex-shrink-0" />
                                        <div className="flex-1 min-w-0">
                                            <p className="font-bold text-slate-800 text-[11px] truncate">{apt.patientName}</p>
                                            <p className="text-[9px] text-slate-400">{apt.type}</p>
                                        </div>
                                        <span className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold flex-shrink-0 ${apt.paymentStatus === 'Paid' ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                            {apt.paymentStatus === 'Paid' ? 'Done' : 'Soon'}
                                        </span>
                                    </div>
                                )) : (
                                    <p className="text-slate-400 text-xs italic text-center py-3">No appointments today.</p>
                                )}
                            </div>
                        </div>

                        {/* Calendar */}
                        <MiniCalendar />

                    </div>

                </div>
            </div>
        </div>
    );
};

export default RealClinicDashboard;