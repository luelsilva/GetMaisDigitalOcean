const express = require('express');
const router = express.Router();
const formController = require('../controllers/formController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

// Todas as rotas de formulários exigem que o usuário esteja logado
router.use(authenticateToken);

// Rota para o formulário renderizar (qualquer usuário logado pode ver um modelo específico)
router.get('/:modelId', formController.getFormByModelId);

// Rotas Administrativas (CRUD) - Somente sudo podem acessar
router.get('/', authorizeRoles('sudo'), formController.listForms);
router.post('/', authorizeRoles('sudo'), formController.createForm);
router.put('/:id', authorizeRoles('sudo'), formController.updateForm);
router.delete('/:id', authorizeRoles('sudo'), formController.deleteForm);

module.exports = router;
