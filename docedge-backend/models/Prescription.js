// models/Prescription.js  — updated to persist tableData for revisit restore
const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema({
    slug:      String,
    patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient' },

    // Dynamic consultation form responses
    consultationResponses: [{
        fieldId: String,
        label:   String,
        value:   mongoose.Schema.Types.Mixed,
    }],

    // Symptoms
    symptoms: [{
        _id:      { type: mongoose.Schema.Types.ObjectId, ref: 'Symptom' },
        name:     String,
        isCustom: Boolean,
    }],

    // Medicines — all fields the frontend sends
    medicines: [{
        name:            String,
        brandName:       String,
        strength:        String,
        unit_per_Dose:   String,
        timing:          String,
        route:           String,
        duration:        String,
        action:          String,
        instructions:    String,
        category:        String,
        saltComposition: String,
    }],

    // Investigations
    investigations: [{
        testName: String,
        category: String,
        action:   String,
    }],

    // Vaccinations
    vaccinations: [{
        vaccineName: String,
        note:        String,
        action:      String,
    }],

    // Reports
    reports: [{
        reportName: String,
        impression: String,
        action:     String,
        date:       Date,
    }],

    // ── Dynamic table data ────────────────────────────────────────────────────
    // Keyed by field.id (string). Each value is an array of row objects.
    // Stored as Mixed so any column shape is preserved without a rigid sub-schema.
    // This is what powers the revisit auto-fill for table fields.
    tableData: {
        type:    mongoose.Schema.Types.Mixed,
        default: {},
    },

    // PDF storage
    pdfBinary:   Buffer,
    contentType: String,

}, { timestamps: true });

module.exports = mongoose.model('Prescription', prescriptionSchema);