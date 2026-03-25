const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Aplicar autenticação e roles para todas as rotas de documentos
router.use(authenticateToken, authorizeRoles('company', 'teacher', 'admin', 'sudo'));

// Rotas de geração de documentos ativas
router.post('/gerar-docx', documentController.generateDocx);
router.post('/gerar-pdf', documentController.generatePdf);

module.exports = router;
