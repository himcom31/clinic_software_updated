const Symptom = require('../models/Symptom');

// 1. Get all symptoms for a clinic
exports.getClinicSymptoms = async (req, res) => {
    try {
        const { slug } = req.params;
        const symptoms = await Symptom.find({ clinicSlug: slug })
                                     .sort({ usageCount: -1, name: 1 });
        res.json({ success: true, data: symptoms });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 2. Add or Update Usage (Jab doctor symptom select kare)
exports.addSymptom = async (req, res) => {
    try {
        const { slug } = req.params;
        const { name, category } = req.body;

        // Agar symptom pehle se hai toh count badhao, nahi toh naya banao
        const symptom = await Symptom.findOneAndUpdate(
            { clinicSlug: slug, name: name.trim() },
            { $inc: { usageCount: 1 }, $set: { category } },
            { upsert: true, new: true }
        );

        res.json({ success: true, data: symptom });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 3. Search Symptoms (Auto-complete ke liye)
exports.searchSymptoms = async (req, res) => {
    try {
        const { slug } = req.params;
        const { q } = req.query; // Search term
        const symptoms = await Symptom.find({
            clinicSlug: slug,
            name: { $regex: q, $options: 'i' }
        }).limit(10);
        
        res.json({ success: true, data: symptoms });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};