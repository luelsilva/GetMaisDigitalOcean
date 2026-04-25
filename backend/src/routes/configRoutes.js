const express = require('express');
const router = express.Router();
const configController = require('../controllers/configController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Rota para ler flags
router.get('/features', authenticateToken, configController.getFeatureFlags);

// Rota para atualizar flags - Somente ADMIN ou SUDO
router.put('/features', authenticateToken, authorizeRoles('admin', 'sudo'), configController.updateFeatureFlags);

module.exports = router;
