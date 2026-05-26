const Doctor = require('../models/Doctor');
const bcrypt = require('bcryptjs');

// 1. GET PROFILE - Login Doctor ka profile dikhane ke liye
exports.getDoctorProfile = async (req, res) => {
    try {
        // req.user.id auth middleware se aur slug params se
        const doctor = await Doctor.findOne({ _id: req.user.id });
        
        if (!doctor) return res.status(404).json({ success: false, message: "Doctor not found" });

        res.status(200).json({ success: true, data: doctor });
    } catch (err) {
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

exports.getDoctorProfile_doc = async (req, res) => {
    try {
        const { slug } = req.params;

        // ✅ Find by slug directly — no req.user dependency
        const doctor = await Doctor.findOne({ slug });

        if (!doctor) {
            return res.status(404).json({ success: false, message: "Doctor not found" });
        }

        // ✅ Never send password field
        const { password, ...safeData } = doctor.toObject();

        res.status(200).json({ success: true, data: safeData });
    } catch (err) {
        console.error("GET_PROFILE_ERROR:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
};

// 2. UPDATE PROFILE - Name, specialization update
exports.updateDoctorProfile = async (req, res) => {
    try {
        const { name, phone, specialization } = req.body;
        const doctor = await Doctor.findByIdAndUpdate(
            req.user.id,
            { $set: { name, phone, specialization } },
            { new: true }
        );
        res.status(200).json({ success: true, data: doctor });
    } catch (err) {
        res.status(400).json({ success: false, message: "Update failed" });
    }
};

// 3. CHANGE PASSWORD - Security Section
exports.changePassword = async (req, res) => {
    try {
        const { oldPassword, newPassword } = req.body;
        const doctor = await Doctor.findById(req.user.id).select('+password');

        const isMatch = await bcrypt.compare(oldPassword, doctor.password);
        if (!isMatch) return res.status(401).json({ success: false, message: "Incorrect current password" });

        const salt = await bcrypt.genSalt(12);
        doctor.password = await bcrypt.hash(newPassword, salt);
        await doctor.save();

        res.status(200).json({ success: true, message: "Password updated successfully" });
    } catch (err) {
        res.status(500).json({ success: false, message: "Error changing password" });
    }
};

// 4. SYNC SETTINGS - Dark Mode, Language, Notifications
exports.updateDoctorSettings = async (req, res) => {
    try {
        const { darkMode, language, notifications } = req.body;
        
        // Nested updates using dot notation
        const updates = {};
        if (darkMode !== undefined) updates['settings.darkMode'] = darkMode;
        if (language) updates['settings.language'] = language;
        if (notifications) updates['settings.notifications'] = notifications;

        const doctor = await Doctor.findByIdAndUpdate(
            req.user.id,
            { $set: updates },
            { new: true }
        );

        res.status(200).json({ success: true, settings: doctor.settings });
    } catch (err) {
        res.status(400).json({ success: false, message: "Settings sync failed" });
    }
};