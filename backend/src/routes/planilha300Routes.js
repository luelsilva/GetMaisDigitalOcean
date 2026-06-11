const express = require('express');
const router = express.Router();
const planilha300Controller = require('../controllers/planilha300Controller');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Todas as rotas exigem autenticação e papel admin ou sudo
router.use(authenticateToken, authorizeRoles('admin', 'sudo'));

// GET  /api/planilhas300            → lista os CSVs existentes (agrupados por curso)
router.get('/', planilha300Controller.listPlanilhas);

// POST /api/planilhas300/sync       → ETAPA 1: baixa planilhas (somente se current não existir)
router.post('/sync', planilha300Controller.syncPlanilhas);

// POST /api/planilhas300/comparar   → ETAPA 2: compara current x previous (deleta current se iguais)
router.post('/comparar', planilha300Controller.compararPlanilhas);

// POST /api/planilhas300/processar  → ETAPA 3: processa current e promove para previous (TODO)
router.post('/processar', planilha300Controller.processarPlanilhas);

module.exports = router;
