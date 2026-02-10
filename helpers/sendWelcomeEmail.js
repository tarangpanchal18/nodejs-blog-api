const ejs = require('ejs');
const path = require('path');
const sendEmail = require('./sendEmail');

/**
 * Send welcome email to newly registered user
 * @param {Object} user - User object containing name, email, username
 * @returns {Promise} - Resolves when email is sent
 */
const sendWelcomeEmail = async (user) => {
  try {
    // Get app URL from environment or use default
    const appUrl = process.env.APP_URL || 'http://localhost:3000';
    const supportEmail = process.env.EMAIL_FROM || 'support@example.com';

    // Render the welcome email template
    const templatePath = path.join(__dirname, '../template/email/welcome.ejs');
    const html = await ejs.renderFile(templatePath, {
      name: user.name,
      username: user.username,
      email: user.email,
      appUrl: appUrl,
      supportEmail: supportEmail
    });

    // Plain text version (fallback for email clients that don't support HTML)
    const text = `
Welcome to Meowwdium!

Hello, ${user.name}!

Your account has been successfully created with the username: ${user.username}

Thank you for joining our vibrant blogging community! You can now start sharing your stories, ideas, and perspectives with our community.

Community Guidelines:
- Be Respectful: Treat all community members with respect and kindness
- Create Original Content: Share your own thoughts and ideas
- Stay On Topic: Keep your posts relevant and valuable
- Use Appropriate Language: Keep it family-friendly
- Engage Constructively: Provide constructive feedback
- Respect Privacy: Protect your privacy and respect others'
- Report Issues: Help us keep the community safe

Start writing at: ${appUrl}/write

Happy Blogging!

© ${new Date().getFullYear()} Meowwdium. All rights reserved.
    `.trim();

    // Send the email
    await sendEmail({
      to: user.email,
      subject: 'Welcome to Meowwdium!',
      text: text,
      html: html
    });

    console.log(`✅ Welcome email sent to ${user.email}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    // Don't throw error - we don't want email failure to block registration
    return { success: false, error: error.message };
  }
};

module.exports = sendWelcomeEmail;
