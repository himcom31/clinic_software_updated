const express = require('express');
const router = express.Router();
const reportController = require('../controllers/p_reportController');

// Base Path: /api/reports

// POST: Add report for a specific clinic
router.post('/:slug/add', reportController.addReport);

// GET: Fetch reports for a specific patient in a clinic
router.get('/:slug/history/:patientId', reportController.getPatientReports);


router.get('/:slug/list', reportController.master);

module.exports = router;