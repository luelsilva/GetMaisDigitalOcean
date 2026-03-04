const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { authLimiter } = require('../middleware/rateLimiter');
const { strictAuthLimiter, authBurstyLimiter } = require('../middleware/rateLimiter');
const { authenticateToken } = require('../middleware/authMiddleware');
const {
    validate,
    registerSchema,
    loginSchema,
    otpSchema,
    resetPasswordSchema,
    emailOnlySchema
} = require('../utils/validators');

// Aplicar limitadores híbridos
router.use(authBurstyLimiter); // Proteção por IP mas com margem maior
router.use(strictAuthLimiter); // Proteção rígida por Usuário + IP

// Rotas de Autenticação
router.get('/me', authenticateToken, authController.me);
router.post('/register', validate(registerSchema), authController.register);
router.post('/verify-otp', validate(otpSchema), authController.verifyOtp);
router.post('/resend-otp', validate(emailOnlySchema), authController.resendOtp);
router.post('/forgot-password', validate(emailOnlySchema), authController.forgotPassword);
router.post('/reset-password', validate(resetPasswordSchema), authController.resetPassword);
router.post('/login', validate(loginSchema), authController.login);
router.post('/login-or-register-company', authController.loginOrRegisterCompany);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticateToken, authController.logout);
router.post('/change-password', authenticateToken, authController.changePassword);

module.exports = router;
