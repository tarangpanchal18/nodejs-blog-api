const ejs = require('ejs');
const path = require('path');
const sendEmail = require('./sendEmail');

/**
 * Send notification email to a comment owner when they receive a reply.
 * @param {Object} params
 * @param {string} params.recipientEmail
 * @param {string} params.recipientName
 * @param {string} params.blogTitle
 * @param {string} params.blogSlug
 * @param {string} params.replyAuthor
 * @param {string} params.replyContent
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const sendReplyNotificationEmail = async ({
  recipientEmail,
  recipientName,
  blogTitle,
  blogSlug,
  replyAuthor,
  replyContent
}) => {
  try {
    const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const blogUrl = `${appUrl}/blog/${blogSlug}`;
    const safeReply = replyContent.length > 200
      ? `${replyContent.slice(0, 200)}...`
      : replyContent;

    const subject = `New reply on your comment: ${blogTitle}`;
    const text = `
Hi ${recipientName},

${replyAuthor} replied to your comment on "${blogTitle}".

Reply:
"${safeReply}"

View the discussion: ${blogUrl}
    `.trim();

    const templatePath = path.join(__dirname, '../template/email/replyNotification.ejs');
    const html = await ejs.renderFile(templatePath, {
      recipientName,
      replyAuthor,
      blogTitle,
      safeReply,
      blogUrl
    });

    await sendEmail({
      to: recipientEmail,
      subject,
      text,
      html
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending reply notification email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = sendReplyNotificationEmail;
