const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

/**
 * @route   POST /auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', authController.register);

/**
 * @route   POST /auth/login
 * @desc    Login user and get token
 * @access  Public
 */
router.post('/login', authController.login);

/**
 * @route   POST /auth/forgot-password
 * @desc    Request password reset email
 * @access  Public
 */
router.post('/forgot-password', authController.forgotPassword);

/**
 * @route   POST /auth/reset-password
 * @desc    Reset password with token
 * @access  Public
 */
router.post('/reset-password', authController.resetPassword);

module.exports = router;
