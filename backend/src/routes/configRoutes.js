const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Rota para ler flags
router.get('/features', authenticateToken, configController.getFeatureFlags);

// Rota para atualizar flags - Somente ADMIN ou SUDO
router.put('/features', authenticateToken, authorizeRoles('admin', 'sudo'), configController.updateFeatureFlags);

// Rotas de configuração de regras de ocorrência
router.get('/occurrence-rules', authenticateToken, authorizeRoles('teacher', 'admin', 'sudo'), configController.getOccurrenceRules);
router.put('/occurrence-rules/:key', authenticateToken, authorizeRoles('teacher', 'admin', 'sudo'), configController.updateOccurrenceRule);
router.post('/check-occurrences', authenticateToken, authorizeRoles('teacher', 'admin', 'sudo'), configController.triggerOccurrenceCheck);

module.exports = router;
