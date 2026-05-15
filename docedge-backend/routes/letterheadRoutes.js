const express = require('express');
const router = express.Router();
const { saveLetterheadDesign, getLetterheadDesign } = require('../controllers/Letterhead');

// Routes
router.post('/:slug/save', saveLetterheadDesign);
router.get('/:slug/fetch', getLetterheadDesign);

module.exports = router;