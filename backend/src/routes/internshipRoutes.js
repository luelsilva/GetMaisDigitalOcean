const express = require('express');
const router = express.Router();
const internshipController = require('../controllers/internshipController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Todas as rotas de estágios exigem autenticação e cargos autorizados
router.use(authenticateToken, authorizeRoles('company', 'teacher', 'admin', 'sudo'));

router.get('/', internshipController.getAllInternships);
router.get('/:id', internshipController.getInternshipById);
router.post('/', internshipController.createInternship);
router.put('/:id', internshipController.updateInternship);
router.delete('/:id', internshipController.deleteInternship);
router.post('/:id/notificar-professor', internshipController.notifyTeacherConference);



module.exports = router;
