const Letterhead = require('../models/Letterhead');
const Patient = require('../models/PatientSchema');
const consultationFormSchema = require('../models/ConsultationForm');
const Prescription = require('../models/Prescription');
const mongoose = require('mongoose');
const Appointment = require('../models/Appointment');


// ── GET INITIAL DATA ─────────────────────────────────────────────────────────
exports.getInitialData = async (req, res) => {
    try {
        const { slug, phone } = req.query;

        // 1. Fetch Letterhead Design
        const design = await Letterhead.findOne({ slug });

        // 2. Fetch Patient by mobile
        const patient = await Patient.findOne({ mobile: phone, clinicSlug: slug }).lean();

        if (!patient) {
            return res.status(404).json({
                success: false,
                message: "Patient not found. Please register first."
            });
        }

        // 3. Fetch Consultation Form Structure
        const collectionName = `${slug}_forms`;
        const FormModel = mongoose.models[collectionName] ||
            mongoose.model(collectionName, consultationFormSchema, collectionName);
        const formStructure = await FormModel.findOne().sort({ updatedAt: -1 });

        // 4. Fetch the most recent prescription for this patient
        const lastPrescription = await Prescription.findOne(
            { patientId: patient._id, slug },
            {
                pdfBinary: 0,
                contentType: 0,
            }
        )
            .sort({ createdAt: -1 })
            .lean();

        if (lastPrescription) {
            console.log('[getInitialData] lastPrescription fields present:', {
                _id: lastPrescription._id,
                medicines_count: lastPrescription.medicines?.length ?? 'MISSING',
                symptoms_count: lastPrescription.symptoms?.length ?? 'MISSING',
                investigations_count: lastPrescription.investigations?.length ?? 'MISSING',
                vaccinations_count: lastPrescription.vaccinations?.length ?? 'MISSING',
                consultationResponses_count: lastPrescription.consultationResponses?.length ?? 'MISSING',
            });
        }

        // 5. isRevisit = true if patient has any previous prescription
        const isRevisit = !!lastPrescription;

        res.json({
            success: true,
            data: {
                design,
                patient,
                formStructure: formStructure || null,
                lastPrescription: lastPrescription || null,
                isRevisit,
            }
        });

    } catch (err) {
        console.error("getInitialData Error:", err);
        res.status(500).json({ success: false, message: err.message });
    }
};


// ── SAVE / UPDATE FINAL PRESCRIPTION ─────────────────────────────────────────
// FIX: If appointmentId is provided and a prescription already exists for that
//      appointment, UPDATE it in-place instead of creating a new document.
//      This ensures download always returns the latest data.
exports.saveFinalPrescription = async (req, res) => {
    try {
        const {
            pdfBinary,
            patientId,
            slug,
            appointmentId,          // ← REQUIRED from frontend for upsert logic
            consultationResponses,
            medicines,
            symptoms,
            investigations,
            vaccinations,
            repots,
            ...rest
        } = req.body;

        if (!pdfBinary) {
            return res.status(400).json({ success: false, message: "PDF data is missing" });
        }

        // Strip base64 prefix and convert to Buffer
        const base64Data = pdfBinary.split(',')[1];
        const buffer = Buffer.from(base64Data, 'base64');

        console.log('[saveFinalPrescription] saving:', {
            patientId,
            slug,
            appointmentId,
            medicines_count: (medicines || []).length,
            symptoms_count: (symptoms || []).length,
            investigations_count: (investigations || []).length,
            vaccinations_count: (vaccinations || []).length,
            consultationResponses_count: (consultationResponses || []).length,
        });

        // ── UPSERT LOGIC ──────────────────────────────────────────────────────
        // If appointmentId is given, check whether a prescription already exists
        // for that appointment. If yes → UPDATE it. If no → CREATE new.
        let savedPrescription;
        let isUpdate = false;

        if (appointmentId) {
            // Look up the appointment to find linked prescription(s)
            const appt = await Appointment.findById(appointmentId).lean();

            if (appt && appt.prescriptions && appt.prescriptions.length > 0) {
                // A prescription already exists — UPDATE the first linked one
                const existingPrescriptionId = appt.prescriptions[0];

                savedPrescription = await Prescription.findByIdAndUpdate(
                    existingPrescriptionId,
                    {
                        $set: {
                            ...rest,
                            patientId,
                            slug,
                            consultationResponses: consultationResponses || [],
                            medicines: medicines || [],
                            symptoms: symptoms || [],
                            investigations: investigations || [],
                            vaccinations: vaccinations || [],
                            pdfBinary: buffer,
                            contentType: "application/pdf",
                            updatedAt: new Date(),
                        }
                    },
                    { new: true }
                );

                isUpdate = true;
                console.log('[saveFinalPrescription] UPDATED existing prescription:', existingPrescriptionId);
            }
        }

        if (!isUpdate) {
            // No existing prescription found — create a new one
            const newRecord = new Prescription({
                ...rest,
                patientId,
                slug,
                appointmentId: appointmentId || undefined,
                consultationResponses: consultationResponses || [],
                medicines: medicines || [],
                symptoms: symptoms || [],
                investigations: investigations || [],
                vaccinations: vaccinations || [],
                pdfBinary: buffer,
                contentType: "application/pdf",
            });

            savedPrescription = await newRecord.save();
            console.log('[saveFinalPrescription] CREATED new prescription:', savedPrescription._id);

            // Link prescription to patient
            await Patient.findByIdAndUpdate(
                patientId,
                { $push: { prescriptions: savedPrescription._id } },
                { new: true }
            );

            // Link prescription to the appointment (if appointmentId given)
            if (appointmentId) {
                await Appointment.findByIdAndUpdate(
                    appointmentId,
                    {
                        $push: { prescriptions: savedPrescription._id },
                        $set: { status: 'Completed' }   // auto-complete the appointment
                    },
                    { new: true }
                );
            } else {
                // Fallback: link to most recent appointment for this patient
                await Appointment.findOneAndUpdate(
                    { patientId, clinicSlug: slug },
                    {
                        $push: { prescriptions: savedPrescription._id },
                        $set: { status: 'Completed' }
                    },
                    { sort: { createdAt: -1 }, new: true }
                );
            }
        } else {
            // For updates, also ensure appointment status is Completed
            if (appointmentId) {
                await Appointment.findByIdAndUpdate(
                    appointmentId,
                    { $set: { status: 'Completed' } },
                    { new: true }
                );
            }
        }

        console.log('[saveFinalPrescription] saved doc fields:', {
            _id: savedPrescription._id,
            medicines_count: savedPrescription.medicines?.length,
            symptoms_count: savedPrescription.symptoms?.length,
            investigations_count: savedPrescription.investigations?.length,
            vaccinations_count: savedPrescription.vaccinations?.length,
            isUpdate,
        });

        res.json({
            success: true,
            message: isUpdate ? "Prescription updated successfully!" : "Prescription created successfully!",
            prescriptionId: savedPrescription._id,  // ← Return ID so frontend can update state immediately
            isUpdate,
        });

    } catch (err) {
        console.error("saveFinalPrescription Error:", err.message);
        res.status(500).json({ message: err.message });
    }
};


// ── DOWNLOAD PRESCRIPTION PDF ────────────────────────────────────────────────
exports.downloadPrescription = async (req, res) => {
    try {
        const { id } = req.params;

        const prescription = await Prescription.findById(id).select('pdfBinary contentType');

        if (!prescription || !prescription.pdfBinary) {
            return res.status(404).json({ success: false, message: "Prescription not found" });
        }

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename="prescription-${id}.pdf"`,
            'Content-Length': prescription.pdfBinary.length,
        });

        res.send(prescription.pdfBinary);

    } catch (err) {
        console.error("downloadPrescription Error:", err);
        res.status(500).json({ message: err.message });
    }
};


// ── DYNAMIC TABLE HELPERS ─────────────────────────────────────────────────────
const dynamicRowSchema = new mongoose.Schema(
    {
        patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },
        appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
        slug: String,
    },
    { timestamps: true, strict: false }
);

const getDynamicModel = (collectionName) => {
    return (
        mongoose.models[collectionName] ||
        mongoose.model(collectionName, dynamicRowSchema, collectionName)
    );
};

exports.searchTableRows = async (req, res) => {
    try {
        const { collectionName } = req.params;
        const { q = '', slug, limit = 10 } = req.query;

        if (!collectionName) {
            return res.status(400).json({ success: false, message: 'collectionName is required' });
        }

        const Model = getDynamicModel(collectionName);

        let dbQuery = {};
        if (slug) dbQuery.slug = slug;

        const rows = await Model.find(dbQuery)
            .sort({ createdAt: -1 })
            .limit(200)
            .lean();

        const lower = q.toLowerCase().trim();

        const filtered = lower.length === 0
            ? rows.slice(0, Number(limit))
            : rows
                .filter(row =>
                    Object.entries(row).some(([key, val]) => {
                        if (['_id', '__v', 'patientId', 'appointmentId', 'slug', 'createdAt', 'updatedAt'].includes(key)) return false;
                        return String(val ?? '').toLowerCase().includes(lower);
                    })
                )
                .slice(0, Number(limit));

        res.json({ success: true, data: filtered });
    } catch (err) {
        console.error('searchTableRows error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.saveTableRow = async (req, res) => {
    try {
        const { collectionName } = req.params;
        if (!collectionName) {
            return res.status(400).json({ success: false, message: 'collectionName is required' });
        }

        const Model = getDynamicModel(collectionName);

        const { patientId, appointmentId, slug, ...columnData } = req.body;

        const filter = {
            slug,
            ...columnData,
        };

        const saved = await Model.findOneAndUpdate(
            filter,
            {
                $setOnInsert: { patientId, slug, ...columnData },
                $set: { appointmentId },
            },
            { upsert: true, new: true, lean: true }
        );

        res.status(201).json({ success: true, data: saved });
    } catch (err) {
        console.error('saveTableRow error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.getRowsByPatient = async (req, res) => {
    try {
        const { collectionName, patientId } = req.params;
        if (!collectionName || !patientId) {
            return res.status(400).json({ success: false, message: 'collectionName and patientId are required' });
        }

        const Model = getDynamicModel(collectionName);
        const rows = await Model.find({ patientId })
            .sort({ createdAt: -1 })
            .lean();

        res.json({ success: true, data: rows });
    } catch (err) {
        console.error('getRowsByPatient error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
};