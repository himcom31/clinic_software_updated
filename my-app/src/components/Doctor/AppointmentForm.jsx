import React, { useState, useEffect ,useRef} from 'react';
import axios from 'axios';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Loader2, CheckCircle2 } from 'lucide-react';

const API_BAS = import.meta.env.VITE_API_URL;

const AppointmentForm = () => {
    const { slug } = useParams();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [isNewPatient, setIsNewPatient] = useState(true);
    const [clinicConfig, setClinicConfig] = useState({ currentFee: 0, currentValidity: 7 });
    const [patientSuggestions, setPatientSuggestions] = useState([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchField, setSearchField] = useState(null); // 'mobile' or 'name'
    const searchDebounceRef = useRef(null);

    const [formData, setFormData] = useState({
        mobile: '', emMobile: '', name: '', email: '', age: '', gender: 'Male',
        bloodGroup: '', weight: '', height: '', bmi: '', reference: 'Self',
        refName: '', refMobile: '', address: '', allergies: '',
        bookingDate: new Date().toISOString().split('T')[0],
        consultFeeStatus: 'Yes',
        // 🔥 FIX: consultationFee = clinic's total fee (totalFees in DB)
        //         paidAmount     = amount actually paid by patient
        consultationFee: 0,
        paidAmount: 0,
        validUpto: '',
        visitType: 'New Patient',
        expirChecker: 'New Patient'
    });

    // BMI Calculation
    // BMI Calculation — guard against 0 / empty to prevent NaN
    useEffect(() => {
        const w = parseFloat(formData.weight);
        const h = parseFloat(formData.height);
        if (w > 0 && h > 0) {
            const hMtrs = h / 100;
            const val = (w / (hMtrs * hMtrs)).toFixed(2);
            setFormData(prev => ({ ...prev, bmi: val }));
        } else {
            // Clear BMI so backend never receives NaN
            setFormData(prev => ({ ...prev, bmi: '' }));
        }
    }, [formData.weight, formData.height]);

    // Validity Date Calculation
    useEffect(() => {
        if (formData.bookingDate && clinicConfig.currentValidity) {
            const date = new Date(formData.bookingDate);
            date.setDate(date.getDate() + parseInt(clinicConfig.currentValidity));
            const expiryDate = date.toISOString().split('T')[0];
            setFormData(prev => ({ ...prev, validUpto: expiryDate }));
        }
    }, [formData.bookingDate, clinicConfig.currentValidity]);

    // Fetch Clinic Config on mount
    useEffect(() => {
        if (slug) fetchClinicConfig();
    }, [slug]);

    const fetchClinicConfig = async () => {
        try {
            const res = await axios.get(`${API_BAS}/api/clinic/${slug}/clinicData`);
            if (res.data.success) {
                const clinic = res.data.data;
                const fee = clinic.consultationFee || 0;
                const validity = clinic.appointmentValidity || 7;

                setClinicConfig({ currentFee: fee, currentValidity: validity });
                console.log("Clinic Config Loaded — Fee:", fee, "Validity:", validity);

                // 🔥 FIX: Pre-fill consultationFee and paidAmount from clinic config
                //         so that on first load (before mobile search), values are correct
                setFormData(prev => ({
                    ...prev,
                    consultationFee: fee,   // This goes to billing.totalFees in DB
                    paidAmount: fee,        // Default: full fee paid (New Patient)
                    validUpto: calculateExpiry(new Date(), validity)
                }));
            }
        } catch (err) {
            console.error("Clinic Profile fetch failed", err);
        }
    };


    const searchPatients = async (query, field) => {
        setSearchField(field);
        if (!query || query.length < 2) {
            setPatientSuggestions([]);
            setShowSuggestions(false);
            return;
        }
        clearTimeout(searchDebounceRef.current);
        searchDebounceRef.current = setTimeout(async () => {
            try {
                const res = await axios.get(
                    `${API_BAS}/api/appointments/${slug}/search-patients?q=${query}`
                );
                setPatientSuggestions(res.data.data || []);
                setShowSuggestions(true);
            } catch (err) {
                console.error(err);
            }
        }, 300);
    };

    const selectPatient = async (patient) => {
        setShowSuggestions(false);
        setPatientSuggestions([]);

        // Check their last appointment for revisit/validity
        const res = await axios.get(
            `${API_BAS}/api/appointments/${slug}/check-status/${patient.mobile}`
        );

        const fee = clinicConfig.currentFee || 0;
        let visitType = 'New Patient';
        let expirChecker = 'New Patient';
        let consultFeeStatus = 'Yes';
        let paidAmount = fee;

        if (res.data.success && res.data.appointment) {
            const appt = res.data.appointment;
            const lastDate = new Date(appt.appointmentDate);
            const diffDays = Math.ceil(
                Math.abs(new Date() - lastDate) / (1000 * 60 * 60 * 24)
            );
            const isValid = diffDays <= (parseInt(clinicConfig.currentValidity) || 7);

            visitType = isValid ? 'Revisit Patient' : 'New Patient';
            expirChecker = isValid ? 'Within Validity' : 'Validity Expired';
            consultFeeStatus = isValid ? 'No' : 'Yes';
            paidAmount = isValid ? 0 : fee;
            setIsNewPatient(false);
        } else {
            setIsNewPatient(true);
        }

        setFormData(prev => ({
            ...prev,
            mobile: patient.mobile || '',
            name: patient.name || '',
            emMobile: patient.emMobile || '',
            email: patient.email || '',
            age: patient.age || '',
            gender: patient.gender || 'Male',
            bloodGroup: patient.bloodGroup || '',
            weight: patient.weight || '',
            height: patient.height || '',
            bmi: patient.bmi || '',
            address: patient.address || '',
            allergies: patient.allergies || '',
            reference: patient.referenceType || 'Self',
            refName: patient.referenceName || '',
            refMobile: patient.referenceMobile || '',
            visitType,
            expirChecker,
            consultFeeStatus,
            consultationFee: fee,
            paidAmount,
            validUpto: calculateExpiry(new Date(), clinicConfig.currentValidity)
        }));
    };

    // Helper: Expiry Date Calculate
    const calculateExpiry = (startDate, days) => {
        const date = new Date(startDate);
        date.setDate(date.getDate() + (parseInt(days) || 7));
        return date.toISOString().split('T')[0];
    };

    const handleMobileSearch = async (val) => {
        const cleanVal = val.replace(/\D/g, '').slice(0, 10);
        setFormData(prev => ({ ...prev, mobile: cleanVal }));

        if (cleanVal.length === 10) {
            setLoading(true);
            try {
                const res = await axios.get(`${API_BAS}/api/appointments/${slug}/check-status/${cleanVal}`);

                if (res.data.success && res.data.appointment) {
                    const appt = res.data.appointment;
                    const patient = res.data.patient;

                    // Revisit validity check
                    const lastDate = new Date(appt.appointmentDate);
                    const today = new Date();
                    const diffDays = Math.ceil(Math.abs(today - lastDate) / (1000 * 60 * 60 * 24));
                    const isValid = diffDays <= (parseInt(clinicConfig.currentValidity) || 7);

                    const fee = clinicConfig.currentFee || 0;

                    setIsNewPatient(false);
                    setFormData(prev => ({
                        ...prev,
                        name: appt.patientName || '',
                        emMobile: patient?.emMobile || '',
                        email: patient?.email || '',
                        age: patient?.age || '',
                        gender: patient?.gender || 'Male',
                        bloodGroup: patient?.bloodGroup || '',
                        weight: patient?.weight || '',
                        height: patient?.height || '',
                        bmi: patient?.bmi || '',
                        address: patient?.address || '',
                        allergies: patient?.allergies || '',
                        reference: patient?.referenceType || 'Self',
                        refName: patient?.referenceName || '',
                        refMobile: patient?.referenceMobile || '',

                        visitType: isValid ? 'Revisit Patient' : 'New Patient',
                        expirChecker: isValid ? 'Within Validity' : 'Validity Expired',
                        consultFeeStatus: isValid ? 'No' : 'Yes',

                        // 🔥 FIX: consultationFee always = clinic's full fee (goes to totalFees)
                        //         paidAmount = 0 if within validity (free revisit), else full fee
                        consultationFee: fee,
                        paidAmount: isValid ? 0 : fee,
                        validUpto: calculateExpiry(new Date(), clinicConfig.currentValidity)
                    }));

                } else {
                    // New Patient
                    setIsNewPatient(true);
                    const fee = clinicConfig.currentFee || 0;

                    setFormData(prev => ({
                        ...prev,
                        name: '', emMobile: '', age: '', gender: 'Male', bloodGroup: '',
                        weight: '', height: '', bmi: '', address: '', allergies: '',
                        reference: 'Self', refName: '', refMobile: '',

                        visitType: 'New Patient',
                        expirChecker: 'New Patient',
                        consultFeeStatus: 'Yes',

                        // 🔥 FIX: Both set from clinicConfig for new patients
                        consultationFee: fee,
                        paidAmount: fee,
                        validUpto: calculateExpiry(new Date(), clinicConfig.currentValidity)
                    }));
                }

            } catch (err) {
                console.error("Search failed", err);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const payload = {
                ...formData,
                clinicSlug: slug,
                isNew: isNewPatient
                // 🔥 formData already contains:
                //    consultationFee → backend saves as billing.totalFees
                //    paidAmount      → backend saves as billing.paidAmount
            };

            console.log("Submitting Payload:", {
                consultationFee: payload.consultationFee,
                paidAmount: payload.paidAmount,
                consultFeeStatus: payload.consultFeeStatus
            });

            const res = await axios.post(`${API_BAS}/api/appointments/${slug}/book`, payload);
            if (res.data.success) {
                alert(`Success! Token #${res.data.token}`);
                navigate(`/${slug}/dashboard/appTable`);
            }
        } catch (err) {
            alert("Error booking appointment!");
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="h-screen bg-[#f1f5f9]  font-sans text-slate-900 overflow-hidden flex items-center justify-center">
            <form onSubmit={handleSubmit} className="w-full max-w-[1250px] bg-white shadow-xl border border-slate-300 flex flex-col h-fit">

                {/* Header */}
                <div className="flex bg-blue-500 text-white items-center px-6 py-6 justify-between">
                    <div className="flex gap-4">
                        <button
                            type="button"
                            onClick={() => setIsNewPatient(true)}
                            className={`text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded ${isNewPatient ? 'bg-slate-800' : 'text-slate-200'}`}
                        >
                            New Patient
                        </button>
                        <button
                            type="button"
                            onClick={() => setIsNewPatient(false)}
                            className={`text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded ${!isNewPatient ? 'bg-emerald-400' : 'text-slate-200'}`}
                        >
                            Revisit
                        </button>
                    </div>

                    <div className="flex items-center gap-8">
                        <button
                            type="button"
                            onClick={() => navigate(`/${slug}/dashboard/appTable`)}
                            className="text-[10px] font-black uppercase tracking-widest px-4 py-1 rounded bg-green-600 hover:bg-indigo-500 transition-all flex items-center gap-1"
                        >
                            📋 View History
                        </button>
                        <div className="text-[10px] font-bold opacity-70 flex items-center gap-2">
                            {loading ? <Loader2 size={12} className="animate-spin" /> : <CheckCircle2 size={12} />}
                            SYST: {isNewPatient ? "REGISTRATION MODE" : "REVISIT MODE"}
                        </div>
                    </div>
                </div>

                <div className="p-5 grid grid-cols-4 gap-x-7 gap-y-6">

                    {/* ROW 1 */}
                    <div className="space-y-1 relative">
                        <label className="label-style">1. Mobile Number / whatsapp</label>
                        <input
                            required
                            className="input-style"
                            value={formData.mobile}
                            onChange={(e) => {
                                const val = e.target.value.replace(/\D/g, '').slice(0, 10);
                                setFormData(prev => ({ ...prev, mobile: val }));
                                searchPatients(val, 'mobile');
                                if (val.length === 10) handleMobileSearch(val);
                            }}
                            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                            maxLength={10}
                        />
                        {showSuggestions && searchField === 'mobile' && patientSuggestions.length > 0 && (
                            <div className="absolute z-50 top-full left-0 w-full bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto">
                                {patientSuggestions.map((p, i) => (
                                    <div key={i} onMouseDown={() => selectPatient(p)}
                                        className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-slate-100">
                                        <div className="font-bold text-xs text-slate-800">{p.name}</div>
                                        <div className="text-[10px] text-slate-400">{p.mobile} · {p.age}Y · {p.gender}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="space-y-1">
                        <label className="label-style">2. Emergency Mobile</label>
                        <input className="input-style" value={formData.emMobile} onChange={(e) => setFormData({ ...formData, emMobile: e.target.value })} />
                    </div>
                    <div className="col-span-2 space-y-1 relative">
    <label className="label-style">3. Full Name</label>
    <input
        required
        className="input-style uppercase"
        value={formData.name}
        onChange={(e) => {
            setFormData(prev => ({ ...prev, name: e.target.value }));
            searchPatients(e.target.value, 'name');
        }}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
    />
    {showSuggestions && searchField === 'name' && patientSuggestions.length > 0 && (
        <div className="absolute z-50 top-full left-0 w-full bg-white border border-slate-200 rounded shadow-lg max-h-48 overflow-y-auto">
            {patientSuggestions.map((p, i) => (
                <div key={i} onMouseDown={() => selectPatient(p)}
                    className="px-3 py-2 cursor-pointer hover:bg-blue-50 border-b border-slate-100">
                    <div className="font-bold text-xs text-slate-800">{p.name}</div>
                    <div className="text-[10px] text-slate-400">{p.mobile} · {p.age}Y · {p.gender}</div>
                </div>
            ))}
        </div>
    )}
</div>                    

                    {/* ROW 2 */}
                    <div className="col-span-2 space-y-1">
                        <label className="label-style">4. Email Address</label>
                        <input className="input-style" type="email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                            <label className="label-style">5. Age</label>
                            <input required type="number" className="input-style" value={formData.age} onChange={(e) => setFormData({ ...formData, age: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                            <label className="label-style">6. Gender</label>
                            <select className="input-style" value={formData.gender} onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                                <option>Male</option>
                                <option>Female</option>
                                <option>Other</option>
                            </select>
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="label-style">7. Blood Group</label>
                        <select
                            className="input-style"
                            value={formData.bloodGroup}
                            onChange={(e) => setFormData({ ...formData, bloodGroup: e.target.value })}
                        >
                            <option value="">— Select Blood Group —</option>
                            <option value="A+">A+ (A Positive)</option>
                            <option value="A-">A− (A Negative)</option>
                            <option value="B+">B+ (B Positive)</option>
                            <option value="B-">B− (B Negative)</option>
                            <option value="AB+">AB+ (AB Positive)</option>
                            <option value="AB-">AB− (AB Negative)</option>
                            <option value="O+">O+ (O Positive)</option>
                            <option value="O-">O− (O Negative)</option>
                            <option value="A1+">A1+ (A1 Positive)</option>
                            <option value="A1-">A1− (A1 Negative)</option>
                            <option value="A2+">A2+ (A2 Positive)</option>
                            <option value="A2-">A2− (A2 Negative)</option>
                            <option value="A1B+">A1B+ (A1B Positive)</option>
                            <option value="A1B-">A1B− (A1B Negative)</option>
                            <option value="A2B+">A2B+ (A2B Positive)</option>
                            <option value="A2B-">A2B− (A2B Negative)</option>
                            <option value="Bombay">Bombay (Oh / hh)</option>
                            <option value="Unknown">Unknown</option>
                        </select>
                    </div>
                    {/* ROW 3: VITALS */}
                    <div className="space-y-1">
                        <label className="label-style text-blue-600">8. Weight (kg)</label>
                        <input className="input-style border-blue-200 bg-blue-50/30" value={formData.weight} onChange={(e) => setFormData({ ...formData, weight: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <label className="label-style text-blue-600">9. Height (cm)</label>
                        <input className="input-style border-blue-200 bg-blue-50/30" value={formData.height} onChange={(e) => setFormData({ ...formData, height: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <label className="label-style text-blue-600">10. BMI Index</label>
                        <div className="h-[38px] bg-blue-600 text-white rounded flex items-center justify-center font-black text-sm uppercase">
                            {formData.bmi || '0.00'}
                        </div>
                    </div>
                    <div className="space-y-1">
                        <label className="label-style">11. Reference By</label>
                        <div className="flex border rounded overflow-hidden h-[38px]">
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, reference: 'Self' })}
                                className={`flex-1 text-[9px] font-black ${formData.reference === 'Self' ? 'bg-blue-600 text-white' : 'bg-white'}`}
                            >
                                SELF
                            </button>
                            <button
                                type="button"
                                onClick={() => setFormData({ ...formData, reference: 'Other' })}
                                className={`flex-1 text-[9px] font-black ${formData.reference === 'Other' ? 'bg-blue-600 text-white' : 'bg-white'}`}
                            >
                                OTHER
                            </button>
                        </div>
                    </div>

                    {/* ROW 4: REF DETAILS */}
                    {formData.reference === 'Other' ? (
                        <>
                            <div className="space-y-1">
                                <label className="label-style">Ref. Name</label>
                                <input className="input-style bg-yellow-50/30" value={formData.refName} onChange={(e) => setFormData({ ...formData, refName: e.target.value })} />
                            </div>
                            <div className="space-y-1">
                                <label className="label-style">Ref. Mobile</label>
                                <input className="input-style bg-yellow-50/30" value={formData.refMobile} onChange={(e) => setFormData({ ...formData, refMobile: e.target.value })} />
                            </div>
                        </>
                    ) : (
                        <div className="col-span-2 italic text-[10px] text-slate-300 flex items-center">No reference selected.</div>
                    )}
                    <div className="col-span-2 space-y-1">
                        <label className="label-style">12. Address</label>
                        <input className="input-style" value={formData.address} onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
                    </div>

                    {/* ROW 5 */}
                    <div className="space-y-1">
                        <label className="label-style">13. Allergies</label>
                        <input className="input-style border-red-200" placeholder="e.g. Penicillin" value={formData.allergies} onChange={(e) => setFormData({ ...formData, allergies: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                        <label className="label-style">14. Booking Date</label>
                        <input type="date" className="input-style" value={formData.bookingDate} onChange={(e) => setFormData({ ...formData, bookingDate: e.target.value })} />
                    </div>

                    {/* FEE + VALIDITY */}
                    <div className="col-span-2 bg-slate-50 p-3 border rounded-lg flex items-center gap-4">
                        <div className="flex-1 space-y-2">
                            {/* 🔥 FIX: Label now shows clinicConfig.currentFee (correct clinic fee) */}
                            <label className="label-style">15. Fee (₹{clinicConfig.currentFee})</label>
                            <div className="flex gap-1">
                                {['Yes', 'No', 'Partial'].map(s => {
                                    const isLocked = !isNewPatient && formData.expirChecker === 'Within Validity';
                                    return (
                                        <button
                                            key={s}
                                            type="button"
                                            disabled={isLocked}
                                            onClick={() => {
                                                // 🔥 FIX: Update paidAmount based on fee status selection
                                                const fee = clinicConfig.currentFee || 0;
                                                setFormData(prev => ({
                                                    ...prev,
                                                    consultFeeStatus: s,
                                                    // consultationFee stays same (clinic's total fee)
                                                    paidAmount: s === 'Yes' ? fee : s === 'No' ? 0 : prev.paidAmount
                                                }));
                                            }}
                                            className={`flex-1 py-1 text-[9px] font-black border rounded transition-all
                                                ${formData.consultFeeStatus === s ? 'bg-blue-600 text-white' : 'bg-white text-slate-500'}
                                                ${isLocked ? 'opacity-50 cursor-not-allowed bg-slate-100' : 'hover:bg-green-300'}
                                            `}
                                        >
                                            {s.toUpperCase()}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* 🔥 Partial amount input — only show when Partial selected */}
                        {formData.consultFeeStatus === 'Partial' && (
                            <div className="w-24 space-y-1">
                                <label className="label-style">Amount</label>
                                <input
                                    className="input-style !py-1 !text-xs"
                                    type="number"
                                    value={formData.paidAmount}
                                    onChange={(e) => setFormData({ ...formData, paidAmount: e.target.value })}
                                />
                            </div>
                        )}

                        <div className="flex-1 space-y-1">
                            <label className="label-style text-slate-500">16. Appointment Validity</label>
                            <div className="h-[38px] bg-slate-50 border border-slate-200 rounded flex flex-col items-center justify-center px-3">
                                <span className={`text-[12px] font-black tracking-tight ${formData.expirChecker === 'Within Validity' ? 'text-green-600' : 'text-red-600'}`}>
                                    {formData.expirChecker || '---'}
                                </span>
                                <p className="text-[8px] text-blue-600 font-bold uppercase tracking-widest mt-0.5">
                                    Total Validity = {clinicConfig.currentValidity || 0} Days
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest italic">
                        * Ensure all clinical vitals are verified before booking.
                    </p>
                    <button
                        type="submit"
                        disabled={loading}
                        className="px-16 py-3 bg-blue-600 text-white rounded font-black text-[11px] uppercase tracking-[3px] hover:bg-black transition-all flex items-center gap-3"
                    >
                        {loading ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        Confirm Appointment
                    </button>
                </div>
            </form>

            <style>{`
                .input-style { 
                    width: 100%; background: #ffffff; border: 1.5px solid #cbd5e1; border-radius: 4px; 
                    padding: 8px 12px; font-size: 12px; font-weight: 700; color: #0f172a; outline: none; transition: 0.2s; 
                }
                .input-style:focus { border-color: #0f172a; background: #fff; }
                .label-style { font-size: 10px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.1em; margin-left: 2px; display: block; margin-bottom: 4px; }
            `}</style>
        </div>
    );
};

export default AppointmentForm;