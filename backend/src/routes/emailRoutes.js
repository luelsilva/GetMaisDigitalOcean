const express = require('express');
const router = express.Router();
const emailController = require('../controllers/emailController');
const { authenticateToken, authorizeRoles } = require('../middleware/authMiddleware');

router.get('/logs', authenticateToken, authorizeRoles('admin', 'sudo', 'teacher'), emailController.getEmailLogs);
router.post('/contact', authenticateToken, emailController.sendContact);

module.exports = router;
