const mongoose = require('mongoose');
const clinicSchema = require('../models/clinicProfileSchema');

// ── Helper: get or create dynamic model ──────────────────────────────────────
const getClinicModel = (slug) => {
    const collectionName = `${slug.toLowerCase().replace(/\s+/g, '_')}_profile`;
    return {
        collectionName,
        ClinicModel: mongoose.models[collectionName] ||
            mongoose.model(collectionName, clinicSchema, collectionName)
    };
};

// ── Upsert (Save / Update) ───────────────────────────────────────────────────
exports.upsertClinicProfile = async (req, res) => {
    try {
        const { slug } = req.params;
        const data = req.body;
        const { collectionName, ClinicModel } = getClinicModel(slug);

        // ── Parse doctors array sent from frontend ────────────────────────────
        // Frontend sends it as JSON string (FormData limitation)
        let doctors = [];
        if (data.doctors) {
            try {
                doctors = JSON.parse(data.doctors);
            } catch {
                doctors = [];
            }
        }

        // Ensure at least one doctor entry exists
        if (!Array.isArray(doctors) || doctors.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one doctor entry is required."
            });
        }

        // Validate each doctor entry has a name
        for (const doc of doctors) {
            if (!doc.doctorName || doc.doctorName.trim() === '') {
                return res.status(400).json({
                    success: false,
                    message: "Each doctor entry must have a name."
                });
            }
        }

        // Handle file uploads
        let logoPath = data.logo;
        let sigPath = data.signature;
        if (req.files) {
            if (req.files['logo'])      logoPath = `/uploads/logos/${req.files['logo'][0].filename}`;
            if (req.files['signature']) sigPath  = `/uploads/signatures/${req.files['signature'][0].filename}`;
        }

        // Build profile payload
        // Legacy single fields are populated from first doctor for backward compatibility
        const profileData = {
            doctorId: new mongoose.Types.ObjectId(data.doctorId),
            clinicName: data.clinicName,

            // ── Multi-doctor array ────────────────────────────────────────────
            doctors: doctors.map(d => ({
                doctorName: d.doctorName.trim(),
                degree: (d.degree || '').trim(),
                specialization: (d.specialization || '').trim(),
            })),

            // Legacy compat: mirror first doctor
            doctorName: doctors[0].doctorName.trim(),
            degree: (doctors[0].degree || '').trim(),
            specialization: (doctors[0].specialization || '').trim(),

            regNumber: data.regNumber,
            mobile: data.mobile,
            email: data.email,
            website: data.website,
            address: data.address,
            logo: logoPath,
            signature: sigPath,
            themeColor: data.themeColor,
            timing: {
                openAt: data.openAt || '',
                closeAt: data.closeAt || '',
                weeklyOff: data.weeklyOff || ''
            },
            consultationFee: Number(data.consultationFee) || 0,
            appointmentValidity: Number(data.appointmentValidity) || 7,
            branchName: data.branchName || 'Main Branch',
            isMainBranch: data.isMainBranch === 'true' || data.isMainBranch === true,
            updatedAt: Date.now()
        };

        const filter = {
            doctorId: profileData.doctorId,
            branchName: profileData.branchName
        };

        const result = await ClinicModel.findOneAndUpdate(
            filter,
            { $set: profileData },
            {
                upsert: true,
                returnDocument: 'after',
                runValidators: true,
                setDefaultsOnInsert: true
            }
        );

        res.status(200).json({
            success: true,
            message: `Profile synced with ${collectionName}`,
            data: result
        });

    } catch (error) {
        console.error("UPSERT_ERROR:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Get Clinic Profile (Public / Lightweight) ────────────────────────────────
exports.getClinicProfile = async (req, res) => {
    try {
        const { slug } = req.params;
        const { ClinicModel } = getClinicModel(slug);

        const profile = await ClinicModel.findOne().sort({ updatedAt: -1 }).lean();

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Clinic profile not found for this slug."
            });
        }

        res.status(200).json({
            success: true,
            data: {
                consultationFee: profile.consultationFee,
                appointmentValidity: profile.appointmentValidity,
                clinicName: profile.clinicName,
                // Include doctors array in lightweight response too
                doctors: profile.doctors || []
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// ── Get Full Clinic Profile (Settings Page) ──────────────────────────────────
exports.getClinicProfile1 = async (req, res) => {
    try {
        const { slug } = req.params;
        const { ClinicModel } = getClinicModel(slug);

        const profile = await ClinicModel.findOne().sort({ updatedAt: -1 }).lean();

        if (!profile) {
            return res.status(404).json({
                success: false,
                message: "Clinic profile not found."
            });
        }

        // ── Backward compat: if old record has no doctors array, build one from legacy fields ──
        if (!profile.doctors || profile.doctors.length === 0) {
            profile.doctors = [];
            if (profile.doctorName) {
                profile.doctors.push({
                    _id: 'legacy',
                    doctorName: profile.doctorName,
                    degree: profile.degree || '',
                    specialization: profile.specialization || ''
                });
            }
        }

        res.status(200).json({
            success: true,
            data: profile
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};