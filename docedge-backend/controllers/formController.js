const mongoose = require('mongoose');
const formSchema = require('../models/ConsultationForm');

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: get/create the per-clinic FORM model
// e.g. slug = "dr-smith" → collection = "dr-smith_forms"
// ─────────────────────────────────────────────────────────────────────────────
function getFormModel(slug) {
    const collectionName = `${slug}_forms`;
    return mongoose.models[collectionName]
        || mongoose.model(collectionName, formSchema, collectionName);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: derive a safe MongoDB collection name
// slug = "dr-smith-clinic", tableName = "Vitals"
// → "dr_smith_clinic_vitals_table"
// ─────────────────────────────────────────────────────────────────────────────
function deriveCollectionName(slug, tableName) {
    const clean = (s) =>
        (s || '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    return `${clean(slug)}_${clean(tableName)}_table`;
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: get/create a dynamic ROW model for any table collection
// Used by all table CRUD functions below
// ─────────────────────────────────────────────────────────────────────────────
function getRowModel(collectionName) {
    if (mongoose.models[collectionName]) return mongoose.models[collectionName];
    const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
    return mongoose.model(collectionName, schema, collectionName);
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPER: build a typed Mongoose schema from column definitions
// columns = [{ name: 'Date', type: 'date' }, { name: 'BP', type: 'text' }, ...]
// ─────────────────────────────────────────────────────────────────────────────
function buildDynamicRowSchema(columns) {
    const schemaDef = {};
    columns.forEach(col => {
        switch (col.type) {
            case 'number':   schemaDef[col.name] = { type: Number, default: null };  break;
            case 'date':     schemaDef[col.name] = { type: Date,   default: null };  break;
            case 'yesno':    schemaDef[col.name] = { type: String, enum: ['Yes', 'No', ''], default: '' }; break;
            default:         schemaDef[col.name] = { type: String, default: '' };    break;
        }
    });
    return new mongoose.Schema(schemaDef, { strict: false, timestamps: true });
}


// =============================================================================
// 1. POST /api/clinic/:slug/save-form
//    Save the entire form layout (all sections + fields)
// =============================================================================
exports.saveFormStructure = async (req, res) => {
    try {
        const { slug } = req.params;
        const { formName, sections, speciality } = req.body;

        if ( !formName || !sections) {
            return res.status(400).json({
                success: false,
                message: 'doctorId, formName, and sections are required.'
            });
        }

        const FormModel = getFormModel(slug);

        const result = await FormModel.findOneAndUpdate(
            
            { formName },
            {  formName, sections, speciality, updatedAt: Date.now() },
            { upsert: true, new: true }
        );

        return res.status(200).json({
            success: true,
            message: 'Form layout saved!',
            data: result
        });

    } catch (error) {
        console.error('saveFormStructure error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


// =============================================================================
// 2. GET /api/clinic/:slug/get-form
//    Fetch the most recently saved form template for a clinic
// =============================================================================
exports.getFormStructure = async (req, res) => {
    try {
        const { slug } = req.params;
        const FormModel = getFormModel(slug);

        const form = await FormModel.findOne().sort({ updatedAt: -1 });

        if (!form) {
            return res.status(404).json({
                success: false,
                message: 'No form template found for this clinic.'
            });
        }

        return res.status(200).json({ success: true, data: form });

    } catch (error) {
        console.error('getFormStructure error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


// =============================================================================
// 3. POST /api/clinic/:slug/create-table
//    Called when doctor clicks "Save & Create Collection" in TableBuilderModal
//
//    Body: { tableName, collectionName?, columns: [{ name, type }] }
//
//    What it does:
//    - Validates input
//    - Derives the MongoDB collection name (same logic as frontend)
//    - Builds a typed Mongoose schema from the column definitions
//    - Registers the model (replaces it if already exists, for edits)
//    - Forces MongoDB to physically create the collection via sentinel insert
//    - Creates a createdAt index for performance
// =============================================================================
exports.createTableCollection = async (req, res) => {
    try {
        const { slug } = req.params;
        const { tableName, collectionName: clientCollName, columns } = req.body;

        // ── Validate ──────────────────────────────────────────────────────────
        if (!tableName || !tableName.trim()) {
            return res.status(400).json({ success: false, message: 'tableName is required.' });
        }
        if (!Array.isArray(columns) || columns.length === 0) {
            return res.status(400).json({ success: false, message: 'At least one column is required.' });
        }
        const badCol = columns.find(c => !c.name || !c.name.trim());
        if (badCol) {
            return res.status(400).json({ success: false, message: 'Every column must have a name.' });
        }

        // ── Derive collection name ─────────────────────────────────────────────
        const collectionName = (clientCollName && clientCollName.trim())
            ? clientCollName.trim()
            : deriveCollectionName(slug, tableName);

        // ── Build & register Mongoose model ───────────────────────────────────
        // Delete stale model if it exists (handles "edit columns" case)
        if (mongoose.models[collectionName]) {
            delete mongoose.models[collectionName];
        }

        const rowSchema = buildDynamicRowSchema(columns);
        const RowModel  = mongoose.model(collectionName, rowSchema, collectionName);

        // ── Force MongoDB to physically create the collection ─────────────────
        // MongoDB is lazy — collection only appears after first real insert.
        // We insert a sentinel doc and immediately delete it.
        const sentinel = await RowModel.create({ __sentinel: true });
        await RowModel.deleteOne({ _id: sentinel._id });

        // ── Add index on createdAt ─────────────────────────────────────────────
        await RowModel.collection.createIndex({ createdAt: -1 });

        return res.status(201).json({
            success: true,
            message: `Collection '${collectionName}' created successfully.`,
            data: {
                tableName:      tableName.trim(),
                collectionName,
                columns:        columns.map(c => ({ name: c.name.trim(), type: c.type })),
                clinicSlug:     slug,
            }
        });

    } catch (error) {
        console.error('createTableCollection error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


// =============================================================================
// 4. GET /api/table/:collectionName/rows
//    Fetch all rows from a dynamic table collection
//
//    Example: GET /api/table/dr_smith_clinic_vitals_table/rows
//    Returns: { success: true, data: [ ...rows ] }
// =============================================================================
exports.getRows = async (req, res) => {
    try {
        const { collectionName } = req.params;
        const Model = getRowModel(collectionName);
        const rows  = await Model.find().sort({ createdAt: -1 });
        return res.json({ success: true, data: rows });
    } catch (error) {
        console.error('getRows error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


// =============================================================================
// 5. POST /api/table/:collectionName/rows
//    Insert a new row into a dynamic table collection
//
//    Body: { "Date": "2024-01-15", "BP": "120/80", "Weight": 70 }
//    Returns: { success: true, data: { _id, ...rowData, createdAt } }
// =============================================================================
exports.addRow = async (req, res) => {
    try {
        const { collectionName } = req.params;
        const Model = getRowModel(collectionName);
        const row   = await Model.create(req.body);
        return res.status(201).json({ success: true, data: row });
    } catch (error) {
        console.error('addRow error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


// =============================================================================
// 6. PUT /api/table/:collectionName/rows/:rowId
//    Update an existing row by its MongoDB _id
//
//    Body: { "BP": "130/85" }   ← only the fields you want to change
//    Returns: { success: true, data: { updated row } }
// =============================================================================
exports.updateRow = async (req, res) => {
    try {
        const { collectionName, rowId } = req.params;
        const Model = getRowModel(collectionName);
        const row   = await Model.findByIdAndUpdate(rowId, req.body, { new: true });
        if (!row) return res.status(404).json({ success: false, message: 'Row not found.' });
        return res.json({ success: true, data: row });
    } catch (error) {
        console.error('updateRow error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};


// =============================================================================
// 7. DELETE /api/table/:collectionName/rows/:rowId
//    Delete a single row by its MongoDB _id
//
//    Returns: { success: true, message: 'Row deleted.' }
// =============================================================================
exports.deleteRow = async (req, res) => {
    try {
        const { collectionName, rowId } = req.params;
        const Model = getRowModel(collectionName);
        await Model.findByIdAndDelete(rowId);
        return res.json({ success: true, message: 'Row deleted.' });
    } catch (error) {
        console.error('deleteRow error:', error);
        return res.status(500).json({ success: false, message: error.message });
    }
};