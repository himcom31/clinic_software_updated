const mongoose = require('mongoose');

const AppointmentSchema = new mongoose.Schema({
    clinicSlug: { type: String, required: true, index: true },
    patientId:  { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },

    // Redundancy data (Dashboard par bina populate kiye dikhane ke liye)
    patientName: { type: String, required: true },
    mobile:      { type: String, required: true },

    appointmentDate: { type: Date, required: true },
    slotTime:        { type: String },

    tokenNumber: { type: Number },
    type:        { type: String, enum: ['Online', 'Walk-in'], default: 'Walk-in' },

    status: {
        type: String,
        enum: ['Waiting', 'In-Consultation', 'Completed', 'Cancelled'],
        default: 'Waiting'
    },

    // NEW vs REVISIT
    visitType: {
        type: String,
        enum: ['New Patient', 'Revisit Patient', 'NEW', 'REVISIT'],
        default: 'New Patient'
    },

    // ── Billing flags ─────────────────────────────────────────────────────────
    fees:     { type: Number, default: 0 },       // consultation fee set at booking
    isBilled: { type: Boolean, default: false },  // set to true when BillingModule creates invoice

    // Legacy billing sub-doc (from bookAppointment flow)
    billing: {
        totalFees:     { type: Number, default: 0 },
        paidAmount:    { type: Number, default: 0 },
        paymentStatus: {
            type:    String,
            enum:    ['Paid', 'Unpaid', 'Partial'],
            default: 'Unpaid'
        },
        validUpto:   { type: Date },
        previousDue: { type: Number, default: 0 }
    },

    prescriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' }],

    // Vitals
    vitals: {
        weight: Number,
        height: Number,
        bmi:    Number
    },

    reason: { type: String },
    notes:  { type: String }

}, { timestamps: true });

// Indexing for faster Queue management
AppointmentSchema.index({ clinicSlug: 1, appointmentDate: 1, tokenNumber: 1 });
AppointmentSchema.index({ clinicSlug: 1, isBilled: 1 });

module.exports = mongoose.model('Appointment', AppointmentSchema);