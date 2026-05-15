const express = require('express');
const router = express.Router();
const adviceController = require('../controllers/adviceController');
const dasboard=require('../controllers/dashboardController')

// Save (Add/Edit)
router.post('/:slug/save', adviceController.saveAdvice);

// List/Search
router.get('/:slug/list', adviceController.getAdvices);

// Delete
router.delete('/:slug/delete/:id', adviceController.deleteAdvice);

router.get('/dashboard/:clinicSlug',dasboard.getClinicDashboard)

module.exports = router;