const express = require('express');
const router = express.Router();
const keepAliveController = require('../controllers/keepAliveController');

// Rota pública para o cron-job bater
router.get('/ping', keepAliveController.ping);

// Rota para limpar a tabela
router.delete('/clear', keepAliveController.clear);

module.exports = router;
