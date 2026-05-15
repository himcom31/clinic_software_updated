const mongoose = require('mongoose');

const medicineSchema = new mongoose.Schema({
  clinicSlug: { type: String, required: true, index: true },
  name: { type: String, required: true, index: true }, // Fast search ke liye index
  brandName: { type: String },
  unit_per_Dose:{ type: String },
  timing:{ type: String },
  duration:{ type: String },
  action:{ type: String },
  route:{ type: String },
  category: { type: String,  default: 'Tablet' },
  saltComposition: { type: String }, // Composition search ke liye
  strength: { type: String }, // e.g. 500mg
  isFavorite: { type: Boolean, default: false },
  instructions: { type: String }, // Default instructions like "After Food"
  createdAt: { type: Date, default: Date.now }
});

// Compound Indexing for clinic-specific fast search
medicineSchema.index({ clinicSlug: 1, name: 1 });

module.exports = medicineSchema; // Dynamic collection ke liye exports

