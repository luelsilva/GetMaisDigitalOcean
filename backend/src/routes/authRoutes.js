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
router.use(authBurstyLimiter); // Proteção por IP mas com margem maior (100 requisições / 15 min)

// Rotas de Autenticação
router.get('/me', authenticateToken, authController.me);
router.post('/register', strictAuthLimiter, validate(registerSchema), authController.register);
router.post('/verify-otp', strictAuthLimiter, validate(otpSchema), authController.verifyOtp);
router.post('/resend-otp', strictAuthLimiter, validate(emailOnlySchema), authController.resendOtp);
router.post('/forgot-password', strictAuthLimiter, validate(emailOnlySchema), authController.forgotPassword);
router.post('/reset-password', strictAuthLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/login', strictAuthLimiter, validate(loginSchema), authController.login);
router.post('/login-or-register-company', strictAuthLimiter, authController.loginOrRegisterCompany);
router.post('/refresh', authController.refresh);
router.post('/logout', authenticateToken, authController.logout);
router.post('/change-password', authenticateToken, authController.changePassword);

module.exports = router;
