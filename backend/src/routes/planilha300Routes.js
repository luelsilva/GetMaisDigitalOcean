const express = require('express');
const router = express.Router();
const planilha300Controller = require('../controllers/planilha300Controller');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Todas as rotas exigem autenticação e papel admin ou sudo
router.use(authenticateToken, authorizeRoles('admin', 'sudo'));

// GET  /api/planilhas300         → lista os CSVs já baixados
router.get('/', planilha300Controller.listPlanilhas);

// POST /api/planilhas300/sync    → baixa/atualiza os CSVs de todos os cursos
router.post('/sync', planilha300Controller.syncPlanilhas);

module.exports = router;
