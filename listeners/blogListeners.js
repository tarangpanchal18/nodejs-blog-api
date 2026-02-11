const sendEmail = require('../helpers/sendEmail');
const blogEvents = require('../events/blogEvents');
const Blog = require('../models/Blog');
const path = require('path');
const ejs = require('ejs');
const { checkBlogContent } = require('../services/moderationService');

blogEvents.on('viewsThreshold', async ({ blog, user }) => {

  try {
    // Render HTML from template
    const templatePath = path.join(__dirname, '../template/email/viewsThreshold.ejs');
    const html = await ejs.renderFile(templatePath, { blog, user });

    await sendEmail({
      subject: `One of your blogs reached ${blog.impression} views!`,
      text: `Hi ${user.name}, one of your blogs reached ${blog.impression} views!`,
      html,
      to: user.email,
    });

  } catch (err) {
    console.error(`❌ Failed to send email to ${user.email}:`, err);
  }
});

/**
 * Blog Moderation Listener
 * Processes blog moderation after 1 minute delay
 * Randomly approves or rejects (will be replaced with AI logic later)
 */
blogEvents.on('blogModeration', async ({ blog }) => {
  try {
    console.log(`🔄 Starting moderation for ${blog._id}`);

    // Fetch fresh blog data
    const freshBlog = await Blog.findById(blog._id);
    if (!freshBlog) {
      console.error(`❌ Blog not found: ${blog._id}`);
      return;
    }

    // Only process if still pending approval
    if (freshBlog.status !== 'pending_approval') {
      console.log(`🔄 Blog ${freshBlog._id} status is ${freshBlog.status}, skipping moderation`);
      return;
    }

    // Call AI moderation immediately
    const { isSafe, reason } = await checkBlogContent(
      freshBlog.title,
      freshBlog.description,
      freshBlog.content
    );

    if (isSafe) {
      freshBlog.status = 'published';
      console.log(`✅ Blog ${freshBlog._id} approved`);
    } else {
      freshBlog.status = 'rejected';
      freshBlog.rejectionReason = reason;
      console.log(`❌ Blog ${freshBlog._id} rejected`);
    }

    await freshBlog.save();
    console.log(`✅ Moderation complete for ${freshBlog._id}`);
  } catch (err) {
    console.error(`❌ Error in moderation for blog ${blog._id}:`, err);
  }
});
