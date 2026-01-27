require('dotenv').config();
const mongoose = require('mongoose');
// Import User first to ensure it's registered before Blog references it
const User = require('../models/User');
const Blog = require('../models/Blog');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

const userData = [
  {
    name: 'John Doe',
    email: 'john.doe@example.com',
    username: 'johndoe',
    bio: 'Full-stack developer passionate about Node.js and web technologies.',
    avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=200',
  },
];

const blogData = [
  {
    title: 'Getting Started with Node.js',
    slug: 'getting-started-with-nodejs',
    content: `Node.js is a powerful JavaScript runtime built on Chrome's V8 JavaScript engine. It allows you to run JavaScript on the server side, opening up a whole new world of possibilities for web development.

In this blog post, we'll explore the fundamentals of Node.js, including:
- Setting up your development environment
- Understanding the event-driven architecture
- Working with npm (Node Package Manager)
- Building your first server

Node.js is particularly well-suited for building scalable network applications. Its non-blocking I/O model makes it efficient for handling multiple concurrent connections. Whether you're building REST APIs, real-time applications, or microservices, Node.js provides the tools you need.

The ecosystem around Node.js is vast, with thousands of packages available through npm. This makes it easy to add functionality to your applications without reinventing the wheel.`,
    description: 'Learn the basics of Node.js and how to get started with server-side JavaScript development.',
    cover_image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
    tags: ['nodejs', 'javascript', 'backend', 'web-development'],
    status: 'published',
  },
  {
    title: 'Understanding Express.js Middleware',
    slug: 'understanding-expressjs-middleware',
    content: `Express.js is one of the most popular web frameworks for Node.js. It provides a robust set of features for building web applications and APIs. One of the key concepts in Express is middleware.

Middleware functions are functions that have access to the request object (req), the response object (res), and the next middleware function in the application's request-response cycle. They can:
- Execute any code
- Make changes to the request and response objects
- End the request-response cycle
- Call the next middleware function in the stack

Common use cases for middleware include:
- Authentication and authorization
- Logging requests
- Parsing request bodies
- Error handling
- Serving static files

Understanding how middleware works is crucial for building robust Express applications. It allows you to modularize your code and create reusable components that can be applied to different routes.`,
    description: 'A deep dive into Express.js middleware and how to use it effectively in your applications.',
    cover_image: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=800',
    tags: ['express', 'nodejs', 'middleware', 'web-framework'],
    status: 'published',
  },
  {
    title: 'MongoDB Basics for Beginners',
    slug: 'mongodb-basics-for-beginners',
    content: `MongoDB is a popular NoSQL database that stores data in flexible, JSON-like documents. Unlike traditional relational databases, MongoDB doesn't require a fixed schema, making it ideal for applications with evolving data requirements.

Key concepts in MongoDB:
- **Documents**: The basic unit of data (similar to rows in SQL)
- **Collections**: Groups of documents (similar to tables in SQL)
- **Databases**: Containers for collections

MongoDB uses BSON (Binary JSON) for data storage, which supports various data types including strings, numbers, dates, arrays, and nested objects. This flexibility makes it easy to model complex data structures.

Some advantages of MongoDB:
- Flexible schema design
- Horizontal scalability
- Rich query language
- Strong community support
- Easy integration with Node.js

Whether you're building a blog, e-commerce site, or real-time application, MongoDB provides the flexibility and performance you need.`,
    description: 'An introduction to MongoDB and its core concepts for developers new to NoSQL databases.',
    cover_image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
    tags: ['mongodb', 'database', 'nosql', 'backend'],
    status: 'published',
  },
  {
    title: 'The Future of Web Development',
    slug: 'the-future-of-web-development',
    content: `The web development landscape is constantly evolving, with new technologies and frameworks emerging every day. In this blog post, we'll explore the future of web development and what you can expect in the coming years.

The future of web development is bright, with new opportunities and challenges emerging every day. Whether you're a developer, designer, or business owner, there's always something new to learn and explore.`,
    description: 'A look at the future of web development and what you can expect in the coming years.',
    cover_image: 'https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=800',
    tags: ['web-development', 'future', 'technology'],
    status: 'published',
  }
];

const seedBlogs = async () => {
  try {
    // Connect to database
    await connectDB();

    // Clear existing data (optional - comment out if you want to keep existing data)
    await Blog.deleteMany({});
    await User.deleteMany({});
    console.log('Cleared existing blogs and users');

    // Create users first
    const users = await User.insertMany(userData);
    console.log(`✅ Successfully seeded ${users.length} user(s)`);
    const defaultUser = users[0];

    // Add user_id reference to blog data
    const blogsWithUser = blogData.map((blog) => ({
      ...blog,
      user_id: defaultUser._id,
    }));

    // Insert blog data
    const blogs = await Blog.insertMany(blogsWithUser);
    console.log(`✅ Successfully seeded ${blogs.length} blogs`);

    // Display created users
    users.forEach((user) => {
      console.log(`- User: ${user.name} (${user.email})`);
    });

    // Display created blogs
    blogs.forEach((blog) => {
      console.log(`- ${blog.title} (slug: ${blog.slug})`);
    });

    // Close connection
    await mongoose.connection.close();
    console.log('Database connection closed');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding data:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

// Run seeder
seedBlogs();
