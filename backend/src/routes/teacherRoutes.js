const express = require('express');
const router = express.Router();
const teacherController = require('../controllers/teacherController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Proteger todas as rotas (mínimo logado)
router.use(authenticateToken);

// Listagem pública para usuários autenticados
router.get('/', teacherController.getAllTeachers);

// Operações restritas (sudo/admin)
router.use(authorizeRoles('sudo', 'admin'));

router.get('/:id', teacherController.getTeacherById);
router.post('/', teacherController.createTeacher);
router.put('/:id', teacherController.updateTeacher);
router.delete('/:id', teacherController.deleteTeacher);

module.exports = router;
