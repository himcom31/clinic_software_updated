const express = require('express');
const router = express.Router();
const billingController = require('../controllers/billingController');

// Save and Generate Invoice
// POST: /api/billings/:slug/create
router.post('/:slug/create', billingController.createInvoice);

// Get History for a specific patient
// GET: /api/billings/:slug/history/:patientId
router.get('/:slug/history/:patientId', billingController.getBillingHistory);

// Get specific invoice details
// GET: /api/billings/:slug/invoice/:invoiceId
router.get('/:slug/invoice/:invoiceId', billingController.getInvoiceById);

router.get('/:slug/all', billingController.getAllBillings);
router.put('/:slug/update/:invoiceId',billingController.update)


module.exports = router;