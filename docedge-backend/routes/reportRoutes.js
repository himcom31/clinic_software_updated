const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const excelExport = require('../exports/excelExport');

// 📊 Main Analytics API
router.get('/:slug/all-stats', reportController.getComprehensiveReport);

// 📥 Excel Download
router.get('/:slug/download-excel', excelExport.exportToExcel);

module.exports = router;