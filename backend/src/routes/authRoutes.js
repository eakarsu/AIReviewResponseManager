const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');
const { authRules } = require('../middleware/validationRules');

router.post('/login', authLimiter, validate(authRules.login), authController.login);
router.post('/register', authLimiter, validate(authRules.register), authController.register);
router.get('/profile', authMiddleware, authController.getProfile);
router.get('/me', authMiddleware, authController.getProfile);
router.post('/logout', authMiddleware, authController.logout);
router.post('/forgot-password', authLimiter, validate(authRules.forgotPassword), authController.forgotPassword);
router.post('/reset-password', validate(authRules.resetPassword), authController.resetPassword);
router.put('/change-password', authMiddleware, validate(authRules.changePassword), authController.changePassword);
router.get('/verify-email/:token', authController.verifyEmail);

module.exports = router;
