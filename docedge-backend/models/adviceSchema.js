const mongoose = require('mongoose');

const adviceSchema = new mongoose.Schema({
  clinicSlug: { type: String, required: true, index: true },
  title: { type: String, required: true }, // e.g., "Drink plenty of water"
  category: { 
    type: String, 
    enum: ['Diet', 'Lifestyle', 'Follow-up', 'General', 'Warning'], 
    default: 'General' 
  },
  isFavorite: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});

// Search performance ke liye
adviceSchema.index({ clinicSlug: 1, title: 'text' });

module.exports = adviceSchema;