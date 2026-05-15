const express = require('express');
const router = express.Router();

const { getInitialData,saveFinalPrescription,downloadPrescription,searchTableRows,
    saveTableRow,
    getRowsByPatient, } = require('../controllers/prescriptionController');

// Routes
router.get('/initial-data', getInitialData);
router.post('/save', saveFinalPrescription);
router.get('/prescriptions/:id/download',downloadPrescription);


router.get('/:collectionName/search', searchTableRows);
 
// Save a new row to a collection
// POST /api/clinic/table/:collectionName/rows
router.post('/:collectionName/rows', saveTableRow);
 
// Get all rows for a patient (used for revisit restore)
// GET /api/clinic/table/:collectionName/by-patient/:patientId
router.get('/:collectionName/by-patient/:patientId', getRowsByPatient);

module.exports = router; // ✅ Ye line honi hi chahiye!