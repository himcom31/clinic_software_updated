// routes/whatsappRoutes.js
const express = require('express');
const router = express.Router();
const { sendWhatsAppPrescription } = require('../controllers/whatsappController');

router.post('/send-prescription/:slug', sendWhatsAppPrescription);

module.exports = router;