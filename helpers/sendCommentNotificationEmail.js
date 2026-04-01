const ejs = require('ejs');
const path = require('path');
const sendEmail = require('./sendEmail');

/**
 * Send notification email to blog owner when a new top-level comment is posted.
 * This helper is intentionally simple and text-first to avoid blocking comment creation.
 * @param {Object} params
 * @param {string} params.ownerEmail
 * @param {string} params.ownerName
 * @param {string} params.blogTitle
 * @param {string} params.blogSlug
 * @param {string} params.commentAuthor
 * @param {string} params.commentContent
 * @returns {Promise<{success: boolean, error?: string}>}
 */
const sendCommentNotificationEmail = async ({
  ownerEmail,
  ownerName,
  blogTitle,
  blogSlug,
  commentAuthor,
  commentContent
}) => {
  try {
    const appUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const blogUrl = `${appUrl}/blog/${blogSlug}`;
    const safeComment = commentContent.length > 200
      ? `${commentContent.slice(0, 200)}...`
      : commentContent;

    const subject = `New comment on your blog: ${blogTitle}`;
    const text = `
Hi ${ownerName},

${commentAuthor} commented on your blog "${blogTitle}".

Comment:
"${safeComment}"

View your blog: ${blogUrl}
    `.trim();

    const templatePath = path.join(__dirname, '../template/email/commentNotification.ejs');
    const html = await ejs.renderFile(templatePath, {
      ownerName,
      commentAuthor,
      blogTitle,
      safeComment,
      blogUrl
    });

    await sendEmail({
      to: ownerEmail,
      subject,
      text,
      html
    });

    return { success: true };
  } catch (error) {
    console.error('Error sending comment notification email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = sendCommentNotificationEmail;
