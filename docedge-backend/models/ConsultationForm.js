const mongoose = require('mongoose');
 
const columnSchema = new mongoose.Schema({

    name: { type: String, required: true },
    type: {
        type: String,
        enum: ['text', 'number', 'date', 'dropdown', 'yesno'],
        default: 'text'
    }
}, { _id: false });
 
const fieldSchema = new mongoose.Schema({
    id:             { type: String, required: true },
    type: {
        type: String,
        enum: [
            'text', 'number', 'dropdown', 'boolean',
            'checkbox', 'date', 'textarea', 'file',
            'richtext', 'heading', 'yesno', 'symptom', 'table'
        ],
        required: true
    },
    label:          { type: String },
    placeholder:    { type: String },
    required:       { type: Boolean, default: false },
    options:        [String],
    value:          { type: String },
    defaultSymptoms:[String],
    // ── Table-specific fields ──────────────────────────────
    tableName:      { type: String, default: '' },
    collectionName: { type: String, default: '' },
    columns:        [columnSchema],
    // ──────────────────────────────────────────────────────
    order:          { type: Number }
}, { _id: false });
 
const sectionSchema = new mongoose.Schema({
    sectionTitle: { type: String, default: 'General' },
    fields:       [fieldSchema]
}, { _id: false });
 
const consultationFormSchema = new mongoose.Schema({
    slug: {
    type: String,
    required: true,
    unique: true,
},
    formName:   { type: String, required: true },
    speciality: { type: String },
    sections:   [sectionSchema],
    updatedAt:  { type: Date, default: Date.now }
});
 
module.exports = consultationFormSchema;