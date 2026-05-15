const mongoose = require('mongoose');

const investigationSchema = new mongoose.Schema({
  clinicSlug: { type: String, required: true, index: true },
  testName: { type: String, required: true, index: true }, // e.g., CBC, MRI Brain
  shortName: { type: String }, // e.g., Thyroid Profile -> TFT
  category: { 
    type: String, 
  
    default: 'Pathology' 
  },
  sampleType: { type: String }, // e.g., Blood, Urine, Swab, Body Part (for X-ray)
  normalRange: { type: String }, // e.g., 12.0 - 15.0
  unit: { type: String }, // e.g., g/dL, mg/dL
  action:{type : String}, // e.g., Fasting, Postprandial, Random (for blood sugar)
  price: { type: Number, default: 0 }, // Clinic charges for this test
  isFavorite: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Fast search logic
investigationSchema.index({ clinicSlug: 1, testName: 1 });

module.exports = investigationSchema;