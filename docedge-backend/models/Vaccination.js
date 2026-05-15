const mongoose = require('mongoose');

const vaccinationSchema = new mongoose.Schema({
    
    // 🔥 Aapke tin main options
      clinicSlug: { type: String, required: true, index: true },
    vaccineName: { type: String, required: true }, 
    note: { type: String },                       
    action: { 
        type: String, 
    },

    date: { type: Date, default: Date.now },
}, { timestamps: true });

// Indexing for faster history lookup
vaccinationSchema.index({  date: -1 });

module.exports = vaccinationSchema;