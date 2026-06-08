const express = require('express');
const router = express.Router();
const alunoController = require('../controllers/alunoController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Todas as rotas de alunos exigem autenticação e cargos autorizados (teacher, admin, sudo)
router.use(authenticateToken, authorizeRoles('teacher', 'admin', 'sudo'));

router.get('/', alunoController.getAllAlunos);
router.get('/situacoes', alunoController.getSituacoes);
router.put('/:id', alunoController.updateAluno);
router.post('/:alunoId/observacoes', alunoController.addObservacao);
router.delete('/observacoes/:id', alunoController.deleteObservacao);

module.exports = router;
