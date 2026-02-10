const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const sendWelcomeEmail = require('../helpers/sendWelcomeEmail');
const sendPasswordResetEmail = require('../helpers/sendPasswordResetEmail');
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

    // Send welcome email asynchronously (don't wait for it)
    // This runs in the background so it doesn't slow down the registration response
    sendWelcomeEmail(user).catch((error) => {
      console.error('Failed to send welcome email:', error);
      // Email failure doesn't affect registration success
    });

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

/**
 * Request password reset
 * @route POST /auth/forgot-password
 */
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Validation
    if (!email || email.trim() === '') {
      return sendValidationError(res, 'Email is required');
    }

    const emailRegex = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return sendValidationError(res, 'Please provide a valid email');
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });

    // Always send success message to prevent email enumeration
    // This is a security best practice - don't reveal if email exists or not
    if (!user) {
      return sendSuccess(
        res,
        {},
        'If an account with that email exists, a password reset link has been sent'
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return sendSuccess(
        res,
        {},
        'If an account with that email exists, a password reset link has been sent'
      );
    }

    // Generate reset token (crypto.randomBytes is cryptographically secure)
    const resetToken = crypto.randomBytes(32).toString('hex');
    
    // Hash the token before storing (security best practice)
    const hashedToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');

    // Set token and expiry (1 hour from now)
    user.resetToken = hashedToken;
    user.resetTokenExpiry = Date.now() + 60 * 60 * 1000; // 1 hour
    await user.save();

    // Send password reset email asynchronously
    sendPasswordResetEmail({
      name: user.name,
      email: user.email,
      resetToken, // Send the unhashed token to the user
    }).catch((error) => {
      console.error('Failed to send password reset email:', error);
      // Email failure is logged but doesn't affect the response
    });

    return sendSuccess(
      res,
      {},
      'If an account with that email exists, a password reset link has been sent'
    );
  } catch (error) {
    console.error('Forgot password error:', error);
    return sendError(res, 'Error processing password reset request', 500, error.message);
  }
};

/**
 * Reset password with token
 * @route POST /auth/reset-password
 */
const resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body;

    // Validation
    const errors = [];

    if (!token || token.trim() === '') {
      errors.push('Reset token is required');
    }

    if (!password || password.length < 6) {
      errors.push('Password is required and must be at least 6 characters');
    }

    if (errors.length > 0) {
      return sendValidationError(res, 'Validation failed', errors);
    }

    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    // Find user with valid token and not expired
    const user = await User.findOne({
      resetToken: hashedToken,
      resetTokenExpiry: { $gt: Date.now() }, // Token not expired
    }).select('+resetToken +resetTokenExpiry');

    if (!user) {
      return sendValidationError(
        res,
        'Invalid or expired reset token. Please request a new password reset link.'
      );
    }

    // Check if user is active
    if (!user.isActive) {
      return sendUnauthorized(res, 'User account is inactive');
    }

    // Update password (will be hashed by pre-save hook)
    user.password = password;
    
    // Clear reset token fields
    user.resetToken = undefined;
    user.resetTokenExpiry = undefined;
    
    await user.save();

    return sendSuccess(
      res,
      {},
      'Password has been reset successfully. You can now log in with your new password.'
    );
  } catch (error) {
    console.error('Reset password error:', error);
    return sendError(res, 'Error resetting password', 500, error.message);
  }
};

module.exports = {
  register,
  login,
  forgotPassword,
  resetPassword,
};
