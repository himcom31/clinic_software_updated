const Letterhead = require('../models/Letterhead');

// --- 1. SAVE OR UPDATE DESIGN ---
exports.saveLetterheadDesign = async (req, res) => {
    try {
        const { slug } = req.params;

        const { templateId, color, elements } = req.body;

        const updatedDesign = await Letterhead.findOneAndUpdate(
            { slug },
            { slug, templateId, color, elements },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        res.status(200).json({
            success: true,
            message: "Design saved successfully!",
            data: updatedDesign
        });
    } catch (error) {
        console.error("Save Error:", error);
        res.status(500).json({ success: false, message: error.message });
    }
};

// --- 2. FETCH SAVED DESIGN ---
exports.getLetterheadDesign = async (req, res) => {
    try {
        const { slug } = req.params;
        const design = await Letterhead.findOne({ slug });

        if (!design) {
            return res.status(404).json({
                success: false,
                message: "No saved design found for this clinic."
            });
        }

        res.status(200).json({ success: true, data: design });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};