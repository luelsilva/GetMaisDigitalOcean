const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Aplicar autenticação e roles para todas as rotas de documentos
router.use(authenticateToken, authorizeRoles('company', 'teacher', 'admin', 'sudo'));

// Única rota de geração de documentos ativa atualmente
router.post('/gerar-docx', documentController.generateDocx);

module.exports = router;
