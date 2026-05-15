const express = require('express');
const router = express.Router();
const symptomController = require('../controllers/symptomController');

// Sabhi routes mein '/api/clinic/:slug/symptoms' base path use hoga

// 1. Saare symptoms fetch karne ke liye (Dashboard suggestions ke liye)
router.get('/:slug', symptomController.getClinicSymptoms);

// 2. Naya symptom add karne ya usage count badhane ke liye
// Jab doctor naya symptom select/type karke save karega
router.post('/:slug/add', symptomController.addSymptom);

// 3. Auto-complete search ke liye (Jab doctor type karega dropdown dikhane ke liye)
// Query example: /api/clinic/himanshu-clinic/symptoms/search?q=fev
router.get('/:slug/search', symptomController.searchSymptoms);

module.exports = router;