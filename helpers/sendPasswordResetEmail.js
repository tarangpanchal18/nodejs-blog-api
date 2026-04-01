const ejs = require('ejs');
const path = require('path');
const sendEmail = require('./sendEmail');

/**
 * Send password reset email to user
 * @param {Object} params - Email parameters
 * @param {string} params.name - User's name
 * @param {string} params.email - User's email
 * @param {string} params.resetToken - Password reset token
 * @returns {Promise<Object>} - Resolves with success/error status
 */
const sendPasswordResetEmail = async ({ name, email, resetToken }) => {
  try {
    // Get app URL from environment or use default
    const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const supportEmail = process.env.EMAIL_FROM || 'support@example.com';
    
    // Construct reset URL
    const resetUrl = `${appUrl}/reset-password/${resetToken}`;
    
    // Token expiry in minutes (60 minutes = 1 hour)
    const expiryMinutes = 60;

    // Render the password reset email template
    const templatePath = path.join(__dirname, '../template/email/resetPassword.ejs');
    const html = await ejs.renderFile(templatePath, {
      name,
      email,
      resetUrl,
      expiryMinutes,
      supportEmail
    });

    // Plain text version (fallback for email clients that don't support HTML)
    const text = `
Hello ${name},

We received a request to reset the password for your account (${email}).

To reset your password, click the link below:
${resetUrl}

This link will expire in ${expiryMinutes} minutes.

If you didn't request a password reset, please ignore this email. Your password will remain unchanged.

For security reasons:
- Never share your password with anyone
- Use a strong, unique password
- Don't reply to this email with your password
- Be cautious of phishing attempts

Stay Safe!

© ${new Date().getFullYear()} Meowwdium. All rights reserved.
    `.trim();

    // Send the email
    await sendEmail({
      to: email,
      subject: 'Reset Your Password - Meowwdium',
      text: text,
      html: html
    });

    console.log(`✅ Password reset email sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    // Don't throw error - we don't want email failure to block the password reset request
    return { success: false, error: error.message };
  }
};

module.exports = sendPasswordResetEmail;
