const mongoose = require('mongoose');
const medicineSchema = require('../models/Medicine');

// Helper to get Dynamic Model
const getMedicineModel = (slug) => {
  const collectionName = `${slug}_medicines`;
  return mongoose.models[collectionName] || mongoose.model(collectionName, medicineSchema, collectionName);
};

// 1. Add Medicine
exports.addMedicine = async (req, res) => {
  try {
    const { slug } = req.params;
    const Medicine = getMedicineModel(slug);
    const newMed = await Medicine.create({ ...req.body, clinicSlug: slug });
    res.status(201).json({ success: true, data: newMed });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// 2. AJAX Search Data (Prescription Autocomplete ke liye)
exports.searchMedicines = async (req, res) => {
  try {
    const { slug } = req.params;
    const { query } = req.query;
    const Medicine = getMedicineModel(slug);

    // Regex search: Case insensitive aur "start with" logic
    const results = await Medicine.find({
      clinicSlug: slug,
      name: { $regex: `^${query}`, $options: 'i' }
    }).limit(10).lean();

    res.status(200).json({ success: true, data: results });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// 3. Toggle Favorite
exports.toggleFavorite = async (req, res) => {
  try {
    const { slug, id } = req.params;
    const Medicine = getMedicineModel(slug);
    const med = await Medicine.findById(id);
    med.isFavorite = !med.isFavorite;
    await med.save();
    res.status(200).json({ success: true, isFavorite: med.isFavorite });
  } catch (err) { res.status(500).json({ success: false, message: err.message }); }
};

// 4. Import Medicines (Bulk Upload)
exports.importMedicines = async (req, res) => {
  try {
    const { slug } = req.params;
    const Medicine = getMedicineModel(slug);
    const medicinesArray = req.body;

    // Excel data mein clinicSlug add karna aur formatting sahi karna
    const finalData = medicinesArray.map(m => ({
      name: m.name,
      brandName: m.brandName || "",
      category: m.category || "Tablet",
      saltComposition: m.saltComposition || "",
      strength: m.strength || "",
      instructions: m.instructions || "",
      route: m.route || "",
      action: m.action || "",
      timing: m.timing || "",
      duration: m.duration || "",
      unit_per_Dose: m.unit_per_Dose || "",
      isFavorite: false, // Default false
      clinicSlug: slug   // Yeh sabse zaroori hai
    }));

    const result = await Medicine.insertMany(finalData);
    
    res.status(200).json({ 
      success: true, 
      message: `${result.length} medicines imported successfully`,
      count: result.length 
    });
  } catch (err) {
    console.error("DETAILED_BACKEND_ERROR:", err); // Terminal mein check karein
    res.status(500).json({ 
      success: false, 
      message: "Database validation fail ho gayi!",
      error: err.message 
    });
  }
};

exports.master = async (req, res) => {
  const { slug } = req.params;
  const { category, search } = req.query;  // ✅ add search
  const Medicine = getMedicineModel(slug);
  
  const filter = { clinicSlug: slug };
  if (category) filter.category = category;
  
  // ✅ add search filter
  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: 'i' } },
      { brandName: { $regex: search, $options: 'i' } }
    ];
  }

  const page = parseInt(req.query.page) || 20;
const limit = parseInt(req.query.limit) || 5000;
const skip = (page - 1) * limit;

const total = await Medicine.countDocuments(filter);
const data = await Medicine.find(filter).sort({ name: 1 }).skip(skip).limit(limit);
  res.json({ success: true, data });
};

// DELETE Medicine
exports.deleteMedicine = async (req, res) => {
  try {
    const { slug, id } = req.params; // URL se clinic slug aur medicine ki ID li
    const Medicine = getMedicineModel(slug); // Dynamic model fetch kiya

    const deletedMed = await Medicine.findByIdAndDelete(id);

    if (!deletedMed) {
      return res.status(404).json({ 
        success: false, 
        message: "Medicine not found!" 
      });
    }

    res.status(200).json({ 
      success: true, 
      message: "Medicine deleted.",
      id: id 
    });
  } catch (err) {
    console.error("DELETE_ERROR:", err);
    res.status(500).json({ 
      success: false, 
      message: "Delete error!",
      error: err.message 
    });
  }
};

// UPDATE Medicine
exports.updateMedicine = async (req, res) => {
  try {
    const { slug, id } = req.params;
    const Medicine = getMedicineModel(slug);

    const updatedMed = await Medicine.findByIdAndUpdate(
      id,
      { $set: req.body }, // Jo fields aaye hain sirf unhe update karega
      { returnDocument: 'after', runValidators: true } 
    );

    if (!updatedMed) {
      return res.status(404).json({ success: false, message: "Medicine nahi mili!" });
    }

    res.status(200).json({ success: true, data: updatedMed });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
};