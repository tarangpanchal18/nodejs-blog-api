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

module.exports = router;
