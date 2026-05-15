const express = require('express');
const router = express.Router();
const { raiseTicket, getMyTickets } = require('../controllers/supportController');
const { protectD } = require('../middleware/authMiddleware');

// 1. Ticket Raise karne ke liye: POST /api/support/:slug/raise-ticket
router.post('/:slug/raise-ticket', protectD, raiseTicket);

// 2. Doctor ke apne tickets dekhne ke liye: GET /api/support/:slug/my-tickets
router.get('/:slug/my-tickets', protectD, getMyTickets);

module.exports = router;