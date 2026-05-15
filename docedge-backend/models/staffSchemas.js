const mongoose = require('mongoose');

// Staff Template (Har clinic ka alag collection banega: slug_staffs)
const staffSchema = new mongoose.Schema({
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['Receptionist', 'Assistant'], default: 'Receptionist' },
    permissions: {
        canAddPatients: { type: Boolean, default: true },
        canManageAppointments: { type: Boolean, default: true },
        canEditBilling: { type: Boolean, default: false },
        canViewReports: { type: Boolean, default: false },
        canAddPrescription: { type: Boolean, default: false },
        canAddMedicine: { type: Boolean, default: false },
        canAddTest: { type: Boolean, default: false },
        canAddAdvice: { type: Boolean, default: false },
        canDeleteData: { type: Boolean, default: false },
        // Purani key agar inventory use kar rahe ho toh rehne de sakte ho
        canManageInventory: { type: Boolean, default: false } 
    },
    isActive: { type: Boolean, default: true },
    clinicSlug: { type: String, required: true }
}, { timestamps: true });

// Activity Log Template (Har clinic ka alag: slug_activity_logs)
const logSchema = new mongoose.Schema({
    staffName: String,
    staffRole: String,
    action: String, 
    details: String,
    timestamp: { type: Date, default: Date.now }
});

module.exports = { staffSchema, logSchema };