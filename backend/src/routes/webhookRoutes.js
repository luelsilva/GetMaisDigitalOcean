const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookController');

// Rota POST para receber webhooks do Resend
// O Resend envia as requisições para cá sempre que o status de um e-mail muda
router.post('/resend', webhookController.handleResendWebhook);

module.exports = router;
