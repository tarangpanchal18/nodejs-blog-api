# Blog API 🚀

A simple yet powerful blog API built with Node.js, Express, and MongoDB. Perfect for learning, experimenting, or building your next blog platform!

## 🛠️ Installation

1. **Clone the repository** (or download it, we're not picky!)
   ```bash
   git clone <your-repo-url>
   cd node_learn
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```
   (This might take a minute, grab a coffee ☕)

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Then edit `.env` and add your MongoDB connection string:
   ```env
   MONGODB_URI=mongodb://localhost:27017/blog_db
   PORT=3000
   JWT_SECRET=your-super-secret-jwt-key-change-this
   JWT_EXPIRES_IN=7d
   PAGINATION_LIMIT=10
   RATE_LIMIT_MAX=20
   RATE_LIMIT_WINDOW_MS=60000
   ```

4. **Make sure MongoDB is running**
   - Local MongoDB: `mongod` (or start your MongoDB service)
   - MongoDB Atlas: Just paste your connection string in `.env`

## 🏃 Running the App

**Development mode** (with auto-reload):
```bash
npm run dev
```

**Production mode**:
```bash
npm start
```

**Seed the database** (optional, but recommended):
```bash
npm run seed
```

**Create an admin user** (to access admin panel):
```bash
node scripts/createAdminUser.js
```

The server will start on `http://localhost:3000` (or whatever PORT you set in `.env`)

**Access the admin panel** at `http://localhost:3000/admin` (requires admin user)

## 📚 API Endpoints

### Public Endpoints
- `GET /` - Health check
- `GET /blog` - Get all blogs (with pagination & filtering)
- `GET /blog/:slug` - Get a single blog by slug

### Authentication Endpoints
- `POST /auth/register` - Register a new user (sends welcome email 📧)
- `POST /auth/login` - Login and get JWT token

### Protected Endpoints (require JWT token)
- `GET /blog/my-blogs` - Get your blogs
- `POST /blog` - Create a new blog
- `PUT /blog/:slug` - Update your blog
- `POST /blog/import` - Import blogs from CSV

### Admin Panel (require JWT token + isAdmin: true)
- `GET /admin` - Admin dashboard with statistics
- `GET /admin/users` - Manage all users
- `PATCH /admin/users/:id` - Toggle user active/inactive status
- `GET /admin/blogs` - Manage all blogs
- `PATCH /admin/blogs/:id` - Change blog status
- `DELETE /admin/blogs/:id` - Delete a blog

**🔐 Admin Panel Features:**
- Beautiful Bootstrap 5 UI
- User management (activate/deactivate users)
- Blog management (change status, delete blogs)
- Real-time statistics dashboard
- See full documentation: [ADMIN_PANEL_README.md](./ADMIN_PANEL_README.md)

## 🎯 Quick Start Example

1. Register a user:
   ```bash
   POST /auth/register
   {
     "name": "John Doe",
     "email": "john@example.com",
     "password": "password123"
   }
   ```

2. Login to get token:
   ```bash
   POST /auth/login
   {
     "email": "john@example.com",
     "password": "password123"
   }
   ```

3. Create a blog (use the token from step 2):
   ```bash
   POST /blog
   Authorization: Bearer <your-token>
   {
     "title": "My First Blog",
     "content": "This is awesome!",
     "tags": ["nodejs", "express"]
   }
   ```

## 🎨 Tech Stack

- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **MongoDB** - Database (via Mongoose)
- **JWT** - Authentication
- **bcrypt** - Password hashing
- **Multer** - File uploads
- **express-rate-limit** - Rate limiting
- **EJS** - Template engine (for admin panel)
- **Bootstrap 5** - CSS framework (for admin panel UI)

## 🤝 Contributing & Usage

**Feel free to use this project however you want!** 🎉

- Want to learn Node.js? Fork it and break things! 💥
- Building a blog? Take it and make it yours! 🚀
- Found a bug? Fix it and make it better! 🐛➡️✨
- Want to add features? Go wild! The codebase is your playground! 🎪

This is a learning project, so there are no strict rules. Use it, modify it, break it, fix it, and most importantly - **have fun with it!** 

If you make something cool with this, we'd love to hear about it (but no pressure, we're not your boss 😄).

## 📝 License

ISC - Do whatever you want with it! It's yours now! 🎁

---

**Happy Coding!** 🎉✨
