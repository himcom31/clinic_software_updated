const mongoose = require('mongoose');
const formSchema = require('../models/ConsultationForm');

function getFormModel(slug) {
    const collectionName = `${slug}_forms`;
    return mongoose.models[collectionName]
        || mongoose.model(collectionName, formSchema, collectionName);
}

function deriveCollectionName(slug, tableName) {
    const clean = (s) =>
        (s || '')
            .toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .replace(/^_|_$/g, '');
    return `${clean(slug)}_${clean(tableName)}_table`;
}

function getRowModel(collectionName) {
    if (mongoose.models[collectionName]) return mongoose.models[collectionName];
    const schema = new mongoose.Schema({}, { strict: false, timestamps: true });
    return mongoose.model(collectionName, schema, collectionName);
}

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
// =============================================================================
exports.saveFormStructure = async (req, res) => {
    try {
        const { slug } = req.params;
        // ── Accept blockOrder from the request body ───────────────────────────
        const { formName, sections, speciality, blockOrder } = req.body;

        if (!formName || !sections) {
            return res.status(400).json({
                success: false,
                message: 'formName and sections are required.'
            });
        }

        const FormModel = getFormModel(slug);

        const result = await FormModel.findOneAndUpdate(
            { formName },
            {
                formName,
                sections,
                speciality,
                blockOrder: blockOrder || [],   // ← save blockOrder, default to []
                updatedAt:  Date.now()
            },
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
//    blockOrder is returned as part of the form document automatically
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
// =============================================================================
exports.createTableCollection = async (req, res) => {
    try {
        const { slug } = req.params;
        const { tableName, collectionName: clientCollName, columns } = req.body;

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

        const collectionName = (clientCollName && clientCollName.trim())
            ? clientCollName.trim()
            : deriveCollectionName(slug, tableName);

        if (mongoose.models[collectionName]) {
            delete mongoose.models[collectionName];
        }

        const rowSchema = buildDynamicRowSchema(columns);
        const RowModel  = mongoose.model(collectionName, rowSchema, collectionName);

        const sentinel = await RowModel.create({ __sentinel: true });
        await RowModel.deleteOne({ _id: sentinel._id });

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
// 4–7. Table row CRUD (unchanged)
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