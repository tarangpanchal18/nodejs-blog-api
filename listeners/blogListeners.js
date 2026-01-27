const blogEvents = require('../events/blogEvents');

blogEvents.on('viewsThreshold', (blog) => {
 
    // fake email logic for now
  console.log(`📧 Email sent: "${blog.title}" reached ${blog.impression} views`);
  
});
