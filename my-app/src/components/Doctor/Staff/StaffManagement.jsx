import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import {
    UserPlus, Activity, UserCog, Loader2, ShieldCheck,
    ChevronDown, Users, Clock, Check, X, Mail,
    ClipboardList, CreditCard, BarChart2, FileText,
    Pill, FlaskConical, Lightbulb, CalendarPlus, Search
} from 'lucide-react';

const API_BAS = import.meta.env.VITE_API_URL;

const PERMISSIONS = [
    { key: 'canAddPatients',        label: 'Patient Entry',      icon: Users         },
    { key: 'canManageAppointments', label: 'Appointments',       icon: ClipboardList },
    { key: 'canCreateAppointment',  label: 'Create Appt.',       icon: CalendarPlus  },
    { key: 'canEditBilling',        label: 'Billing',            icon: CreditCard    },
    { key: 'canViewReports',        label: 'Reports',            icon: BarChart2     },
    { key: 'canAddPrescription',    label: 'Prescription',       icon: FileText      },
    { key: 'canAddMedicine',        label: 'Medicines',          icon: Pill          },
    { key: 'canAddTest',            label: 'Lab Tests',          icon: FlaskConical  },
    { key: 'canAddAdvice',          label: 'Advice',             icon: Lightbulb     },
];

const ROLE_COLORS = {
    Receptionist: { bg: 'bg-violet-50',  text: 'text-violet-600',  border: 'border-violet-100' },
    Assistant:    { bg: 'bg-blue-50',    text: 'text-blue-600',    border: 'border-blue-100'   },
};
const getRoleStyle = (role) => ROLE_COLORS[role] || ROLE_COLORS['Receptionist'];

// ── Avatar initials ──────────────────────────────────────────────────────────
const Avatar = ({ name, role }) => {
    const initials = name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || '?';
    const s = getRoleStyle(role);
    return (
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-sm font-bold flex-shrink-0 ${s.bg} ${s.text}`}>
            {initials}
        </div>
    );
};

// ── Staff Card ───────────────────────────────────────────────────────────────
const StaffCard = ({ s, expanded, onToggle }) => {
    const roleStyle   = getRoleStyle(s.role);
    const enabledCount = PERMISSIONS.filter(p => s.permissions?.[p.key]).length;

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">

            {/* Card Header */}
            <div className="p-5">
                <div className="flex items-start justify-between gap-3 mb-4">
                    <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={s.name} role={s.role} />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                            <p className="text-xs text-slate-400 truncate flex items-center gap-1 mt-0.5">
                                <Mail size={10} /> {s.email}
                            </p>
                        </div>
                    </div>
                    <span className={`flex-shrink-0 text-[10px] font-semibold px-2.5 py-1 rounded-lg border ${roleStyle.bg} ${roleStyle.text} ${roleStyle.border}`}>
                        {s.role}
                    </span>
                </div>

                {/* Access summary bar */}
                <div className="flex items-center gap-3">
                    <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-blue-400 rounded-full transition-all"
                            style={{ width: `${(enabledCount / PERMISSIONS.length) * 100}%` }}
                        />
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium flex-shrink-0">
                        {enabledCount}/{PERMISSIONS.length} features
                    </span>
                </div>
            </div>

            {/* Expand Toggle */}
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between px-5 py-3 border-t border-slate-50 bg-slate-50/70 hover:bg-slate-100 transition-colors text-left"
            >
                <span className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500">
                    <ShieldCheck size={13} className="text-slate-400" />
                    Access permissions
                </span>
                <ChevronDown
                    size={14}
                    className={`text-slate-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
                />
            </button>

            {/* Permissions Grid */}
            <div className={`transition-all duration-300 overflow-hidden ${expanded ? 'max-h-[400px]' : 'max-h-0'}`}>
                <div className="px-5 py-4 grid grid-cols-2 gap-1.5">
                    {PERMISSIONS.map(({ key, label, icon: Icon }) => {
                        const on = s.permissions?.[key];
                        return (
                            <div
                                key={key}
                                className={`flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] font-medium ${
                                    on
                                        ? 'bg-blue-50 text-blue-700'
                                        : 'bg-slate-50 text-slate-400'
                                }`}
                            >
                                <Icon size={11} className="flex-shrink-0" />
                                <span className="truncate">{label}</span>
                                {on
                                    ? <Check size={10} className="ml-auto flex-shrink-0 text-blue-500" />
                                    : <X    size={10} className="ml-auto flex-shrink-0 text-slate-300" />
                                }
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

// ── Log Row ──────────────────────────────────────────────────────────────────
const LogRow = ({ log }) => (
    <div className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 transition-colors">
        <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Activity size={14} className="text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-700 truncate">{log.action}</p>
            <p className="text-[11px] text-slate-400 mt-0.5">{log.staffName}</p>
        </div>
        {log.details && (
            <span className="text-[11px] font-medium text-green-600 bg-green-50 px-2.5 py-1 rounded-lg flex-shrink-0">
                {log.details}
            </span>
        )}
        <p className="text-[11px] text-slate-400 flex-shrink-0 flex items-center gap-1">
            <Clock size={10} />
            {new Date(log.timestamp).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
        </p>
    </div>
);

// ── Main Component ───────────────────────────────────────────────────────────
const StaffManagement = () => {
    const { slug } = useParams();
    const [staff, setStaff]               = useState([]);
    const [logs, setLogs]                 = useState([]);
    const [loading, setLoading]           = useState(true);
    const [activeTab, setActiveTab]       = useState('staff');
    const [expandedId, setExpandedId]     = useState(null);
    const [search, setSearch]             = useState('');

    useEffect(() => { fetchData(); }, [slug]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [staffRes, logsRes] = await Promise.all([
                axios.get(`${API_BAS}/api/staff/${slug}/list`),
                axios.get(`${API_BAS}/api/staff/${slug}/activity-logs`),
            ]);
            setStaff(staffRes.data.data  || []);
            setLogs(logsRes.data.data    || []);
        } catch (err) { console.error(err); }
        finally { setLoading(false); }
    };

    const filteredStaff = staff.filter(s =>
        s.name?.toLowerCase().includes(search.toLowerCase()) ||
        s.email?.toLowerCase().includes(search.toLowerCase()) ||
        s.role?.toLowerCase().includes(search.toLowerCase())
    );

    const filteredLogs = logs.filter(l =>
        l.action?.toLowerCase().includes(search.toLowerCase()) ||
        l.staffName?.toLowerCase().includes(search.toLowerCase())
    );

    if (loading) return (
        <div className="flex h-screen items-center justify-center bg-slate-50">
            <div className="flex flex-col items-center gap-3">
                <Loader2 className="animate-spin text-blue-500" size={28} />
                <p className="text-xs text-slate-400 font-medium">Loading staff data...</p>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-6xl mx-auto px-6 py-8">

                {/* ── Page Header ── */}
                <div className="flex items-start justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Staff Management</h1>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {staff.length} member{staff.length !== 1 ? 's' : ''} · {logs.length} activity logs
                        </p>
                    </div>
                    <Link
                        to={`/${slug}/dashboard/staff/add`}
                        className="flex items-center gap-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition-all shadow-sm"
                    >
                        <UserPlus size={15} />
                        Add Staff
                    </Link>
                </div>

                {/* ── Tabs + Search bar ── */}
                <div className="flex items-center gap-3 mb-6">
                    {/* Tabs */}
                    <div className="flex bg-white border border-slate-100 rounded-xl p-1 shadow-sm">
                        {[
                            { key: 'staff', label: 'Members',       icon: Users    },
                            { key: 'logs',  label: 'Activity Logs', icon: Activity },
                        ].map(({ key, label, icon: Icon }) => (
                            <button
                                key={key}
                                onClick={() => { setActiveTab(key); setSearch(''); }}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all ${
                                    activeTab === key
                                        ? 'bg-slate-900 text-white shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'
                                }`}
                            >
                                <Icon size={13} />
                                {label}
                            </button>
                        ))}
                    </div>

                    {/* Search */}
                    <div className="relative flex-1 max-w-xs">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder={activeTab === 'staff' ? 'Search by name, email, role...' : 'Search logs...'}
                            className="w-full pl-9 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-300 transition-all shadow-sm"
                        />
                    </div>

                    {/* Count badge */}
                    <span className="text-xs text-slate-400 font-medium ml-auto">
                        {activeTab === 'staff'
                            ? `${filteredStaff.length} result${filteredStaff.length !== 1 ? 's' : ''}`
                            : `${filteredLogs.length} log${filteredLogs.length !== 1 ? 's' : ''}`
                        }
                    </span>
                </div>

                {/* ── Staff Grid ── */}
                {activeTab === 'staff' && (
                    filteredStaff.length === 0 ? (
                        <div className="text-center py-20 bg-white rounded-2xl border border-slate-100">
                            <UserCog size={32} className="text-slate-300 mx-auto mb-3" />
                            <p className="text-sm font-medium text-slate-400">No staff members found</p>
                            {search && <p className="text-xs text-slate-300 mt-1">Try a different search term</p>}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {filteredStaff.map(s => (
                                <StaffCard
                                    key={s._id}
                                    s={s}
                                    expanded={expandedId === s._id}
                                    onToggle={() => setExpandedId(expandedId === s._id ? null : s._id)}
                                />
                            ))}
                        </div>
                    )
                )}

                {/* ── Logs List ── */}
                {activeTab === 'logs' && (
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        {filteredLogs.length === 0 ? (
                            <div className="text-center py-20">
                                <Activity size={32} className="text-slate-300 mx-auto mb-3" />
                                <p className="text-sm font-medium text-slate-400">No activity logs found</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-slate-50">
                                {filteredLogs.map(log => <LogRow key={log._id} log={log} />)}
                            </div>
                        )}
                    </div>
                )}

            </div>
        </div>
    );
};

export default StaffManagement;