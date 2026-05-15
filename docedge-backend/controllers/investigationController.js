const mongoose = require('mongoose');
const investigationSchema = require('../models/Investigation');

const getInvModel = (slug) => {
  const collectionName = `${slug}_investigations`;
  return mongoose.models[collectionName] || mongoose.model(collectionName, investigationSchema, collectionName);
};

// 1. Add/Update Test
exports.saveTest = async (req, res) => {
  try {
    const { slug } = req.params;
    const { id } = req.body;
    const Inv = getInvModel(slug);

    if (id) {
      const updated = await Inv.findByIdAndUpdate(id, req.body, { returnDocument: 'after' });
      return res.status(200).json({ success: true, data: updated });
    }
    const newTest = await Inv.create({ ...req.body, clinicSlug: slug });
    res.status(201).json({ success: true, data: newTest });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// 2. AJAX Search for Prescription Autocomplete
exports.searchTests = async (req, res) => {
  try {
    const { slug } = req.params;
    const { q } = req.query;
    const Inv = getInvModel(slug);

    const results = await Inv.find({
      clinicSlug: slug,
      testName: { $regex: `^${q}`, $options: 'i' }
    }).limit(8).select('testName category unit price action');

    res.json({ success: true, data: results });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

// 3. Delete Test
exports.deleteTest = async (req, res) => {
  try {
    const { slug, id } = req.params;
    const Inv = getInvModel(slug);
    await Inv.findByIdAndDelete(id);
    res.json({ success: true, message: "Test Removed" });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
};

exports.list= async (req, res) => {
    try {
        const { slug } = req.params;
        const { category } = req.query;
        // Hamne dynamic model logic use kiya hai
        const Inv = getInvModel(slug); 
        const filter = { clinicSlug: slug };
        if (category && category !== 'All') filter.category = category;


        const data = await Inv.find(filter).sort({ testName: 1 });
        res.status(200).json({ success: true, data });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
}

exports.favorite=async (req, res) => {

    try {

        const { slug, id } = req.params;

        const Inv = getInvModel(slug);

        const test = await Inv.findById(id);

        test.isFavorite = !test.isFavorite;

        await test.save();

        res.json({ success: true, isFavorite: test.isFavorite });

    } catch (err) {

        res.status(500).json({ success: false, error: err.message });

    }

};
