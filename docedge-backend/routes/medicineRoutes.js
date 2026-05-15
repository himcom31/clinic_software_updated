const express = require('express');
const router = express.Router();
const medicineController = require('../controllers/medicineController');


router.post('/:slug/add', medicineController.addMedicine);
router.get('/:slug/search', medicineController.searchMedicines); // AJAX Search
router.patch('/:slug/favorite/:id', medicineController.toggleFavorite);
router.post('/:slug/import', medicineController.importMedicines);

// Master List (with category filter)
router.get('/:slug/list', medicineController.master);
router.delete('/:slug/delete/:id', medicineController.deleteMedicine);
router.patch('/:slug/update/:id', medicineController.updateMedicine);
module.exports = router;