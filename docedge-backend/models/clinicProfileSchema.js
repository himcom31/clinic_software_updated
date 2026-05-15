const mongoose = require('mongoose');

const doctorEntrySchema = new mongoose.Schema({
    doctorName: { type: String, required: true },
    degree: { type: String },
    specialization: { type: String },
}, { _id: true });

const clinicProfileSchema = new mongoose.Schema({
    // Connection Link
    doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },

    // Basic Details
    clinicName: { type: String, required: true },

    // ── Multi-Doctor Support ──────────────────────────────────────────────────
    // Each entry: { doctorName, degree, specialization }
    doctors: {
        type: [doctorEntrySchema],
        default: []
    },

    // Legacy single-doctor fields (kept for backward compatibility)
    // These will be auto-populated from doctors[0] on save
    doctorName: { type: String },
    degree: { type: String },
    specialization: { type: String },

    regNumber: { type: String },

    // Contact Info
    mobile: { type: String },
    email: { type: String },
    website: { type: String },
    address: { type: String },

    // Branding
    logo: { type: String },
    signature: { type: String },
    themeColor: { type: String, default: '#006e78' },

    // Timing
    timing: {
        openAt: { type: String },
        closeAt: { type: String },
        weeklyOff: { type: String }
    },

    // Pricing & Appointment Policy
    consultationFee: {
        type: Number,
        default: 0
    },
    appointmentValidity: {
        type: Number,
        default: 7,
        description: "Number of days the appointment/fee is valid for follow-up"
    },

    // Multi-Branch Support
    isMainBranch: { type: Boolean, default: true },
    branchName: { type: String },

    updatedAt: { type: Date, default: Date.now }
}, { strict: false });

module.exports = clinicProfileSchema;