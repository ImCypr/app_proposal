const express = require('express');
const { createPriceResearch } = require('../controllers/aiSearchController');

const router = express.Router();

// POST /api/ai-search
router.post('/', createPriceResearch);

module.exports = router;
