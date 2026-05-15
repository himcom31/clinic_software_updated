const mongoose = require('mongoose');
const vaccinationSchema = require('../models/Vaccination');

// ── Helper: Get Dynamic Model ──
const getVacModel = (slug) => {
    const collectionName = `${slug}_vaccinations`; // e.g., himanshu-clinic_vaccinations
    if (mongoose.models[collectionName]) {
        return mongoose.model(collectionName);
    }
    return mongoose.model(collectionName, vaccinationSchema, collectionName);
};

// 1. Add Vaccination Record
exports.addVaccination = async (req, res) => {
    try {
        const { slug } = req.params;
        const { vaccineName, note, action } = req.body;

        const VacModel = getVacModel(slug); // 🔥 Dynamic collection select

        const newVac = new VacModel({
            vaccineName,
            note,
            action,
            clinicSlug: slug
        });

        await newVac.save();
        res.status(201).json({ 
            success: true, 
            message: `Saved in ${slug}_vaccinations collection` 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 2. Get Patient Vaccination History
exports.getHistory = async (req, res) => {
    try {
        const { slug } = req.params;
        const VacModel = getVacModel(slug);

        const history = await VacModel.find().sort({ date: -1 });
        res.json({ success: true, data: history });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.searchVaccination = async (req, res) => {
  try {
    const { slug } = req.params;
    const { query } = req.query;
    const Vaccination = getVacModel(slug);


    // Regex search: Case insensitive aur "start with" logic
    const results = await Vaccination.find({
      clinicSlug: slug,
      vaccineName: { $regex: `^${query}`, $options: 'i' }
    }).limit(10).lean();


    res.status(200).json({ success: true, data: results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};


exports.master = async (req, res) => {

  const { slug } = req.params;

  const { category, search } = req.query;  // ✅ add search

      const Vaccination = getVacModel(slug);
  

  const filter = { clinicSlug: slug };

  if (category) filter.category = category;

  

  // ✅ add search filter

  if (search) {

    filter.$or = [

      { vaccineName: { $regex: search, $options: 'i' } },

      { note: { $regex: search, $options: 'i' } }

    ];

  }



  const data = await Vaccination.find(filter).limit(10).sort({ vaccineName: 1 });

  res.json({ success: true, data });

};

