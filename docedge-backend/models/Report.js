const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
    appointmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Appointment' },
    
    // 🔥 Aapke required fields
    reportName: { type: String, required: true }, // e.g., "Blood Test", "X-Ray"
    date: { type: Date, default: Date.now },       // Report ki date
    impression: { type: String },                 // Doctor ka observation/findings
    action: { type: String },                     // Next step ya treatment plan

    // Optional: Files ke liye (Agar doctor report ki photo upload kare)
}, { timestamps: true });

// Indexing for faster searching
reportSchema.index({ patientId: 1, date: -1 });

module.exports = reportSchema;