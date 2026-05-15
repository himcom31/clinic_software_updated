const mongoose = require('mongoose');

// Each draggable image element on the canvas
const elementSchema = new mongoose.Schema({
    id:      { type: String, required: true },
    src:     { type: String, required: true }, // Base64 image data
    label:   { type: String, default: 'Image' },
    x:       { type: Number, default: 40 },
    y:       { type: Number, default: 40 },
    w:       { type: Number, default: 200 },
    h:       { type: Number, default: 120 },
    opacity: { type: Number, default: 1 },
    zIndex:  { type: Number, default: 10 },
}, { _id: false });

const letterheadSchema = new mongoose.Schema({
    slug: {
        type: String,
        required: true,
        unique: true,
    },
    templateId: {
        type: Number,
        default: 1,
    },
    color: {
        type: String,
        default: '#ec4899',
    },
    // All draggable image elements (logo, stamp, signature, header image, etc.)
    elements: [elementSchema],

}, { timestamps: true });

module.exports = mongoose.model('Letterhead', letterheadSchema);