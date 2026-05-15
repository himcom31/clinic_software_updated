// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { getSettings, saveSettings } = require('../controllers/notificationController');
const { sendPrescriptionEmail } = require('../controllers/emailController');


router.get('/:clinicSlug', getSettings);
router.post('/:clinicSlug', saveSettings);
router.post('/send-email/:slug', sendPrescriptionEmail);  // ← ADD THIS


module.exports = router;