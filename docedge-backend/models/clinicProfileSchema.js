const mongoose = require('mongoose');

const clinicProfileSchema = new mongoose.Schema({

    // ── Auth Link ─────────────────────────────────────────────────────────────
    doctorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Doctor',
        required: true
    },

    // ── Clinic Basic Details ──────────────────────────────────────────────────
    clinicName: {
        type: String,
        required: true
    },

    // ── Single Doctor Details ─────────────────────────────────────────────────
    doctorName: {
        type: String,
        required: true
    },
    degree: {
        type: String,
        default: ''
    },
    specialization: {
        type: String,
        default: ''
    },

    // ── Registration ──────────────────────────────────────────────────────────
    regNumber: {
        type: String,
        default: ''
    },

    // ── Contact Info ──────────────────────────────────────────────────────────
    mobile:  { type: String, default: '' },
    email:   { type: String, default: '' },
    website: { type: String, default: '' },
    address: { type: String, default: '' },

    // ── Branding ──────────────────────────────────────────────────────────────
    logo:       { type: String, default: '' },
    signature:  { type: String, default: '' },
    themeColor: { type: String, default: '#2563eb' },

    // ── Clinic Timing ─────────────────────────────────────────────────────────
    timing: {
        openAt:    { type: String, default: '' },
        closeAt:   { type: String, default: '' },
        weeklyOff: { type: String, default: 'No Weekly Off' }
    },

    // ── Pricing & Appointment Policy ──────────────────────────────────────────
    consultationFee: {
        type: Number,
        default: 0
    },
    appointmentValidity: {
        type: Number,
        default: 7
        // Number of days the appointment/fee is valid for follow-up
    },

    // ── Multi-Branch Support ──────────────────────────────────────────────────
    isMainBranch: { type: Boolean, default: true },
    branchName:   { type: String,  default: 'Main Branch' },

    // ── Timestamps ────────────────────────────────────────────────────────────
    updatedAt: { type: Date, default: Date.now }

}, { strict: false });

module.exports = clinicProfileSchema;