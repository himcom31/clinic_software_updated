const mongoose = require('mongoose');
//const PatientSchema = require('../models/PatientSchema');
const Patient = require('../models/PatientSchema');
const cloudinary = require('../config/cloudinary');
const streamifier = require('streamifier'); // npm install streamifier

// Utility: Dynamic Model Helper
const getPatientModel = (slug) => {
    const collectionName = `${slug}_patients`;
    // Agar model pehle se compile hai toh wahi use karo, warna naya banao
    return mongoose.models[collectionName] || 
           mongoose.model(collectionName, PatientSchema, collectionName);
};

//1. Get All Patients (Search, Filter, Sort)
// exports.getPatients = async (req, res) => {
    // try {
        // const { slug } = req.params; // URL se slug aayega
        // const { search, gender, sortBy = 'createdAt', order = 'desc' } = req.query;
// 
        // const PatientModel = getPatientModel(slug);
        // let query = {};
// 
        // if (search) {
            // query.$or = [
                // { name: { $regex: search, $options: 'i' } },
                // { mobile: { $regex: search, $options: 'i' } }
            // ];
        // }
// 
        // if (gender) query.gender = gender;
// 
        // const sortOptions = { [sortBy]: order === 'desc' ? -1 : 1 };
        // const patients = await PatientModel.find(query).sort(sortOptions).limit(100);
// 
        // res.status(200).json({ success: true, data: patients });
    // } catch (error) {
        // res.status(500).json({ success: false, message: error.message });
    // }
// };
// 
//2. Add New Patient
// exports.addPatient = async (req, res) => {
    // try {
        // const { slug } = req.params;
        // const PatientModel = getPatientModel(slug);
// 
   //     Mobile check within the same clinic
        // const existing = await PatientModel.findOne({ mobile: req.body.mobile });
        // if (existing) {
            // return res.status(400).json({ message: "Ye patient pehle se registered hai." });
        // }
// 
        // const newPatient = await PatientModel.create(req.body);
        // res.status(201).json({ success: true, data: newPatient });
    // } catch (error) {
        // res.status(500).json({ success: false, message: error.message });
    // }
// };
// 
// 
// 
// 
// 
//3. Get Full Patient Profile
// exports.getPatientProfile = async (req, res) => {
    // try {
        // const { slug, id } = req.params;
        // const PatientModel = getPatientModel(slug);
// 
      //  .lean() use karne se query fast ho jati hai agar sirf data read karna ho
        // const patient = await PatientModel.findById(id)
            // .populate({
                // path: 'prescriptions',
         //       Agar Prescription collection bhi dynamic hai toh uska naam yahan dena hoga
            //    model: `${slug}_prescriptions`, 
                // options: { sort: { createdAt: -1 } }
            // })
            // .populate({
                // path: 'billing',
            //    model: `${slug}_billing`,
                // options: { sort: { createdAt: -1 } }
            // })
            // .lean(); 
// 
        // if (!patient) {
            // return res.status(404).json({ 
                // success: false, 
                // message: "Patient record nahi mila." 
            // });
        // }
// 
        // res.status(200).json({ 
            // success: true, 
            // data: patient 
        // });
// 
    // } catch (error) {
        // console.error("Profile Fetch Error:", error);
        // res.status(500).json({ 
            // success: false, 
            // message: "Internal Server Error" 
        // });
    // }
// };


// 1. Get Patients for a Specific Clinic
exports.getPatientsByClinic = async (req, res) => {
    try {
        const { slug } = req.params; // URL se clinic ka slug aayega
        const { search, gender } = req.query;

        // Base query: Hamesha usi clinic ka data dikhao
        let query = { clinicSlug: slug };

        // Agar search keyword hai (Name ya Mobile)
        if (search) {
            query.$and = [
                { clinicSlug: slug },
                {
                    $or: [
                        { name: { $regex: search, $options: 'i' } },
                        { mobile: { $regex: search, $options: 'i' } }
                    ]
                }
            ];
        }

        if (gender) query.gender = gender;

        const patients = await Patient.find(query).sort({ createdAt: -1 });
        res.status(200).json({ success: true, data: patients });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 2. Add Patient to a Specific Clinic
exports.addPatient = async (req, res) => {
    try {
        const { slug } = req.params;
        const patientData = { ...req.body, clinicSlug: slug };

        const newPatient = await Patient.create(patientData);
        res.status(201).json({ success: true, data: newPatient });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ success: false, message: "Bhai, ye mobile number is clinic mein pehle se hai." });
        }
        res.status(500).json({ success: false, message: error.message });
    }
};


exports.updatePatient = async (req, res) => {
    try {
        const { slug, id } = req.params;
        const updates = req.body;

        // Security check: _id aur clinicSlug dono match hone chahiye
        const updatedPatient = await Patient.findOneAndUpdate(
            { _id: id, clinicSlug: slug },
            { $set: updates },
            { new: true, runValidators: true }
        );

        if (!updatedPatient) {
            return res.status(404).json({ success: false, message: "Patient nahi mila ya edit access nahi hai." });
        }

        res.status(200).json({ success: true, message: "Record updated!", data: updatedPatient });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 4. DELETE PATIENT
exports.deletePatient = async (req, res) => {
    try {
        const { slug, id } = req.params;

        const deletedPatient = await Patient.findOneAndDelete({ _id: id, clinicSlug: slug });

        if (!deletedPatient) {
            return res.status(404).json({ success: false, message: "Record nahi mila ya delete access nahi hai." });
        }

        res.status(200).json({ success: true, message: "Patient record permanently deleted." });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// 5. GET SINGLE PROFILE (With History)
exports.getPatientProfile = async (req, res) => {
    try {
        const { slug, id } = req.params;
        
        const patient = await Patient.findOne({ _id: id, clinicSlug: slug })
            .populate('prescriptions') // Linked prescriptions fetch karne ke liye
            .lean();

        if (!patient) return res.status(404).json({ success: false, message: "Profile nahi mili." });

        res.status(200).json({ success: true, data: patient });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

const uploadBufferToCloudinary = (buffer, slug) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                resource_type: 'auto', // PDF ke liye 'auto' ya 'raw' theek hai
                folder: `prescriptions/${slug}`, // Cloudinary mein folder organize ho jayega
                format: 'pdf'
            },
            (error, result) => {
                if (error) return reject(error);
                resolve(result);
            }
        );
        streamifier.createReadStream(buffer).pipe(stream);
    });
};
 
// ─────────────────────────────────────────────────────────
// 6. UPLOAD OLD PRESCRIPTION PDF (Cloudinary)
// ─────────────────────────────────────────────────────────
exports.uploadPrescriptionPdf = async (req, res) => {
    try {
        const { slug, id } = req.params;
        const { title, date } = req.body;
 
        if (!req.file) {
            return res.status(400).json({ success: false, message: "PDF file bhejna zaroori hai." });
        }
 
        // Cloudinary par upload
        const result = await uploadBufferToCloudinary(req.file.buffer, slug);
 
        const updatedPatient = await Patient.findOneAndUpdate(
            { _id: id, clinicSlug: slug },
            {
                $push: {
                    prescriptionHistory: {
                        title: title || 'Old Prescription',
                        date: date ? new Date(date) : new Date(),
                        pdfUrl: result.secure_url,   // Cloudinary ka public HTTPS URL
                        publicId: result.public_id,  // delete karne ke liye zaroori
                        fileName: req.file.originalname,
                        uploadedAt: new Date()
                    }
                }
            },
            { new: true, runValidators: true }
        );
 
        if (!updatedPatient) {
            return res.status(404).json({ success: false, message: "Patient nahi mila." });
        }
 
        res.status(200).json({
            success: true,
            message: "Prescription PDF upload ho gaya.",
            data: updatedPatient.prescriptionHistory
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
 
// ─────────────────────────────────────────────────────────
// 7. DELETE A PRESCRIPTION HISTORY ENTRY (Cloudinary se bhi hatao)
// ─────────────────────────────────────────────────────────
exports.deletePrescriptionPdf = async (req, res) => {
    try {
        const { slug, id, entryId } = req.params;
 
        const patient = await Patient.findOne({ _id: id, clinicSlug: slug });
        if (!patient) {
            return res.status(404).json({ success: false, message: "Patient nahi mila." });
        }
 
        const entry = patient.prescriptionHistory.find(e => e._id.toString() === entryId);
        if (entry && entry.publicId) {
            // Cloudinary se bhi delete karo (resource_type: raw kyunki PDF non-image hai)
            await cloudinary.uploader.destroy(entry.publicId, { resource_type: 'raw' }).catch(() => {
                // agar 'raw' fail ho to 'image'/'auto' try karna pad sakta hai depending on upload settings
            });
        }
 
        const updatedPatient = await Patient.findOneAndUpdate(
            { _id: id, clinicSlug: slug },
            { $pull: { prescriptionHistory: { _id: entryId } } },
            { new: true }
        );
 
        res.status(200).json({
            success: true,
            message: "Prescription PDF hata diya gaya.",
            data: updatedPatient.prescriptionHistory
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};