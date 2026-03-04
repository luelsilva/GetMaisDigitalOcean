const express = require('express');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Proteger todas as rotas (precisa estar logado)
router.use(authenticateToken);

// Listagem pública para usuários logados
router.get('/', courseController.getAllCourses);

// Operações administrativas (apenas sudo ou admin)
router.use(authorizeRoles('sudo', 'admin'));

router.get('/:id', courseController.getCourseById);
router.post('/', courseController.createCourse);
router.put('/:id', courseController.updateCourse);
router.delete('/:id', courseController.deleteCourse);

module.exports = router;
