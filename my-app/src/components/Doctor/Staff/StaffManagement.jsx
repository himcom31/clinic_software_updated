import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useParams, Link } from 'react-router-dom';
import {
    UserPlus, Activity, UserCog, Loader2, ShieldCheck,
    ChevronDown, Users, Clock, Check, X, Mail,
    ClipboardList, CreditCard, BarChart2, FileText,
    Pill, FlaskConical, Lightbulb, CalendarPlus, Search,
    Pencil, Save
} from 'lucide-react';

const API_BAS = import.meta.env.VITE_API_URL;

const PERMISSIONS = [
    { key: 'canAddPatients',             label: 'Patient Entry',      icon: Users         },
    { key: 'canManageAppointments',      label: 'Appointments',       icon: ClipboardList },
    { key: 'canCreateAppointment',       label: 'Create Appt.',       icon: CalendarPlus  },
    { key: 'canViewAppointmentHistory',  label: 'Appt. History',      icon: ClipboardList },
    { key: 'canEditBilling',             label: 'Billing',            icon: CreditCard    },
    { key: 'canViewReports',             label: 'Reports',            icon: BarChart2     },
    { key: 'canAddPrescription',         label: 'Prescription',       icon: FileText      },
    { key: 'canViewPrescriptionHistory', label: 'Presc. History',     icon: FileText      },
    { key: 'canAddMedicine',             label: 'Medicines',          icon: Pill          },
    { key: 'canAddTest',                 label: 'Lab Tests',          icon: FlaskConical  },
    { key: 'canAddAdvice',               label: 'Advice',             icon: Lightbulb     },
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

// ── Permissions Edit Modal ───────────────────────────────────────────────────
const PermissionsEditModal = ({ s, onClose, onSaved, apiBase, slug }) => {
    const [draft, setDraft]   = useState(() => {
        const initial = {};
        PERMISSIONS.forEach(p => { initial[p.key] = !!s.permissions?.[p.key]; });
        return initial;
    });
    const [saving, setSaving] = useState(false);
    const [error, setError]   = useState('');

    const toggle = (key) => setDraft(prev => ({ ...prev, [key]: !prev[key] }));

    const handleSave = async () => {
        setSaving(true);
        setError('');
        try {
            const res = await axios.patch(
                `${apiBase}/api/staff/${slug}/${s._id}/permissions`,
                { permissions: draft }
            );
            if (res.data?.success) {
                onSaved(s._id, res.data.data.permissions);
                onClose();
            } else {
                setError(res.data?.message || 'Update failed');
            }
        } catch (err) {
            setError(err.response?.data?.message || 'Something went wrong while saving');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">

                {/* Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <div className="flex items-center gap-3 min-w-0">
                        <Avatar name={s.name} role={s.role} />
                        <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-800 truncate">{s.name}</p>
                            <p className="text-[11px] text-slate-400 truncate">Edit Permissions</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 hover:bg-slate-100 rounded-lg transition-colors flex-shrink-0"
                    >
                        <X size={16} className="text-slate-400" />
                    </button>
                </div>

                {/* Toggle list */}
                <div className="px-5 py-4 max-h-[60vh] overflow-y-auto space-y-1.5">
                    {PERMISSIONS.map(({ key, label, icon: Icon }) => {
                        const on = draft[key];
                        return (
                            <button
                                key={key}
                                type="button"
                                onClick={() => toggle(key)}
                                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-slate-50 transition-colors text-left"
                            >
                                <Icon size={14} className={on ? 'text-blue-600' : 'text-slate-400'} />
                                <span className={`flex-1 text-xs font-medium ${on ? 'text-slate-800' : 'text-slate-400'}`}>
                                    {label}
                                </span>
                                <span
                                    className={`relative inline-flex h-5 w-9 flex-shrink-0 items-center rounded-full transition-colors ${
                                        on ? 'bg-blue-500' : 'bg-slate-200'
                                    }`}
                                >
                                    <span
                                        className={`inline-block h-4 w-4 bg-white rounded-full shadow transform transition-transform ${
                                            on ? 'translate-x-4' : 'translate-x-0.5'
                                        }`}
                                    />
                                </span>
                            </button>
                        );
                    })}
                </div>

                {error && (
                    <div className="px-5 py-2">
                        <p className="text-[11px] text-red-500 font-medium">{error}</p>
                    </div>
                )}

                {/* Footer */}
                <div className="flex items-center gap-3 px-5 py-4 border-t border-slate-100 bg-slate-50/70">
                    <button
                        onClick={onClose}
                        disabled={saving}
                        className="flex-1 text-xs font-semibold text-slate-500 hover:text-slate-700 py-2.5 rounded-xl transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex-1 flex items-center justify-center gap-2 bg-slate-900 hover:bg-blue-600 text-white text-xs font-semibold py-2.5 rounded-xl transition-all disabled:opacity-60"
                    >
                        {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                        {saving ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
};

// ── Staff Card ───────────────────────────────────────────────────────────────
const StaffCard = ({ s, expanded, onToggle, onEditClick }) => {
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

            {/* Expand Toggle + Edit Permissions */}
            <div className="flex items-stretch border-t border-slate-50 bg-slate-50/70">
                <button
                    onClick={onToggle}
                    className="flex-1 flex items-center justify-between px-5 py-3 hover:bg-slate-100 transition-colors text-left"
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
                <button
                    onClick={onEditClick}
                    className="flex items-center gap-1.5 px-4 py-3 border-l border-slate-100 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition-colors"
                >
                    <Pencil size={12} />
                    Edit
                </button>
            </div>

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
    const [editingStaff, setEditingStaff] = useState(null);

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

    const handlePermissionsSaved = (staffId, updatedPermissions) => {
        setStaff(prev => prev.map(member =>
            member._id === staffId ? { ...member, permissions: updatedPermissions } : member
        ));
    };

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
                                    onEditClick={() => setEditingStaff(s)}
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

            {/* ── Edit Permissions Modal ── */}
            {editingStaff && (
                <PermissionsEditModal
                    s={editingStaff}
                    apiBase={API_BAS}
                    slug={slug}
                    onClose={() => setEditingStaff(null)}
                    onSaved={handlePermissionsSaved}
                />
            )}
        </div>
    );
};

export default StaffManagement;