const sendEmail = require('../helpers/sendEmail');
const blogEvents = require('../events/blogEvents');
const path = require('path');
const ejs = require('ejs');

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