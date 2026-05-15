const express = require('express');
const router = express.Router();
const investigationController = require('../controllers/investigationController');

// 1. GET ALL TESTS - Master List (Clinic-wise)
// URL: http://localhost:5000/api/investigations/:slug/list
router.get('/:slug/list', investigationController.list);

// 2. SAVE TEST - Add ya Update dono handle karega
// URL: http://localhost:5000/api/investigations/:slug/save
router.post('/:slug/save', investigationController.saveTest);

// 3. AJAX SEARCH - Prescription autocomplete ke liye
// URL: http://localhost:5000/api/investigations/:slug/search?q=CBC
router.get('/:slug/search', investigationController.searchTests);

// 4. TOGGLE FAVORITE - Quick access ke liye
router.patch('/:slug/favorite/:id', investigationController.favorite);

// 5. DELETE TEST
// URL: http://localhost:5000/api/investigations/:slug/delete/:id
router.delete('/:slug/delete/:id', investigationController.deleteTest);

module.exports = router;