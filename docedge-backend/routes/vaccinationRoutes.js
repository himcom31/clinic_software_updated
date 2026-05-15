const express = require('express');
const router = express.Router();
const vacController = require('../controllers/vaccinationController');

// URL Structure: /api/vaccination/:slug/...

// Naya record add karne ke liye
router.post('/:slug/add', vacController.addVaccination);

// Patient ki history nikalne ke liye
router.get('/:slug/history', vacController.getHistory);

router.get('/:slug/search', vacController.searchVaccination); // AJAX Search

router.get('/:slug/list', vacController.master);

module.exports = router;