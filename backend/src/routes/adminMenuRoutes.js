const express = require('express');
const router = express.Router();
const adminMenuController = require('../controllers/adminMenuController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Middleware global para todas as rotas deste arquivo: Autenticação + Role 'sudo'
router.use(authenticateToken, authorizeRoles('sudo'));

// === SECTIONS ROUTES ===
router.get('/sections', adminMenuController.listSections);
router.post('/sections', adminMenuController.createSection);
router.put('/sections/:id', adminMenuController.updateSection);
router.delete('/sections/:id', adminMenuController.deleteSection);

// === ITEMS ROUTES ===
// List items (optionally ?sectionId=...)
router.get('/items', adminMenuController.listItems);
router.post('/items', adminMenuController.createItem);
router.put('/items/:id', adminMenuController.updateItem);
router.delete('/items/:id', adminMenuController.deleteItem);

module.exports = router;
