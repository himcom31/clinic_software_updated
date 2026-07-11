/**
 * useBillingData.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Custom React hook that owns ALL state, API calls, and derived calculations
 * for the BillingModule. Components consume this hook and stay purely
 * presentational (except for inline JSX helpers that are trivially small).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL;

/* ── In-memory 30-second cache ──────────────────────────────────────────── */
const cache = new Map();
const CACHE_TTL = 30_000;
const getCache = (key) => {
    const entry = cache.get(key);
    if (!entry) return null;
    if (Date.now() - entry.ts > CACHE_TTL) { cache.delete(key); return null; }
    return entry.data;
};
const setCache = (key, data) => cache.set(key, { data, ts: Date.now() });
export const clearCache = () => cache.clear();

/* ── Date helpers ───────────────────────────────────────────────────────── */
export const toLocalISO = (date) => {
    const d = new Date(date);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
export const today = toLocalISO(new Date());

const getMonthRange = (offset = 0) => {
    const d = new Date();
    d.setMonth(d.getMonth() + offset, 1);
    const start = toLocalISO(d);
    d.setMonth(d.getMonth() + 1, 0);
    const end = toLocalISO(d);
    return { start, end };
};

/* ── Patient-id extractor ───────────────────────────────────────────────── */
export const getPatientId = (appt) => {
    const raw = appt.patientId;
    if (!raw) return appt._id;
    if (typeof raw === 'string') return raw;
    if (typeof raw === 'object' && raw._id) return String(raw._id);
    return String(raw);
};

/* ── Constants ──────────────────────────────────────────────────────────── */
export const STATUS_OPTIONS = ['All', 'Pending', 'Billed'];
export const VISIT_OPTIONS = ['All', 'New', 'Revisit'];
export const DATE_PRESET_OPTIONS = [
    { label: 'Today', value: 'today' },
    { label: 'Yesterday', value: 'yesterday' },
    { label: 'This Month', value: 'this_month' },
    { label: 'Last Month', value: 'last_month' },
    { label: 'Custom Range', value: 'custom' },
];

/* ═══════════════════════════════════════════════════════════════════════════
   HOOK
═══════════════════════════════════════════════════════════════════════════ */
const useBillingData = (slug) => {

    /* ── View ── */
    const [view, setView] = useState('queue'); // 'queue' | 'form' | 'history'

    /* ── Clinic & Doctor Info ── */
    const [clinicInfo, setClinicInfo] = useState({
        clinicName: '',
        doctorName: '',
        email: '',
        mobile: '',
        address: '',
        logoBase64: null,
    });

    /* ── Queue / Appointments ── */
    const [appointments, setAppointments] = useState([]);
    const [loading, setLoading] = useState(true);
    const abortRef = useRef(null);

    /* ── Filter State ── */
    const [showFilters, setShowFilters] = useState(false);
    const [searchText, setSearchText] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [visitFilter, setVisitFilter] = useState('All');
    const [datePreset, setDatePreset] = useState('today');
    const [customStart, setCustomStart] = useState(today);
    const [customEnd, setCustomEnd] = useState(today);

    /* ── Billing Form State ── */
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedPatient, setSelectedPatient] = useState(null);
    const [items, setItems] = useState([]);
    const [discount, setDiscount] = useState(0);
    const [paidAmount, setPaidAmount] = useState(0);
    const [paymentMode, setPaymentMode] = useState('Cash');
    const [formLoading, setFormLoading] = useState(false);
    const [manualFeeName, setManualFeeName] = useState('');
    const [manualFeePrice, setManualFeePrice] = useState('');
    const [patientHistory, setPatientHistory] = useState([]);

    /* ── Edit Mode ── */
    const [editMode, setEditMode] = useState(false);
    const [editInvoiceId, setEditInvoiceId] = useState(null);

    /* ── History ── */
    const [allHistory, setAllHistory] = useState([]);
    const [historySearch, setHistorySearch] = useState('');
    const [historyLoading, setHistoryLoading] = useState(false);

    /* ── PDF / download loading ── */
    const [pdfLoading, setPdfLoading] = useState(null);
    const [downloadLoading, setDownloadLoading] = useState(null);
    const clinicInfoRef = useRef(null); // ADD THIS


    /* ══════════════════════════════════════════════════════════════════════════
       DERIVED VALUES
    ══════════════════════════════════════════════════════════════════════════ */
    const isRevisit = selectedPatient?.visitType === 'Revisit' ||
        selectedPatient?.visitType === 'Revisit Patient' ||
        selectedPatient?.type === 'Revisit' ||
        selectedPatient?.isRevisit === true;

    const subTotal = items.reduce((acc, i) => acc + i.price * (i.qty || 1), 0);
    const discountAmount = (subTotal * Number(discount)) / 100;
    const grandTotal = subTotal - discountAmount;
    const due = grandTotal - Number(paidAmount);

    /* ── Active date range ── */
    const activeDateRange = useMemo(() => {
        if (datePreset === 'today') return { start: today, end: today };
        if (datePreset === 'yesterday') {
            const d = new Date(); d.setDate(d.getDate() - 1);
            const y = toLocalISO(d); return { start: y, end: y };
        }
        if (datePreset === 'this_month') return getMonthRange(0);
        if (datePreset === 'last_month') return getMonthRange(-1);
        if (datePreset === 'custom') return { start: customStart, end: customEnd };
        return { start: null, end: null };
    }, [datePreset, customStart, customEnd]);

    /* ── Filtered queue ── */
    const filteredQueue = useMemo(() => {
        return appointments.filter(appt => {
            if (searchText.trim()) {
                const q = searchText.trim().toLowerCase();
                if (!appt.patientName?.toLowerCase().includes(q) && !appt.mobile?.includes(q)) return false;
            }
            if (visitFilter !== 'All') {
                const isRev = appt.visitType === 'Revisit' || appt.visitType === 'Revisit Patient' ||
                    appt.type === 'Revisit' || appt.isRevisit;
                if (visitFilter === 'Revisit' && !isRev) return false;
                if (visitFilter === 'New' && isRev) return false;
            }
            if (statusFilter !== 'All') {
                const billedStatus = appt.isBilled ? 'Billed' : 'Pending';
                if (billedStatus !== statusFilter) return false;
            }
            if (activeDateRange.start && activeDateRange.end) {
                const apptDate = toLocalISO(new Date(appt.appointmentDate));
                if (apptDate < activeDateRange.start || apptDate > activeDateRange.end) return false;
            }
            return true;
        });
    }, [appointments, searchText, visitFilter, statusFilter, activeDateRange]);

    /* ── Active filter badge count ── */
    const activeFilterCount = useMemo(() => {
        let count = 0;
        if (searchText.trim()) count++;
        if (statusFilter !== 'All') count++;
        if (visitFilter !== 'All') count++;
        if (datePreset !== 'today') count++;
        return count;
    }, [searchText, statusFilter, visitFilter, datePreset]);

    /* ── Stats ── */
    const stats = useMemo(() => ({
        total: filteredQueue.length,
        pending: filteredQueue.filter(a => !a.isBilled).length,
        billed: filteredQueue.filter(a => a.isBilled).length,
    }), [filteredQueue]);

    /* ── Filtered history ── */
    const filteredHistory = useMemo(() => allHistory.filter(inv =>
        inv.patientName?.toLowerCase().includes(historySearch.toLowerCase()) ||
        inv.invoiceNo?.toLowerCase().includes(historySearch.toLowerCase()) ||
        inv.mobile?.includes(historySearch)
    ), [allHistory, historySearch]);

    /* ══════════════════════════════════════════════════════════════════════════
       FETCH: Clinic Info + Logo
    ══════════════════════════════════════════════════════════════════════════ */
    useEffect(() => {
        if (!slug) return;

        const fetchClinicInfo = async () => {
            try {
                /* ── Clinic data ──────────────────────────────────────────────────
                   ClinicProfile confirms the shape is:
                     res.data          → { data: { clinicName, logo, email, … } }
                   So the real payload lives at res.data.data
                ──────────────────────────────────────────────────────────────────── */
                const clinicRes = await axios.get(`${API_BASE}/api/clinic/${slug}/clinicData`);
                const clinicData = clinicRes.data?.data || {};   // ← .data.data, matching ClinicProfile

                /* ── Doctor profile ───────────────────────────────────────────────
                   Route: GET /:slug/profileDoc  (protected)
                   Expected keys from that route: clinicName, doctorName, email,
                   mobile, location (same model fields used in ClinicProfile)
                ──────────────────────────────────────────────────────────────────── */
                const docRes = await axios.get(`${API_BASE}/api/doctors/${slug}/profileDoc`, {
                    headers: { Authorization: `Bearer ${localStorage.getItem('doctorToken') || ''}` },
                });
                const docData = docRes.data?.data || docRes.data || {};

                /* ── Logo ─────────────────────────────────────────────────────────
                   ClinicProfile renders: `${API_BAS}${clinic.data.logo}`
                   So clinic.data.logo is a relative path like "/uploads/logo.png".
                   We must prepend API_BASE before fetching it as an image.
                ──────────────────────────────────────────────────────────────────── */
                let logoBase64 = null;
                const logoPath = clinicData.logo || null;   // relative path from server
                if (logoPath) {
                    // Build the full absolute URL exactly as ClinicProfile does
                    const fullLogoUrl = `${API_BASE}${logoPath}`;
                    try {
                        const imgRes = await fetch(fullLogoUrl);
                        const blob = await imgRes.blob();
                        logoBase64 = await new Promise((resolve, reject) => {
                            const reader = new FileReader();
                            reader.onload = () => resolve(reader.result);
                            reader.onerror = reject;
                            reader.readAsDataURL(blob);
                        });
                    } catch { /* logo unreachable — silently skip, PDF shows placeholder */ }
                }

                const info = {
                    clinicName: docData.clinicName || clinicData.clinicName || slug,
                    doctorName: docData.doctorName || docData.name || clinicData.doctorName || '',
                    email: docData.email || clinicData.email || '',
                    mobile: docData.mobile || docData.phone || clinicData.mobile || '',
                    address: docData.location || docData.address || clinicData.address || '',
                    logoBase64,
                };
                setClinicInfo(info);
                clinicInfoRef.current = info; // ref mein bhi save karo
            } catch (err) {
                console.error('Clinic/doctor info fetch error:', err);
            }
        };

        fetchClinicInfo();
    }, [slug]);

    /* ══════════════════════════════════════════════════════════════════════════
       FETCH: Queue
    ══════════════════════════════════════════════════════════════════════════ */
    const fetchQueue = useCallback(async (force = false) => {
        const cacheKey = `billing-queue-${slug}`;
        const cached = getCache(cacheKey);
        if (cached && !force) { setAppointments(cached); setLoading(false); return; }
        else setLoading(true);

        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        try {
            const res = await axios.get(
                `${API_BASE}/api/appointments/${slug}/live-queue`,
                {
                    params: { page: 1, limit: 200, status: 'Completed' },
                    signal: abortRef.current.signal,
                    timeout: 8000,
                }
            );
            if (res.data.success) {
                const completedOnly = (res.data.data || []).filter(a => a.status === 'Completed');
                setCache(cacheKey, completedOnly);
                setAppointments(completedOnly);
            }
        } catch (err) {
            if (axios.isCancel(err) || err.code === 'ERR_CANCELED') return;
            console.error('Billing Queue Fetch Error:', err);
        } finally { setLoading(false); }
    }, [slug]);

    useEffect(() => {
        fetchQueue();
        return () => { if (abortRef.current) abortRef.current.abort(); };
    }, [slug, fetchQueue]);

    /* ══════════════════════════════════════════════════════════════════════════
       FETCH: Patient search (form view)
    ══════════════════════════════════════════════════════════════════════════ */
    useEffect(() => {
        const t = setTimeout(async () => {
            if (searchQuery.length > 2) {
                try {
                    const res = await axios.get(
                        `${API_BASE}/api/appointments/search-billing/${slug}?query=${searchQuery}`
                    );
                    if (res.data.success) {
                        setSearchResults((res.data.data || []).filter(a => a.status === 'Completed'));
                    }
                } catch (e) { console.error(e); }
            } else setSearchResults([]);
        }, 400);
        return () => clearTimeout(t);
    }, [searchQuery, slug]);

    /* ══════════════════════════════════════════════════════════════════════════
       FETCH: Per-patient billing history
    ══════════════════════════════════════════════════════════════════════════ */
    useEffect(() => {
        if (!selectedPatient) return;
        const pid = getPatientId(selectedPatient);
        (async () => {
            try {
                const res = await axios.get(`${API_BASE}/api/billings/${slug}/history/${pid}`);
                if (res.data.success) setPatientHistory(res.data.data);
            } catch (e) { console.error(e); }
        })();
    }, [selectedPatient, slug]);

    /* ══════════════════════════════════════════════════════════════════════════
       AUTO-ADD appointment fee (new invoice only)
    ══════════════════════════════════════════════════════════════════════════ */
    useEffect(() => {
        if (editMode) return;
        if (selectedPatient?.fees) {
            setItems([{
                name: isRevisit ? 'Follow-up / Revisit Fee' : 'Consultation / Appointment Fee',
                price: Number(selectedPatient.fees),
                qty: 1,
                isApptFee: true,
            }]);
            setPaidAmount(Number(selectedPatient.fees));
        } else {
            setItems([]);
            setPaidAmount(0);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedPatient]);

    /* ══════════════════════════════════════════════════════════════════════════
       FETCH: All invoice history
    ══════════════════════════════════════════════════════════════════════════ */
    const fetchAllHistory = useCallback(async () => {
        setHistoryLoading(true);
        try {
            const res = await axios.get(`${API_BASE}/api/billings/${slug}/all`);
            if (res.data.success) setAllHistory(res.data.data);
        } catch (e) { console.error(e); }
        finally { setHistoryLoading(false); }
    }, [slug]);

    useEffect(() => { if (view === 'history') fetchAllHistory(); }, [view, fetchAllHistory]);

    /* ══════════════════════════════════════════════════════════════════════════
       FORM HELPERS
    ══════════════════════════════════════════════════════════════════════════ */
    const resetForm = () => {
        setSelectedPatient(null);
        setItems([]);
        setDiscount(0);
        setPaidAmount(0);
        setPaymentMode('Cash');
        setEditMode(false);
        setEditInvoiceId(null);
        setSearchQuery('');
        setSearchResults([]);
        setPatientHistory([]);
        setManualFeeName('');
        setManualFeePrice('');
    };

    const resetFilters = () => {
        setSearchText('');
        setStatusFilter('All');
        setVisitFilter('All');
        setDatePreset('today');
        setCustomStart(today);
        setCustomEnd(today);
    };

    const addManualItem = () => {
        if (!manualFeeName || !manualFeePrice) {
            alert('Enter service name and price.');
            return;
        }
        setItems(prev => [...prev, { name: manualFeeName, price: Number(manualFeePrice), qty: 1 }]);
        setManualFeeName('');
        setManualFeePrice('');
    };

    /* ══════════════════════════════════════════════════════════════════════════
       BILLING ACTIONS
    ══════════════════════════════════════════════════════════════════════════ */

    // Fresh clinicInfo guaranteed return karta hai
    const getClinicInfoFresh = useCallback(async () => {
        if (clinicInfoRef.current?.clinicName) return clinicInfoRef.current;
        // Agar abhi tak load nahi hua toh wait karo max 4 seconds
        return new Promise((resolve) => {
            let attempts = 0;
            const interval = setInterval(() => {
                attempts++;
                if (clinicInfoRef.current?.clinicName || attempts > 40) {
                    clearInterval(interval);
                    resolve(clinicInfoRef.current || clinicInfo);
                }
            }, 100);
        });
    }, [clinicInfo]);

    const handleCreateBilling = (appt) => {
        resetForm();
        setSelectedPatient({
            ...appt,
            email: appt.email || appt.patientId?.email || '',
        });
        setView('form');
    };

    const handleUpdateBilling = async (appt) => {
        const pid = getPatientId(appt);
        try {
            const res = await axios.get(`${API_BASE}/api/billings/${slug}/history/${pid}`);
            if (res.data.success && res.data.data.length > 0) {
                const inv = res.data.data[0];
                email: appt.email || appt.patientId?.email || '',  // ← ADD THIS

                    resetForm();
                setSelectedPatient(appt);
                setItems(inv.items || []);
                setDiscount(inv.discount || 0);
                setPaidAmount(inv.paidAmount || 0);
                setPaymentMode(inv.paymentMode || 'Cash');
                setEditMode(true);
                setEditInvoiceId(inv._id);
                setView('form');
            } else {
                alert('No existing invoice found. Please create one first.');
            }
        } catch (e) { alert('Error fetching invoice: ' + e.message); }
    };

    const handleDownloadForAppt = async (appt, onPdfAction) => {
        const pid = getPatientId(appt);
        setDownloadLoading(appt._id);
        try {
            const res = await axios.get(
                `${API_BASE}/api/billings/${slug}/history/${pid}`,
                { headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' } }
            );
            if (res.data.success && res.data.data.length > 0) {
                onPdfAction('download', res.data.data[0], freshClinicInfo); // ADD freshClinicInfo

            } else {
                alert(`No invoice found to download (patientId: ${pid}).`);
            }
        } catch (e) {
            alert('Download failed: ' + e.message);
        } finally {
            setDownloadLoading(null);
        }
    };

    const handleGenerateInvoice = async (onPdfAction) => {
        if (!selectedPatient || items.length === 0) {
            return alert('Select patient and add at least one item.');
        }
        setFormLoading(true);
        const freshClinicInfo = await getClinicInfoFresh(); // ADD

        try {
            const payload = {
                patientId: getPatientId(selectedPatient),
                appointmentId: selectedPatient._id,
                patientName: selectedPatient.patientName,
                email: selectedPatient.email || selectedPatient.patientId?.email || '',  // ← must be here

                mobile: selectedPatient.mobile,
                visitType: selectedPatient.visitType || selectedPatient.type,
                isRevisit,
                appointmentFee: selectedPatient.fees || 0,
                items,
                subTotal,
                discount: Number(discount),
                grandTotal,
                paidAmount: Number(paidAmount),
                dueAmount: due,
                paymentMode,
            };

            const res = await axios.post(`${API_BASE}/api/billings/${slug}/create`, payload);

            if (res.data.success) {
                onPdfAction('print', res.data.data, freshClinicInfo); // ADD freshClinicInfo

                resetForm();
                clearCache();
                fetchQueue(true);
                setView('queue');
            }
        } catch (e) {
            alert('Server Error: ' + e.message);
        } finally {
            setFormLoading(false);
        }
    };

    const handleUpdateAndPrint = async (onPdfAction) => {
        if (!editInvoiceId) return;
        setFormLoading(true);
        const freshClinicInfo = await getClinicInfoFresh(); // ADD
        try {
            const payload = {
                items,
                subTotal,
                discount: Number(discount),
                grandTotal,
                paidAmount: Number(paidAmount),
                dueAmount: Math.max(0, due),
                paymentMode,
            };

            const res = await axios.put(
                `${API_BASE}/api/billings/${slug}/update/${editInvoiceId}`,
                payload
            );

            if (res.data.success) {
                onPdfAction('print', res.data.data, freshClinicInfo); // ADD freshClinicInfo

                setAllHistory(prev =>
                    prev.map(inv => inv._id === res.data.data._id ? res.data.data : inv)
                );
                resetForm();
                clearCache();
                fetchQueue(true);
                setView('queue');
            }
        } catch (e) {
            alert('Update failed: ' + e.message);
        } finally {
            setFormLoading(false);
        }
    };

    /* ══════════════════════════════════════════════════════════════════════════
       EXPOSED API
    ══════════════════════════════════════════════════════════════════════════ */
    return {
        /* ── view ── */
        view, setView,

        /* ── clinic ── */
        clinicInfo,

        /* ── queue ── */
        appointments, loading, fetchQueue,
        filteredQueue, stats,

        /* ── filters ── */
        showFilters, setShowFilters,
        searchText, setSearchText,
        statusFilter, setStatusFilter,
        visitFilter, setVisitFilter,
        datePreset, setDatePreset,
        customStart, setCustomStart,
        customEnd, setCustomEnd,
        activeDateRange, activeFilterCount,
        resetFilters,

        /* ── form ── */
        searchQuery, setSearchQuery,
        searchResults, setSearchResults,
        selectedPatient, setSelectedPatient,
        items, setItems,
        discount, setDiscount,
        paidAmount, setPaidAmount,
        paymentMode, setPaymentMode,
        formLoading,
        manualFeeName, setManualFeeName,
        manualFeePrice, setManualFeePrice,
        patientHistory,
        addManualItem,
        resetForm,

        /* ── edit mode ── */
        editMode, editInvoiceId,

        /* ── derived billing ── */
        isRevisit, subTotal, grandTotal, due,

        /* ── history ── */
        allHistory, historySearch, setHistorySearch,
        historyLoading, fetchAllHistory,
        filteredHistory,

        /* ── PDF loading ── */
        pdfLoading, setPdfLoading,
        downloadLoading,

        /* ── actions ── */
        handleCreateBilling,
        handleUpdateBilling,
        handleDownloadForAppt,
        handleGenerateInvoice,
        handleUpdateAndPrint,
        getClinicInfoFresh, // ADD

    };
};

export default useBillingData;