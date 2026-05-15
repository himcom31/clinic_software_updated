// controllers/notificationController.js
const NotificationConfig = require('../models/NotificationConfig');

// 1. Get Settings
exports.getSettings = async (req, res) => {
    try {
        const config = await NotificationConfig.findOne({ clinicSlug: req.params.clinicSlug });
        res.json({ success: true, data: config || {} });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 2. Save/Update Settings
exports.saveSettings = async (req, res) => {
    try {
        const { clinicSlug } = req.params;
        const updatedConfig = await NotificationConfig.findOneAndUpdate(
            { clinicSlug },
            { $set: req.body },
            { new: true, upsert: true }
        );
        res.json({ success: true, message: "Settings saved!", data: updatedConfig });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};