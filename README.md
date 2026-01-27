# Blog API

A simple blog API built with Node.js, Express, and MongoDB using MVC architecture.

## Project Structure

The project follows MVC (Model-View-Controller) architecture for better code organization:

```
node_learn/
├── config/           # Configuration files
│   └── db.js        # MongoDB connection
├── controllers/      # Business logic (Controllers)
│   └── blogController.js
├── middleware/       # Custom middleware
│   ├── errorHandler.js
│   └── notFound.js
├── models/          # Database models (Models)
│   └── Blog.js
├── routes/          # Route definitions (Routes)
│   └── blogRoutes.js
├── server.js        # Express app entry point
├── package.json
└── README.md
```

**Architecture Overview:**
- **Models** (`models/`): Define database schemas and data structure
- **Controllers** (`controllers/`): Handle business logic and request processing
- **Routes** (`routes/`): Define API endpoints and map them to controllers
- **Middleware** (`middleware/`): Handle errors, authentication, validation, etc.
- **Config** (`config/`): Configuration files (database, etc.)

## Features

- Get all blogs with pagination
- Get a single blog by slug
- Automatic slug generation from title
- Impression tracking
- Tag filtering
- Status filtering (draft/published)

## Blog Schema

- `title` (required): Blog title
- `slug` (auto-generated): URL-friendly identifier
- `content` (required): Blog content
- `description` (optional): Short description
- `impression`: View count (auto-incremented)
- `user_id`: User identifier (default: 1)
- `tags`: Array of tags
- `status`: Blog status (draft/published, default: published)
- `createdAt`: Creation timestamp (auto-generated)
- `updatedAt`: Update timestamp (auto-generated)

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

3. Update `.env` with your MongoDB connection string:
```
MONGODB_URI=mongodb://localhost:27017/blog_db
PORT=3000
```

4. Start the server:
```bash
# Development mode (with nodemon)
npm run dev

# Production mode
npm start
```

## API Endpoints

### GET /blog
Get all blogs with optional pagination and filtering.

**Query Parameters:**
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 10)
- `tag` (optional): Filter by tag
- `status` (optional): Filter by status (draft/published)

**Example:**
```bash
GET /blog
GET /blog?page=1&limit=5
GET /blog?tag=javascript
GET /blog?status=published
```

**Response:**
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 50,
    "pages": 5
  }
}
```

### GET /blog/:slug
Get a single blog by slug. Automatically increments the impression count.

**Example:**
```bash
GET /blog/my-first-blog-post
```

**Response:**
```json
{
  "success": true,
  "data": {
    "title": "My First Blog Post",
    "slug": "my-first-blog-post",
    "content": "...",
    "impression": 1,
    "user_id": 1,
    "tags": ["javascript", "nodejs"],
    "status": "published",
    "createdAt": "2024-01-01T00:00:00.000Z",
    "updatedAt": "2024-01-01T00:00:00.000Z"
  }
}
```

## Example: Creating a Blog (using MongoDB directly)

You can create blogs directly in MongoDB or use a tool like MongoDB Compass:

```javascript
{
  "title": "Getting Started with Node.js",
  "content": "Node.js is a powerful runtime...",
  "description": "Learn the basics of Node.js",
  "user_id": 1,
  "tags": ["nodejs", "javascript", "backend"],
  "status": "published"
}
```

The `slug` will be auto-generated from the title, and `createdAt`/`updatedAt` will be automatically set.

## Technologies Used

- Node.js
- Express.js
- MongoDB with Mongoose
- dotenv for environment variables
- CORS for cross-origin requests
