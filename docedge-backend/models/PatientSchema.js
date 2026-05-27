const mongoose = require('mongoose');

const PatientSchema = new mongoose.Schema({
    // 🔥 Clinic Identification
    clinicSlug: { 
        type: String, 
        required: true, 
        index: true 
    },

    // 1. Basic Info (From your Image)
    name: { type: String, required: true, trim: true },
    mobile: { type: String, required: true }, // Main Mobile
    emMobile: { type: String },               // 2. Emergency Mobile
    email: { type: String, trim: true, lowercase: true }, // 4. Email
    age: { type: Number },                    // 5. Age
    gender: { 
        type: String, 
        enum: ['Male', 'Female', 'Other'], 
        default: 'Male' 
    },
    bloodGroup: { type: String },             // 7. Blood Group

    // 2. Vitals & Clinical Data (From your Image)
    weight: { type: Number },                 // 8. Weight (kg)
    height: { type: Number },                 // 9. Height (cm)
    bmi: { type: String },                    // 10. BMI (Auto-calculated on Frontend)
    allergies: { type: String },              // 13. Allergies
    address: { type: String },                // 12. Address

    // 3. Reference Info (From your Image - Section 11)
    referenceType: { 
        type: String, 
        enum: ['Self', 'Other'], 
        default: 'Self' 
    },
    referenceName: { type: String },          // If Other
    referenceMobile: { type: String },        // If Other

    // 4. Appointment & Billing Tracking (Section 15 & 16)
    consultationFee: {
        status: { type: String, enum: ['Yes', 'No', 'Partial'], default: 'No' },
        paidAmount: { type: Number, default: 0 },
        validUpto: { type: Date }             // 16. Validity Date
    },

    // 5. Records & History
    prescriptions: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' }],
    billingRecords: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Invoice' }],
    
    lastVisit: { type: Date, default: Date.now },
    notes: { type: String }

}, { timestamps: true });

// Compound Index: Ek clinic mein ek mobile number ek hi bar register ho sake
PatientSchema.index({ clinicSlug: 1, mobile: 1 }, { unique: true });

module.exports = mongoose.model('Patient', PatientSchema);