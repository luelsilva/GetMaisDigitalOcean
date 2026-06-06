const express = require('express');
const router = express.Router();
const keepAliveController = require('../controllers/keepAliveController');

// Rota para verificar ocorrências
router.get('/check-occurrences', keepAliveController.checkOccurrences);
router.post('/check-occurrences', keepAliveController.checkOccurrences);

module.exports = router;
