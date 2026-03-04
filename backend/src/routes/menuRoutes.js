const express = require('express');
const router = express.Router();
const menuController = require('../controllers/menuController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Proteger todas as rotas deste arquivo: Necessário cargo relacionado a Estágio
router.use(authenticateToken, authorizeRoles('teacher', 'admin', 'sudo'));

// Rota para buscar as seções do menu (estagio_menu)
// Query param: ?filter=all|active|inactive
router.get('/', menuController.getSideMenu);

// Rota para buscar o menu simplificado completo (Seções + Itens)
router.get('/full', menuController.getFullMenu);

// Rota para checar versão do menu (Caching)
router.get('/version', menuController.getMenuVersion);

// Rota para buscar os itens de uma seção específica (estagio_menu_itens)
// Query param: ?filter=all|active|inactive
router.get('/:code/itens', menuController.getSideMenuItens);

module.exports = router;
