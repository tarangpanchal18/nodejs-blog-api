const User = require('../models/User');
const jwt = require('jsonwebtoken');
const {
  sendSuccess,
  sendError,
  sendValidationError,
  sendUnauthorized,
} = require('../helpers/responseHelper');

/**
 * Generate JWT token
 */
const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

/**
 * Register a new user
 * @route POST /auth/register
 */
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Validation
    const errors = [];

    if (!name || name.trim() === '') {
      errors.push('Name is required');
    }

    if (!email || email.trim() === '') {
      errors.push('Email is required');
    } else {
      const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
      if (!emailRegex.test(email)) {
        errors.push('Please provide a valid email');
      }
    }

    if (!password || password.length < 6) {
      errors.push('Password is required and must be at least 6 characters');
    }

    if (errors.length > 0) {
      return sendValidationError(res, 'Validation failed', errors);
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { username: email.toLowerCase() }],
    });

    if (existingUser) {
      return sendValidationError(res, 'User with this email already exists');
    }

    // Create user (username will be set to email in pre-save hook)
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      isActive: true,
    });

    // Generate token
    const token = generateToken(user._id);

    // Return user data (without password)
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };

    return sendSuccess(
      res,
      {
        user: userData,
        token,
      },
      'User registered successfully',
      201
    );
  } catch (error) {
    if (error.code === 11000) {
      return sendValidationError(res, 'User with this email already exists');
    }
    return sendError(res, 'Error registering user', 500, error.message);
  }
};

/**
 * Login user
 * @route POST /auth/login
 */
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return sendValidationError(res, 'Email and password are required');
    }

    // Find user and include password for comparison
    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return sendUnauthorized(res, 'Invalid email or password');
    }

    // Check if user is active
    if (!user.isActive) {
      return sendUnauthorized(res, 'User account is inactive');
    }

    // Compare password
    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
      return sendUnauthorized(res, 'Invalid email or password');
    }

    // Generate token
    const token = generateToken(user._id);

    // Return user data (without password)
    const userData = {
      _id: user._id,
      name: user.name,
      email: user.email,
      username: user.username,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };

    return sendSuccess(
      res,
      {
        user: userData,
        token,
      },
      'Login successful'
    );
  } catch (error) {
    return sendError(res, 'Error logging in', 500, error.message);
  }
};

module.exports = {
  register,
  login,
};
