const mongoose = require('mongoose');

const symptomSchema = new mongoose.Schema({
    clinicSlug: { type: String, required: true, index: true },
    name: { type: String, required: true }, // e.g., "Fever", "Cough"
    category: { type: String, default: 'General' }, // e.g., "Respiratory", "Cardiac"
    usageCount: { type: Number, default: 0 } // Popular symptoms upar dikhane ke liye
}, { timestamps: true });

// Har clinic ke liye symptoms unique rahein
symptomSchema.index({ clinicSlug: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Symptom', symptomSchema);