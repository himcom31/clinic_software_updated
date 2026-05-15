const mongoose = require('mongoose');
const adviceSchema = require('../models/adviceSchema');

const getAdviceModel = (slug) => {
  const collectionName = `${slug}_advices`;
  return mongoose.models[collectionName] || mongoose.model(collectionName, adviceSchema, collectionName);
};

// 1. SAVE or UPDATE Advice
exports.saveAdvice = async (req, res) => {
  try {
    const { slug } = req.params;
    const { id, ...updateData } = req.body;
    const Advice = getAdviceModel(slug);

    if (id) {
      const updated = await Advice.findByIdAndUpdate(id, updateData, { returnDocument: 'after' });
      return res.status(200).json({ success: true, data: updated });
    }

    const newAdvice = await Advice.create({ ...updateData, clinicSlug: slug });
    res.status(201).json({ success: true, data: newAdvice });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 2. GET ALL ADVICES (With Search)
exports.getAdvices = async (req, res) => {
  try {
    const { slug } = req.params;
    const { q } = req.query;
    const Advice = getAdviceModel(slug);

    let query = { clinicSlug: slug };
    if (q) {
      query.title = { $regex: q, $options: 'i' };
    }

    // Favorites upar dikhenge
    const data = await Advice.find(query).sort({ isFavorite: -1, title: 1 });
    res.status(200).json({ success: true, data });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};

// 3. DELETE ADVICE
exports.deleteAdvice = async (req, res) => {
  try {
    const { slug, id } = req.params;
    const Advice = getAdviceModel(slug);
    await Advice.findByIdAndDelete(id);
    res.status(200).json({ success: true, message: "Advice removed" });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};