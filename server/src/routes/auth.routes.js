const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/me', authController.getMe);
router.put('/me', authController.updateProfile);
router.post('/update-password', authController.updatePassword);
router.post('/forgot-password', authController.forgotPassword);

module.exports = router;
