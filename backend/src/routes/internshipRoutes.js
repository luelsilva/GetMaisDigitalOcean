const express = require('express');
const router = express.Router();
const internshipController = require('../controllers/internshipController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Todas as rotas de estágios exigem autenticação e cargos autorizados
router.use(authenticateToken, authorizeRoles('company', 'teacher', 'admin', 'sudo'));

router.get('/', internshipController.getAllInternships);
router.get('/:id', internshipController.getInternshipById);
router.get('/:id/history', internshipController.getInternshipHistory);
router.post('/', internshipController.createInternship);
router.put('/:id', internshipController.updateInternship);
router.delete('/:id', internshipController.deleteInternship);
router.post('/:id/notificar-professor', internshipController.notifyTeacherConference);
router.post('/:id/notificar-aprovacao', internshipController.notifyCompanyApproval);
router.post('/:id/notificar-reprovacao', internshipController.notifyCompanyRejection);

// Rotas de Ocorrências
router.get('/:id/occurrences', internshipController.getInternshipOccurrences);
router.put('/:id/occurrences/:occurrenceId/resolve', authorizeRoles('teacher', 'admin', 'sudo'), internshipController.resolveInternshipOccurrence);

// Cópia de TCE (apenas teacher, admin, sudo)
router.post('/:id/copy', authorizeRoles('teacher', 'admin', 'sudo'), internshipController.copyInternship);

module.exports = router;
