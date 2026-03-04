const express = require('express');
const router = express.Router();
const dbController = require('../controllers/dbController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Somente SUDO pode acessar informações do banco
router.get('/stats', authenticateToken, authorizeRoles('sudo'), dbController.getStats);

module.exports = router;
