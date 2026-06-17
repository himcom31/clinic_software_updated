import React, { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import {
    ArrowLeft, User, Mail, Lock, ShieldCheck, ArrowRight,
    Headset, Stethoscope, Eye, EyeOff, Check, X,
    Users, ClipboardList, CreditCard, BarChart2,
    FileText, Pill, FlaskConical, Lightbulb, CalendarPlus
} from 'lucide-react';

const API_BAS = import.meta.env.VITE_API_URL;

const PERMISSION_OPTIONS = [
    { key: 'canAddPatients',        label: 'Patient Entry',       desc: 'Add & edit patient profiles',        icon: Users         },
    { key: 'canManageAppointments', label: 'Appointments',        desc: 'View, book & cancel slots',          icon: ClipboardList },
    { key: 'canCreateAppointment',  label: 'Create Appointment',  desc: 'Schedule new appointments',          icon: CalendarPlus  },
    { key: 'canEditBilling',        label: 'Billing',             desc: 'Manage invoices & payments',         icon: CreditCard    },
    { key: 'canViewReports',        label: 'Reports',             desc: 'Access revenue & stats',             icon: BarChart2     },
    { key: 'canAddPrescription',    label: 'Prescription',        desc: 'Print & view prescriptions',         icon: FileText      },
    { key: 'canAddMedicine',        label: 'Medicines',           desc: 'Update drug & medicine list',        icon: Pill          },
    { key: 'canAddTest',            label: 'Lab Tests',           desc: 'Manage lab investigations',          icon: FlaskConical  },
    { key: 'canAddAdvice',          label: 'Advice',              desc: 'Edit patient instructions',          icon: Lightbulb     },
];

const DEFAULT_PERMISSIONS = {
    canAddPatients: true, canManageAppointments: true, canEditBilling: false,
    canViewReports: false, canAddPrescription: false, canAddMedicine: false,
    canAddTest: false, canAddAdvice: false, canDeleteData: false, canCreateAppointment: true,
};

// ── Small reusable input ─────────────────────────────────────────────────────
const Field = ({ icon: Icon, children }) => (
    <div className="relative group">
        <Icon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors pointer-events-none" />
        {children}
    </div>
);

const inputCls = "w-full pl-11 pr-4 py-3 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-800 placeholder-slate-400 outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-all";

// ── Main Component ───────────────────────────────────────────────────────────
const AddStaffForm = () => {
    const { slug }   = useParams();
    const navigate   = useNavigate();
    const [showPwd, setShowPwd]   = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [fieldErr, setFieldErr] = useState({});

    const [form, setForm] = useState({
        name: '', email: '', password: '', role: 'Receptionist',
        permissions: { ...DEFAULT_PERMISSIONS },
    });

    const set = (key, val) => setForm(prev => ({ ...prev, [key]: val }));

    const togglePerm = (key) =>
        setForm(prev => ({ ...prev, permissions: { ...prev.permissions, [key]: !prev.permissions[key] } }));

    const enabledCount = Object.values(form.permissions).filter(Boolean).length;

    const validate = () => {
        const errs = {};
        if (!form.name.trim())     errs.name     = 'Name is required';
        if (!form.email.trim())    errs.email    = 'Email is required';
        if (!form.password.trim()) errs.password = 'Password is required';
        else if (form.password.length < 6) errs.password = 'Min 6 characters';
        setFieldErr(errs);
        return Object.keys(errs).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validate()) return;
        setSubmitting(true);
        try {
            const res = await axios.post(`${API_BAS}/api/staff/${slug}/add-staff`, form);
            if (res.data.success) navigate(`/${slug}/dashboard/staff`);
        } catch (err) {
            setFieldErr({ global: err.response?.data?.message || 'Something went wrong. Please try again.' });
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-50">
            <div className="max-w-5xl mx-auto px-6 py-8">

                {/* ── Page Header ── */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="w-9 h-9 flex items-center justify-center rounded-xl border border-slate-200 bg-white hover:bg-slate-50 transition-colors"
                    >
                        <ArrowLeft size={16} className="text-slate-500" />
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">Add Staff Member</h1>
                        <p className="text-xs text-slate-400 mt-0.5">Fill in credentials and configure access permissions</p>
                    </div>
                </div>

                {/* ── Global Error ── */}
                {fieldErr.global && (
                    <div className="mb-6 flex items-center gap-2.5 bg-red-50 border border-red-100 text-red-600 text-sm font-medium px-4 py-3 rounded-xl">
                        <X size={15} className="flex-shrink-0" />
                        {fieldErr.global}
                    </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 items-start">

                        {/* ── LEFT: Identity Card ── */}
                        <div className="lg:col-span-2 space-y-4">

                            {/* Credentials */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
                                <div className="flex items-center gap-2 mb-1">
                                    <div className="w-1 h-4 bg-blue-500 rounded-full" />
                                    <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Credentials</h2>
                                </div>

                                {/* Name */}
                                <div>
                                    <Field icon={User}>
                                        <input
                                            required
                                            className={`${inputCls} ${fieldErr.name ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20' : ''}`}
                                            placeholder="Full name"
                                            value={form.name}
                                            onChange={e => { set('name', e.target.value); setFieldErr(p => ({ ...p, name: '' })); }}
                                        />
                                    </Field>
                                    {fieldErr.name && <p className="text-[11px] text-red-500 mt-1 ml-1">{fieldErr.name}</p>}
                                </div>

                                {/* Email */}
                                <div>
                                    <Field icon={Mail}>
                                        <input
                                            required
                                            type="email"
                                            className={`${inputCls} ${fieldErr.email ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20' : ''}`}
                                            placeholder="Email address"
                                            value={form.email}
                                            onChange={e => { set('email', e.target.value); setFieldErr(p => ({ ...p, email: '' })); }}
                                        />
                                    </Field>
                                    {fieldErr.email && <p className="text-[11px] text-red-500 mt-1 ml-1">{fieldErr.email}</p>}
                                </div>

                                {/* Password */}
                                <div>
                                    <Field icon={Lock}>
                                        <input
                                            required
                                            type={showPwd ? 'text' : 'password'}
                                            className={`${inputCls} pr-11 ${fieldErr.password ? 'border-red-300 focus:border-red-400 focus:ring-red-500/20' : ''}`}
                                            placeholder="Create password"
                                            value={form.password}
                                            onChange={e => { set('password', e.target.value); setFieldErr(p => ({ ...p, password: '' })); }}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowPwd(v => !v)}
                                            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                        >
                                            {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                                        </button>
                                    </Field>
                                    {fieldErr.password && <p className="text-[11px] text-red-500 mt-1 ml-1">{fieldErr.password}</p>}
                                </div>
                            </div>

                            {/* Role Selector */}
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="w-1 h-4 bg-blue-500 rounded-full" />
                                    <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Role</h2>
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { value: 'Receptionist', icon: Headset,      label: 'Receptionist' },
                                        { value: 'Assistant',    icon: Stethoscope,   label: 'Assistant'    },
                                    ].map(({ value, icon: Icon, label }) => (
                                        <button
                                            key={value}
                                            type="button"
                                            onClick={() => set('role', value)}
                                            className={`flex flex-col items-center gap-2 py-4 px-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                                                form.role === value
                                                    ? 'border-blue-500 bg-blue-50 text-blue-600'
                                                    : 'border-slate-100 bg-slate-50 text-slate-500 hover:border-slate-200'
                                            }`}
                                        >
                                            <Icon size={18} />
                                            {label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Summary badge */}
                            <div className="bg-blue-50 border border-blue-100 rounded-2xl px-4 py-3 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <ShieldCheck size={15} className="text-blue-500" />
                                    <span className="text-xs font-semibold text-blue-700">Access summary</span>
                                </div>
                                <span className="text-xs font-bold text-blue-600 bg-blue-100 px-2.5 py-1 rounded-lg">
                                    {enabledCount} / {PERMISSION_OPTIONS.length} features
                                </span>
                            </div>
                        </div>

                        {/* ── RIGHT: Permissions Matrix ── */}
                        <div className="lg:col-span-3">
                            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <div className="w-1 h-4 bg-blue-500 rounded-full" />
                                        <h2 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Feature Access</h2>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            type="button"
                                            onClick={() => setForm(prev => ({ ...prev, permissions: Object.fromEntries(Object.keys(prev.permissions).map(k => [k, true])) }))}
                                            className="text-[10px] font-bold text-blue-500 hover:text-blue-600 px-2.5 py-1 bg-blue-50 rounded-lg transition-colors"
                                        >
                                            Enable all
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setForm(prev => ({ ...prev, permissions: Object.fromEntries(Object.keys(prev.permissions).map(k => [k, false])) }))}
                                            className="text-[10px] font-bold text-slate-400 hover:text-slate-600 px-2.5 py-1 bg-slate-50 rounded-lg transition-colors"
                                        >
                                            Disable all
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    {PERMISSION_OPTIONS.map(({ key, label, desc, icon: Icon }) => {
                                        const on = form.permissions[key];
                                        return (
                                            <button
                                                key={key}
                                                type="button"
                                                onClick={() => togglePerm(key)}
                                                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border transition-all text-left ${
                                                    on
                                                        ? 'border-blue-200 bg-blue-50/60'
                                                        : 'border-slate-100 bg-slate-50 hover:border-slate-200'
                                                }`}
                                            >
                                                {/* Icon */}
                                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                                                    on ? 'bg-blue-100 text-blue-600' : 'bg-white text-slate-400 border border-slate-200'
                                                }`}>
                                                    <Icon size={15} />
                                                </div>

                                                {/* Label */}
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-xs font-semibold leading-none ${on ? 'text-blue-700' : 'text-slate-600'}`}>{label}</p>
                                                    <p className="text-[11px] text-slate-400 mt-0.5">{desc}</p>
                                                </div>

                                                {/* Toggle */}
                                                <div className={`relative w-9 h-5 rounded-full flex-shrink-0 transition-colors ${on ? 'bg-blue-500' : 'bg-slate-200'}`}>
                                                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${on ? 'left-4' : 'left-0.5'}`} />
                                                </div>
                                            </button>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* ── Footer Actions ── */}
                    <div className="flex items-center justify-between mt-6 pt-6 border-t border-slate-100">
                        <button
                            type="button"
                            onClick={() => navigate(-1)}
                            className="text-sm font-medium text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={submitting}
                            className="flex items-center gap-2.5 bg-slate-900 hover:bg-blue-600 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold px-7 py-3 rounded-xl transition-all"
                        >
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Saving...
                                </>
                            ) : (
                                <>
                                    <Check size={16} />
                                    Save Staff Member
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default AddStaffForm;