const mongoose = require('mongoose');
const reportSchema = require('../models/Report');

const getReportModel = (slug) => {
    const collectionName = `${slug}_reports`;
    
    // Check if model already compiled
    if (mongoose.models[collectionName]) {
        return mongoose.model(collectionName);
    }
    
    // Naya collection create/select karein
    return mongoose.model(collectionName, reportSchema, collectionName);
};


exports.addReport = async (req, res) => {
    try {
        const { slug } = req.params;
        const { patientId, reportName, date, impression, action, appointmentId } = req.body;

        const ReportModel = getReportModel(slug); // 🔥 Dynamic collection logic

        const newReport = new ReportModel({
            patientId,
            appointmentId,
            reportName,
            date,
            impression,
            action
        });

        await newReport.save();
        res.status(201).json({ 
            success: true, 
            message: `Report saved in ${slug}_reports collection` 
        });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

// 2. Get All Reports for a Patient
exports.getPatientReports = async (req, res) => {
    try {
        const { slug, patientId } = req.params;
        const ReportModel = getReportModel(slug);

        const reports = await ReportModel.find({ patientId }).sort({ date: -1 });
        res.json({ success: true, data: reports });
    } catch (err) {
        res.status(500).json({ success: false, message: err.message });
    }
};

exports.master = async (req, res) => {
  try {
    const { slug } = req.params;
    const { category, search } = req.query; 
    
    // 🔥 1. Dynamic Model fetch karo
    const ReportModel = getReportModel(slug);
    
    // 🔥 2. Filter se clinicSlug hata diya (Kyunki collection hi alag hai)
    const filter = {}; 
    
    if (category) filter.category = category;
    
    // ✅ 3. Search filter update (Date par regex nahi chalta, isliye reportName aur impression pe rakha hai)
    if (search) {
      filter.$or = [
        { reportName: { $regex: search, $options: 'i' } },
        { impression: { $regex: search, $options: 'i' } }, // Impression mein bhi search karo
        { action: { $regex: search, $options: 'i' } }      // Action mein bhi search karo
      ];
    }

    // ✅ 4. Sort field fix (reportName ya date use karein)
    // .limit(10) dashboard performance ke liye sahi hai
    const data = await ReportModel.find(filter)
      .limit(10)
      .sort({ date: -1 }); // Nayi reports sabse upar dikhao

    res.json({ success: true, data });

  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};