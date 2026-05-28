// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const { getSettings, saveSettings } = require('../controllers/notificationController');
const { sendPrescriptionEmail , sendPrescriptionEmailInvoice} = require('../controllers/emailController');


router.get('/:clinicSlug', getSettings);
router.post('/:clinicSlug', saveSettings);
router.post('/send-email/:slug', sendPrescriptionEmail);  // ← ADD THIS
router.post('/send-email-invoice/:slug', sendPrescriptionEmailInvoice);  // ← ADD THIS


module.exports = router;