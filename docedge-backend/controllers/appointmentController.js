const moment = require('moment');
const Patient = require('../models/PatientSchema');
const Appointment = require('../models/Appointment');
const Prescription = require('../models/Prescription');
const Letterhead = require('../models/Letterhead');
const ConsultationForm = require('../models/ConsultationForm');
const mongoose = require('mongoose');
const clinicSchema = require('../models/clinicProfileSchema');

const getAdviceModel = (slug) => {
    const collectionName = `${slug}_forms`;
    return mongoose.models[collectionName] || mongoose.model(collectionName, ConsultationForm, collectionName);
};


exports.bookAppointment = async (req, res) => {

    try {
        const { clinicSlug, mobile, name, ...data } = req.body;

        if (!clinicSlug || !mobile || !name) {
            return res.status(400).json({ success: false, message: "Missing required fields!" });
        }

        // ─── 1. Check Previous Appointment Payment Status (for Revisit) ───────────
        // Find the most recent NON-CANCELLED appointment for this patient in this clinic
        const lastAppointment = await Appointment.findOne({
            clinicSlug,
            mobile,
            status: { $ne: 'Cancelled' }
        }).sort({ createdAt: -1 }).lean();

        // Determine if this is a new patient or revisit
        const isRevisit = !!lastAppointment;

        // ── Carry-forward unpaid/partial dues from last visit ──────────────────────
        let previousDue = 0;
        let previousPaymentStatus = null;

        if (isRevisit && lastAppointment?.billing) {
            const lastBilling = lastAppointment.billing;
            previousPaymentStatus = lastBilling.paymentStatus; // 'Paid' | 'Partial' | 'Unpaid'

            if (lastBilling.paymentStatus === 'Partial') {
                // Due = totalFees - paidAmount from last visit
                previousDue = (lastBilling.totalFees || 0) - (lastBilling.paidAmount || 0);
            } else if (lastBilling.paymentStatus === 'Unpaid') {
                previousDue = lastBilling.totalFees || 0;
            }
            // If 'Paid' → previousDue stays 0, no carry-forward
        }


        // ─── 2. Patient Upsert ────────────────────────────────────────────────────
        const patient = await Patient.findOneAndUpdate(
            { clinicSlug, mobile },
            {
                $set: {
                    name,
                    emMobile: data.emMobile,
                    email: data.email,
                    age: data.age,
                    gender: data.gender,
                    bloodGroup: data.bloodGroup,
                    weight: data.weight,
                    height: data.height,
                    bmi: data.bmi,
                    address: data.address,
                    allergies: data.allergies,
                    referenceType: data.reference,
                    referenceName: data.refName,
                    referenceMobile: data.refMobile,
                    "consultationFee.status": data.consultFeeStatus,
                    "consultationFee.paidAmount": data.paidAmount,
                    "consultationFee.validUpto": data.validUpto,
                    lastVisit: new Date()
                }
            },
            { new: true, upsert: true, setDefaultsOnInsert: true }
        );


        // ─── 3. Safe Token Count ──────────────────────────────────────────────────
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date();
        endOfDay.setHours(23, 59, 59, 999);

        const tokenCount = await Appointment.countDocuments({
            clinicSlug,
            appointmentDate: { $gte: startOfDay, $lte: endOfDay }
        });

        // ─── 4. Determine Final Payment Status for This Appointment ──────────────
        //
        // Rules:
        //  • If revisit and previous visit was Paid  → treat normally (use current consultFeeStatus)
        //  • If revisit and previous visit was Partial/Unpaid → mark this visit's
        //    paymentStatus as 'Partial' (dues still pending) unless the patient pays
        //    the full amount NOW (paidAmount >= totalFees)
        //
        const currentTotalFees = data.consultationFee || 0;
        const currentPaidAmount = data.paidAmount || 0;

        let resolvedPaymentStatus;

        if (data.consultFeeStatus === 'Yes') {
            // Receptionist explicitly marked as Paid
            resolvedPaymentStatus = 'Paid';
        } else if (data.consultFeeStatus === 'Partial') {
            resolvedPaymentStatus = 'Partial';
        } else {
            // 'No' / not set
            if (isRevisit && (previousPaymentStatus === 'Partial' || previousPaymentStatus === 'Unpaid')) {
                // Previous dues still exist → flag as Partial for awareness
                resolvedPaymentStatus = 'Partial';
            } else {
                resolvedPaymentStatus = 'Unpaid';
            }
        }

        // Double-check: if patient paid full amount right now, always mark Paid
        if (currentPaidAmount > 0 && currentPaidAmount >= currentTotalFees) {
            resolvedPaymentStatus = 'Paid';
        }


        // ─── 5. Appointment Save ──────────────────────────────────────────────────
        const newAppointment = new Appointment({
            clinicSlug,
            patientId: patient._id,
            patientName: name,
            mobile: mobile,
                email: data.email || '',   // ← ADD THIS LINE
            emMobile: data.emMobile,
            appointmentDate: data.bookingDate ? new Date(data.bookingDate) : new Date(),
            tokenNumber: tokenCount + 1,
            visitType: isRevisit ? 'Revisit Patient' : 'New Patient',
            vitals: {
                weight: data.weight,
                height: data.height,
                bmi: data.bmi
            },
            billing: {
                totalFees: currentTotalFees,
                paidAmount: currentPaidAmount,
                paymentStatus: resolvedPaymentStatus,
                validUpto: data.validUpto ? new Date(data.validUpto) : null,
                // Store previous due for reference/display on frontend
                previousDue: previousDue
            },
            reference: {
                refType: data.reference,
                refName: data.refName,
                refMobile: data.refMobile
            }
        });

        const savedAppt = await newAppointment.save();
       
       

        res.status(201).json({
            success: true,
            token: savedAppt.tokenNumber,
            message: "Patient & Appointment Both Saved!",
            // Send these back so frontend can show alerts/warnings
            paymentInfo: {
                resolvedPaymentStatus,
                previousPaymentStatus,
                previousDue,
                isRevisit
            }
        });

    } catch (err) {
        console.error("CRITICAL ERROR:", err.message);
        res.status(500).json({ success: false, message: "Database Error: " + err.message });
    }
};


// ─── GET REVISIT PAYMENT STATUS (Call this when patient mobile is entered) ────
// Frontend should hit this before showing the booking form so it can
// pre-warn receptionist about pending dues.
exports.getRevisitPaymentStatus = async (req, res) => {
    try {
        const { slug, mobile } = req.params;

        const lastAppointment = await Appointment.findOne({
            clinicSlug: slug,
            mobile,
            status: { $ne: 'Cancelled' }
        })
            .sort({ createdAt: -1 })
            .select('billing visitType appointmentDate patientName')
            .lean();

        if (!lastAppointment) {
            return res.status(200).json({
                success: true,
                isNew: true,
                message: "New Patient – no previous record found."
            });
        }

        const billing = lastAppointment.billing || {};
        const paymentStatus = billing.paymentStatus || 'Unpaid';

        let previousDue = 0;
        if (paymentStatus === 'Partial') {
            previousDue = (billing.totalFees || 0) - (billing.paidAmount || 0);
        } else if (paymentStatus === 'Unpaid') {
            previousDue = billing.totalFees || 0;
        }

        return res.status(200).json({
            success: true,
            isNew: false,
            lastVisitDate: lastAppointment.appointmentDate,
            patientName: lastAppointment.patientName,
            previousPaymentStatus: paymentStatus,     // 'Paid' | 'Partial' | 'Unpaid'
            previousDue,                               // numeric amount still owed
            lastBilling: billing
        });

    } catch (err) {
        console.error("getRevisitPaymentStatus Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};


// GET QUEUE / WAITING LIST (Today's Live Queue)
exports.getLiveQueue121 = async (req, res) => {
    try {
        const { slug } = req.params;

        const appointments = await Appointment.find({ clinicSlug: slug })
            .sort({ createdAt: -1 })
            .populate('patientId')
            .populate({
                path: 'prescriptions',
                select: 'pdfBinary createdAt'
            });

        res.json({ success: true, data: appointments });
    } catch (err) {
        console.error("Queue History Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};


exports.getLiveQueue = async (req, res) => {
    try {
        const { slug } = req.params;

        const page = Math.max(parseInt(req.query.page) || 1, 1);
        const limit = Math.min(parseInt(req.query.limit) || 50, 200);
        const skip = (page - 1) * limit;

        const appointments = await Appointment.find({ clinicSlug: slug })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .populate('patientId')
            .populate({
                path: 'prescriptions',
                select: 'createdAt'
            })
            .lean();

        const total = await Appointment.countDocuments({ clinicSlug: slug });

        res.json({
            success: true,
            data: appointments,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                hasMore: skip + appointments.length < total
            }
        });

    } catch (err) {
        console.error("Queue Fetch Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};


// UPDATE STATUS (Check-in, Complete, Cancel)
exports.updateAppointmentStatus = async (req, res) => {
    try {
        const { slug, id } = req.params;
        const { status } = req.body;

        const updated = await Appointment.findOneAndUpdate(
            { _id: id, clinicSlug: slug },
            { status },
            { new: true }
        );

        res.status(200).json({ success: true, data: updated });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// RESCHEDULE
exports.rescheduleAppointment = async (req, res) => {
    try {
        const { slug, id } = req.params;
        const { newDate, newTime } = req.body;

        const updated = await Appointment.findOneAndUpdate(
            { _id: id, clinicSlug: slug },
            { appointmentDate: newDate, slotTime: newTime, status: 'Waiting' },
            { new: true }
        );

        res.status(200).json({ success: true, message: "Rescheduled successfully" });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


// Get Latest Appointment for Validity Check
exports.getLatestAppointment = async (req, res) => {
    try {
        const { slug, mobile } = req.params;

        const latestAppt = await Appointment.findOne({
            clinicSlug: slug,
            mobile: mobile,
            status: { $ne: 'Cancelled' }
        })
            .sort({ appointmentDate: 1 })
            .select('appointmentDate visitType')
            .lean();

        res.status(200).json({
            success: true,
            data: latestAppt || null
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.getFullHistory = async (req, res) => {
    try {
        const { slug } = req.params;
        const { status } = req.query;

        let query = { clinicSlug: slug };
        if (status) query.status = status;

        const history = await Appointment.find(query)
            .populate('prescriptions')
            .sort({ appointmentDate: -1, createdAt: -1 })
            .lean();

        res.status(200).json({
            success: true,
            count: history.length,
            data: history,
        });
    } catch (error) {
        console.error("HISTORY_FETCH_ERROR:", error);
        res.status(500).json({
            success: false,
            message: "History fetch karne mein problem aayi bhai."
        });
    }
};


// SEARCH COMPLETED APPOINTMENTS FOR BILLING
exports.searchAppointmentForBilling = async (req, res) => {
    try {
        const { slug } = req.params;
        const { query } = req.query;

        if (!query || query.length < 3) {
            return res.status(200).json({ success: true, data: [] });
        }

        const appointments = await Appointment.find({
            clinicSlug: slug,
            $or: [
                { mobile: { $regex: query, $options: 'i' } },
                { patientName: { $regex: query, $options: 'i' } }
            ]
        })
            .select('patientId patientName mobile appointmentDate slotTime tokenNumber type status visitType fees reason createdAt')
            .limit(10)
            .sort({ createdAt: -1 });

        res.status(200).json({ success: true, data: appointments });
    } catch (err) {
        console.error("Appointment Search Error:", err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};


exports.getPatientStatusAndLatest = async (req, res) => {
    try {
        const { slug, mobile } = req.params;


        const latestAppt = await Appointment.findOne({
            clinicSlug: slug,
            mobile: mobile
        })
            .sort({ createdAt: -1 })
            .populate('patientId');

        if (!latestAppt) {
            return res.status(200).json({
                success: true,
                isNew: true,
                message: "Naya Patient"
            });
        }

        // ── Include payment info so frontend can show due warning ──────────────
        const billing = latestAppt.billing || {};
        const previousPaymentStatus = billing.paymentStatus || 'Unpaid';
        let previousDue = 0;

        if (previousPaymentStatus === 'Partial') {
            previousDue = (billing.totalFees || 0) - (billing.paidAmount || 0);
        } else if (previousPaymentStatus === 'Unpaid') {
            previousDue = billing.totalFees || 0;
        }

        res.status(200).json({
            success: true,
            isNew: false,
            appointment: latestAppt,
            patient: latestAppt.patientId,
            // ← NEW: payment context for frontend warning banner
            previousPaymentStatus,
            previousDue
        });

    } catch (err) {
        console.error("Search Error:", err.message);
        res.status(500).json({
            success: false,
            error: "Backend mein error hai: " + err.message
        });
    }
};


exports.getAppointmentContext1 = async (req, res) => {
    try {
        const { appointmentId } = req.params;

        const appointment = await Appointment.findById(appointmentId).populate('patientId');
        if (!appointment) return res.status(404).json({ success: false, message: "Appointment Not Found" });

        const currentSlug = appointment.clinicSlug;

        const Form = getAdviceModel(currentSlug);
        const formData = await Form.findOne({ formName: "Consultation Form" }).lean();

        const designData = await Letterhead.findOne({ slug: currentSlug }).lean();

        let lastPrescription = null;
        const isRevisit = appointment.visitType === 'REVISIT';

        if (isRevisit && appointment.patientId?._id) {
            const prevPrescription = await Appointment.findOne({
                patientId: appointment.patientId._id,
                slug: currentSlug
            }).sort({ createdAt: -1 });

            if (prevPrescription) {
                lastPrescription = {
                    consultationResponses: prevPrescription.consultationResponses || [],
                    medicines: prevPrescription.medicines || []
                };
            }
        }


        res.json({
            success: true,
            patient: appointment.patientId,
            design: designData,
            formStructure: formData || { sections: [] },
            vitals: appointment.vitals,
            lastPrescription,
            isRevisit
        });

    } catch (err) {
        console.error("Dynamic Fetch Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};


exports.getAppointmentContext = async (req, res) => {
    try {
        const { appointmentId } = req.params;

        const appointment = await Appointment.findById(appointmentId).populate('patientId');
        if (!appointment) return res.status(404).json({ success: false, message: "Appointment Not Found" });

        const currentSlug = appointment.clinicSlug;

        const Form = getAdviceModel(currentSlug);
        const formData = await Form.findOne({ formName: "Consultation Form" }).lean();

        const designData = await Letterhead.findOne({ slug: currentSlug }).lean();

        const isRevisit = appointment.visitType === 'Revisit Patient';
        let lastPrescription = null;

        if (isRevisit && appointment.patientId?._id) {
            const prevPrescription = await Prescription.findOne({
                patientId: appointment.patientId._id
            }).sort({ createdAt: -1 });


            if (prevPrescription) {
                lastPrescription = {
                    consultationResponses: prevPrescription.consultationResponses || [],
                    medicines: prevPrescription.medicines || [],
                    symptoms: prevPrescription.symptoms || [],
                    investigations: prevPrescription.investigations || [],
                    vaccinations: prevPrescription.vaccinations || [],
                    reports: prevPrescription.reports || []
                };
            }
        }

        
        

        res.json({
            success: true,
            patient: appointment.patientId,
            design: designData,
            formStructure: formData || { sections: [] },
            vitals: appointment.vitals,
            lastPrescription,
            isRevisit
        });

    } catch (err) {
        console.error("Dynamic Fetch Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};


exports.getAllAppointments = async (req, res) => {
    try {
        const { slug } = req.params;
        const {
            page = 1,
            limit = 20,
            status,
            search,
            date,
            paymentStatus
        } = req.query;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        let query = { clinicSlug: slug };

        if (status) query.status = status;
        if (paymentStatus) query['billing.paymentStatus'] = paymentStatus;

        if (date) {
            const start = new Date(date);
            start.setHours(0, 0, 0, 0);
            const end = new Date(date);
            end.setHours(23, 59, 59, 999);
            query.appointmentDate = { $gte: start, $lte: end };
        }

        if (search) {
            query.$or = [
                { patientName: { $regex: search, $options: 'i' } },
                { mobile: { $regex: search, $options: 'i' } }
            ];
        }

        const [appointments, total] = await Promise.all([
            Appointment.find(query)
                .populate('patientId', 'name mobile email age gender bloodGroup address')
                .populate({ path: 'prescriptions', select: 'createdAt _id' })
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit))
                .lean(),
            Appointment.countDocuments(query)
        ]);

        res.status(200).json({
            success: true,
            data: appointments,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit)),
                hasMore: skip + appointments.length < total
            }
        });

    } catch (err) {
        console.error("getAllAppointments Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};


// VIEW SINGLE APPOINTMENT (Full Details)
exports.viewAppointment = async (req, res) => {
    try {
        const { slug, id } = req.params;

        const appointment = await Appointment.findOne({ _id: id, clinicSlug: slug })
            .populate('patientId')
            .populate('prescriptions')
            .lean();

        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        res.status(200).json({ success: true, data: appointment });

    } catch (err) {
        console.error("viewAppointment Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};


// FETCH APPOINTMENT (Lightweight — for pre-filling edit form)
exports.fetchAppointment = async (req, res) => {
    try {
        const { slug, id } = req.params;

        const appointment = await Appointment.findOne({ _id: id, clinicSlug: slug })
            .populate('patientId', 'name mobile email age gender bloodGroup address allergies weight height bmi')
            .lean();

        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        const payload = {
            appointmentId: appointment._id,
            tokenNumber: appointment.tokenNumber,
            appointmentDate: appointment.appointmentDate,
            visitType: appointment.visitType,
            status: appointment.status,
            vitals: appointment.vitals,
            billing: appointment.billing,
            reference: appointment.reference,
            patient: appointment.patientId,
        };

        res.status(200).json({ success: true, data: payload });

    } catch (err) {
        console.error("fetchAppointment Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};


// EDIT APPOINTMENT DETAILS
exports.editAppointment = async (req, res) => {
    try {
        const { slug, id } = req.params;
        const {
            patientName,
            mobile,
            appointmentDate,
            visitType,
            status,
            vitals,
            reference,
            age, gender, bloodGroup, address, allergies, email, emMobile
        } = req.body;

        const updatedAppt = await Appointment.findOneAndUpdate(
            { _id: id, clinicSlug: slug },
            {
                $set: {
                    patientName,
                    mobile,
                    appointmentDate: appointmentDate ? new Date(appointmentDate) : undefined,
                    visitType,
                    status,
                    vitals,
                    reference
                }
            },
            { new: true, runValidators: true }
        ).populate('patientId');

        if (!updatedAppt) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        if (updatedAppt.patientId) {
            await Patient.findByIdAndUpdate(updatedAppt.patientId._id, {
                $set: { age, gender, bloodGroup, address, allergies, email, emMobile }
            });
        }

        res.status(200).json({
            success: true,
            message: "Appointment updated successfully",
            data: updatedAppt
        });

    } catch (err) {
        console.error("editAppointment Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};


// DELETE APPOINTMENT
exports.deleteAppointment = async (req, res) => {
    try {
        const { slug, id } = req.params;

        const deleted = await Appointment.findOneAndDelete({ _id: id, clinicSlug: slug });

        if (!deleted) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        if (deleted.prescriptions?.length > 0) {
            await Prescription.deleteMany({ _id: { $in: deleted.prescriptions } });
        }

        res.status(200).json({
            success: true,
            message: "Appointment deleted successfully",
            deletedId: id
        });

    } catch (err) {
        console.error("deleteAppointment Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};


// UPDATE PAYMENT STATUS
exports.updatePaymentStatus = async (req, res) => {
    try {
        const { slug, id } = req.params;
        const { paymentStatus, paidAmount, totalFees, paymentMethod, validUpto } = req.body;

        const validStatuses = ['Paid', 'Partial', 'Unpaid'];
        if (!validStatuses.includes(paymentStatus)) {
            return res.status(400).json({
                success: false,
                message: `Invalid paymentStatus. Must be: ${validStatuses.join(', ')}`
            });
        }

        const updated = await Appointment.findOneAndUpdate(
            { _id: id, clinicSlug: slug },
            {
                $set: {
                    'billing.paymentStatus': paymentStatus,
                    'billing.paidAmount': paidAmount,
                    'billing.totalFees': totalFees,
                    'billing.paymentMethod': paymentMethod,
                    'billing.validUpto': validUpto ? new Date(validUpto) : undefined
                }
            },
            { new: true }
        );

        if (!updated) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        res.status(200).json({
            success: true,
            message: "Payment status updated",
            data: {
                _id: updated._id,
                billing: updated.billing
            }
        });

    } catch (err) {
        console.error("updatePaymentStatus Error:", err.message);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getByDate = async (req, res) => {
    try {
        const { slug } = req.params;
        const dateParam = req.query.date;

        const base  = dateParam ? new Date(dateParam) : new Date();
        const start = new Date(base);
        start.setHours(0, 0, 0, 0);
        const end   = new Date(base);
        end.setHours(23, 59, 59, 999);

        // ✅ Use the already-imported Appointment model — no getAppointmentModel needed
        const appointments = await Appointment.find({
            clinicSlug: slug,
            createdAt: { $gte: start, $lte: end }
        })
        .populate('patientId')
        .populate({ path: 'prescriptions', select: 'createdAt' })
        .sort({ tokenNumber: 1 })  // ✅ fixed: was tokenNo
        .lean();

        res.status(200).json({ success: true, data: appointments });
    } catch (err) {
        console.error('getByDate Error:', err.message);
        res.status(500).json({ success: false, error: err.message });
    }
};


exports.searchPatients = async (req, res) => {
    try {
        const { slug } = req.params;
        const { q } = req.query;

        if (!q || q.length < 2) {
            return res.status(200).json({ success: true, data: [] });
        }

        const patients = await Patient.find({
            clinicSlug: slug,
            $or: [
                { mobile: { $regex: q, $options: 'i' } },
                { name: { $regex: q, $options: 'i' } }
            ]
        })
        .select('name mobile email age gender bloodGroup weight height bmi address allergies referenceType referenceName referenceMobile emMobile')
        .limit(8)
        .lean();

        res.status(200).json({ success: true, data: patients });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};