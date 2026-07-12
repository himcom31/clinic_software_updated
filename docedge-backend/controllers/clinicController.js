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

        // ── Validate doctorId ─────────────────────────────────────────────────
        if (!data.doctorId || !mongoose.Types.ObjectId.isValid(data.doctorId)) {
            return res.status(400).json({
                success: false,
                message: "Invalid or missing doctorId. Please log in again."
            });
        }

        // ── Validate doctor name ──────────────────────────────────────────────
        // if (!data.doctorName || !data.doctorName.trim()) {
        //     return res.status(400).json({
        //         success: false,
        //         message: "Doctor name is required."
        //     });
        // }

        // ── Validate clinic name ──────────────────────────────────────────────
        if (!data.clinicName || !data.clinicName.trim()) {
            return res.status(400).json({
                success: false,
                message: "Clinic name is required."
            });
        }

        const existing = await ClinicModel.findOne({
            doctorId: new mongoose.Types.ObjectId(data.doctorId)
        }).lean();

        let logoPath = data.logo || existing?.logo || '';
        let sigPath = data.signature || existing?.signature || '';
        if (req.files) {
            if (req.files['logo']) logoPath = `/uploads/logos/${req.files['logo'][0].filename}`;
            if (req.files['signature']) sigPath = `/uploads/signatures/${req.files['signature'][0].filename}`;
        }

        // ── Build profile payload ─────────────────────────────────────────────
        const profileData = {
            doctorId: new mongoose.Types.ObjectId(data.doctorId),
            clinicName: data.clinicName.trim(),
            doctorName: data.doctorName.trim(),
            degree: (data.degree || '').trim(),
            specialization: (data.specialization || '').trim(),
            regNumber: data.regNumber || '',
            mobile: data.mobile || '',
            email: data.email || '',
            website: data.website || '',
            address: data.address || '',
            logo: logoPath,
            signature: sigPath,
            themeColor: data.themeColor || '#2563eb',
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
            return res.status(200).json({
                success: false,
                message: "No clinic profile found for this slug."
            });
        }

        res.status(200).json({
            success: true,
            data: {
                consultationFee: profile.consultationFee,
                appointmentValidity: profile.appointmentValidity,
                clinicName: profile.clinicName,
                doctorName: profile.doctorName || '',
                degree: profile.degree || '',
                specialization: profile.specialization || '',
                logo: profile.logo || '',
                mobile: profile.mobile || '',
                email: profile.email || '',
                address: profile.address || '',
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

        // Return 200 with success: false so frontend doesn't throw on new setup
        if (!profile) {
            return res.status(200).json({
                success: false,
                message: "No clinic profile found — new setup."
            });
        }

        res.status(200).json({
            success: true,
            data: profile
        });

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};