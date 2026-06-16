const express = require('express');
const router = express.Router();
const uploadPrescriptionPdf = require('../config/upload');
const {
    getPatientsByClinic,
    addPatient,
    updatePatient,
    deletePatient,
    getPatientProfile,
    uploadPrescriptionPdf: uploadPrescriptionPdfHandler,
    deletePrescriptionPdf
} = require('../controllers/patientController');

// Routes structure: /api/patients/himanshu-clinic/list
router.get('/:slug/list', getPatientsByClinic);
router.post('/:slug/add', addPatient);
router.get('/:slug/profile/:id', getPatientProfile);
router.put('/:slug/update/:id', updatePatient);
router.delete('/:slug/delete/:id', deletePatient);

// Prescription History (old prescription PDFs upload)
router.post('/:slug/profile/:id/prescription-upload', uploadPrescriptionPdf.single('pdf'), uploadPrescriptionPdfHandler);
router.delete('/:slug/profile/:id/prescription-history/:entryId', deletePrescriptionPdf);

module.exports = router;