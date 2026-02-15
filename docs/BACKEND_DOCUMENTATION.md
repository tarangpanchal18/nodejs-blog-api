# Node.js Blog API - Backend Documentation

This document describes the backend application in `/var/www/html/projects/nodejs-blog-api` only.

## 1. Project Overview

### Purpose of the Application
The application is a blog backend API and admin system built with Node.js, Express, and MongoDB. It supports:
- User authentication and profile management.
- Blog creation, update, retrieval, and CSV import.
- AI-assisted moderation workflow before publishing.
- Nested comments with reporting and moderation.
- Admin panel for managing users, blogs, and comments.
- Email notifications (welcome, password reset, comment/reply alerts, view milestone alerts).

### Main Features
- JWT-based authentication for user APIs.
- Admin authentication for dashboard/API moderation endpoints.
- Blog lifecycle states: `draft`, `pending_approval`, `published`, `rejected`.
- LLM-driven content safety moderation (OpenAI/Groq/Gemini adapters).
- Pagination and filtering for blogs/comments.
- Rate limiting for global APIs and comment/report actions.
- Password reset flow using secure token hashing.
- Avatar upload support for user profile images.
- EJS-based admin panel UI.

### Tech Stack Used
- Runtime: Node.js
- Framework: Express.js
- Database: MongoDB with Mongoose
- Auth: JWT (`jsonwebtoken`), password hashing (`bcrypt`)
- File uploads: `multer`
- Rate limiting: `express-rate-limit`
- Emails: `nodemailer` + EJS email templates
- CSV import: `csv-parse`
- Template engine (admin): EJS
- AI moderation providers: OpenAI API, Groq API, Google Gemini API

## 2. Architecture Overview

### Overall Architecture
The backend follows a layered Express architecture:
- `routes/` defines HTTP routes and middleware chains.
- `controllers/` contains endpoint business logic.
- `models/` defines MongoDB schemas and relations.
- `middleware/` handles auth, rate limiting, upload validation, and errors.
- `helpers/` contains reusable utilities (validation, security sanitization, response formatters, email senders).
- `services/` handles external integrations (LLM moderation adapter layer).
- `events/` + `listeners/` implement asynchronous domain events (blog moderation, view-threshold emails).
- `views/` renders admin HTML pages.

### Folder Structure Explanation

```text
config/
  db.js                       # MongoDB connection bootstrap

controllers/
  authController.js           # Register/login/password reset/profile APIs
  blogController.js           # Blog CRUD/list/import/tag search APIs
  commentController.js        # Comment/reply/report/moderation APIs
  adminController.js          # Admin panel pages and admin actions

events/
  blogEvents.js               # EventEmitter instance

helpers/
  blogValidator.js            # Blog input validation and slug generation helpers
  securityHelper.js           # Input sanitization/regex/objectId/pagination helpers
  responseHelper.js           # Standard JSON response builders
  buildCommentTree.js         # Flat->nested comment tree transformation
  sendEmail.js                # Nodemailer transport + send utility
  sendWelcomeEmail.js         # Welcome email rendering/sending
  sendPasswordResetEmail.js   # Password reset email rendering/sending
  sendCommentNotificationEmail.js
  sendReplyNotificationEmail.js

listeners/
  blogListeners.js            # Event handlers: moderation + view-threshold email

middleware/
  auth.js                     # JWT user auth for API
  adminAuth.js                # Admin auth (cookie/header/query token)
  draftBlogView.js            # Optional JWT parser for draft visibility
  rateLimiter.js              # Global API limiter
  commentRateLimiter.js       # Comment/report specific limiters
  upload.js                   # CSV upload middleware (memory)
  profileUpload.js            # Avatar upload middleware (disk)
  errorHandler.js             # Global error handler
  notFound.js                 # 404 handler

models/
  User.js                     # User schema
  Blog.js                     # Blog schema
  Comment.js                  # Comment schema

routes/
  authRoutes.js               # /auth endpoints
  blogRoutes.js               # /blog endpoints
  commentRoutes.js            # /api comment + admin moderation endpoints
  adminRoutes.js              # /admin panel routes

services/
  moderationService.js        # Provider-agnostic moderation service
  llmAdapters/
    index.js                  # Adapter registry + provider resolution
    openai.js                 # OpenAI moderation adapter
    groq.js                   # Groq moderation adapter
    googleGemini.js           # Gemini moderation adapter
    prompts/moderationPrompt.js
    utils/moderationResponse.js

template/email/              # EJS templates for outgoing emails
views/admin/                 # EJS templates for admin panel UI
scripts/createAdminUser.js   # CLI script to create/promote admin users
seeders/blogSeeder.js        # Seeder for demo/load data
server.js                    # App bootstrap and middleware/route registration
```

### Data Flow (Frontend, Backend, Database)

1. Client/frontend sends HTTP request to backend (`/auth`, `/blog`, `/api`, `/admin`).
2. Express middleware chain runs:
- CORS/body parsing/cookie parsing.
- Rate limiter.
- Auth middleware (`auth` or `adminAuth`) if route requires authentication.
- Upload middleware for file endpoints.
3. Controller validates/sanitizes input, applies business rules, queries MongoDB via Mongoose models.
4. Database operations run on `users`, `blogs`, and `comments` collections.
5. Controller returns JSON response (API) or renders EJS view (admin pages).
6. Side effects are performed asynchronously where applicable:
- Email notifications.
- Blog moderation events via EventEmitter and LLM service.

## 3. Module Documentation

### Application Bootstrap Module
- Purpose: Initialize app, database, middleware, routes, listeners, error handling.
- Files and roles:
  - `server.js`: entry point, route mounting, app setup, server start.
  - `config/db.js`: MongoDB connection logic.
- Interaction:
  - Registers models before routes.
  - Loads route modules and middleware modules.
  - Loads `listeners/blogListeners` to subscribe to domain events.

### Authentication Module
- Purpose: User account lifecycle and authenticated profile operations.
- Files and roles:
  - `routes/authRoutes.js`: auth route definitions.
  - `controllers/authController.js`: register/login/forgot/reset/profile update logic.
  - `middleware/auth.js`: validates JWT bearer token for user APIs.
  - `models/User.js`: user schema, password hashing, password compare.
  - `middleware/profileUpload.js`: avatar upload validation/storage.
- Interaction:
  - Uses `helpers/responseHelper` for standard responses.
  - Uses email helpers for welcome/reset notifications.
  - Stores profile avatars in `/uploads/profiles`.

### Blog Module
- Purpose: Blog listing, details, creation, update, user-owned listing, CSV import, tag search.
- Files and roles:
  - `routes/blogRoutes.js`: blog route definitions.
  - `controllers/blogController.js`: blog business logic.
  - `models/Blog.js`: blog schema and indexes.
  - `helpers/blogValidator.js`: reusable blog validation.
  - `helpers/securityHelper.js`: sanitization helpers.
  - `middleware/upload.js`: CSV upload middleware.
  - `middleware/draftBlogView.js`: optional token parser for draft visibility in detail endpoint.
- Interaction:
  - Emits `blogModeration` and `viewsThreshold` events.
  - Fetches owner profile via `populate('user_id')`.
  - Uses pagination helpers and response helpers.

### Comment and Moderation Module
- Purpose: Nested comments, replies, reporting, auto-flagging/hiding, admin comment moderation APIs.
- Files and roles:
  - `routes/commentRoutes.js`: comment endpoints and API moderation routes.
  - `controllers/commentController.js`: comment CRUD/report/moderation logic.
  - `models/Comment.js`: comment schema with spam report metadata.
  - `helpers/buildCommentTree.js`: nested tree transformation.
  - `middleware/commentRateLimiter.js`: anti-spam rate limiting.
- Interaction:
  - Reads blogs to validate comment target slug.
  - Sends comment/reply notification emails.
  - Uses admin middleware for moderation endpoints.

### Admin Panel Module
- Purpose: Server-rendered admin UI and admin management actions.
- Files and roles:
  - `routes/adminRoutes.js`: admin login/logout/dashboard/users/blogs/comments routes.
  - `controllers/adminController.js`: admin auth response, page rendering, user/blog/comment moderation actions.
  - `middleware/adminAuth.js`: admin token verification and access control.
  - `views/admin/*.ejs`: dashboard/login/error/users/blogs/comments views.
- Interaction:
  - Reads and updates User/Blog/Comment collections.
  - Uses cookie-based token for panel sessions (`adminToken`).

### Event and Async Processing Module
- Purpose: Decouple side effects and background-style tasks from request path.
- Files and roles:
  - `events/blogEvents.js`: event emitter instance.
  - `listeners/blogListeners.js`: handlers for:
    - `viewsThreshold`: send milestone email.
    - `blogModeration`: call moderation service and update blog status.
- Interaction:
  - Called by `controllers/blogController.js`.
  - Uses email helper and moderation service.

### Moderation Service Module
- Purpose: Provider-agnostic LLM moderation interface.
- Files and roles:
  - `services/moderationService.js`: provider resolution + fail-safe handling.
  - `services/llmAdapters/index.js`: provider registry.
  - `services/llmAdapters/openai.js`: OpenAI moderation implementation.
  - `services/llmAdapters/groq.js`: Groq moderation implementation.
  - `services/llmAdapters/googleGemini.js`: Gemini moderation implementation.
  - `services/llmAdapters/prompts/moderationPrompt.js`: prompt/messages builders.
  - `services/llmAdapters/utils/moderationResponse.js`: response parsing, sanitation, technical fallback messaging.
- Interaction:
  - Invoked from blog moderation event listener.
  - On moderation failure, returns technical rejection reason.

### Utility and Support Modules
- Purpose: Shared utilities, consistent responses, and operational scripts.
- Files and roles:
  - `helpers/responseHelper.js`: JSON success/error/validation/pagination wrappers.
  - `helpers/securityHelper.js`: sanitization and validation helper functions.
  - `helpers/sendEmail.js`: base email transport.
  - `scripts/createAdminUser.js`: create or promote admin user from CLI.
  - `seeders/blogSeeder.js`: seed bulk demo data.

## 4. API Documentation

Base URL (local): `http://localhost:3000`

### Common Authentication Patterns
- User API auth header:
  - `Authorization: Bearer <jwt_token>`
- Admin auth accepted sources:
  - Cookie: `adminToken`
  - Header: `Authorization: Bearer <jwt_token>`
  - Query fallback: `?token=<jwt_token>`

### Response Format Conventions
Most endpoints return:
- Success:
  - `{ "success": true, "message": "...", "data": ... }`
- Validation/Error:
  - `{ "success": false, "message": "...", "errors"?: [...] }`

Some controllers (comment/admin controllers) return custom JSON directly; shape is documented endpoint-by-endpoint below.

---

### Health

#### `GET /`
- Method: `GET`
- Request body: none
- Response format:
```json
{
  "success": true,
  "message": "API is running"
}
```
- Authentication: No

---

### Authentication Endpoints (`/auth`)

#### `POST /auth/register`
- Method: `POST`
- Request body:
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```
- Response format (201):
```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "username": "john@example.com",
      "avatar": "",
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    },
    "token": "jwt"
  }
}
```
- Authentication: No

#### `POST /auth/login`
- Method: `POST`
- Request body:
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```
- Response format:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "user": {
      "id": "...",
      "name": "John Doe",
      "email": "john@example.com",
      "username": "john@example.com",
      "avatar": "",
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    },
    "token": "jwt"
  }
}
```
- Authentication: No

#### `POST /auth/forgot-password`
- Method: `POST`
- Request body:
```json
{
  "email": "john@example.com"
}
```
- Response format:
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent",
  "data": {}
}
```
- Authentication: No

#### `POST /auth/reset-password`
- Method: `POST`
- Request body:
```json
{
  "token": "plain-reset-token",
  "password": "newPassword123"
}
```
- Response format:
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now log in with your new password.",
  "data": {}
}
```
- Authentication: No

#### `GET /auth/me`
- Method: `GET`
- Request body: none
- Response format:
```json
{
  "success": true,
  "message": "Profile fetched successfully",
  "data": {
    "user": {
      "id": "...",
      "name": "...",
      "email": "...",
      "username": "...",
      "avatar": "http://localhost:3000/uploads/profiles/avatar-...png",
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```
- Authentication: Yes (User JWT)

#### `PUT /auth/me`
- Method: `PUT`
- Request body (multipart/form-data):
  - `name` (required)
  - `email` (must match current email if sent)
  - `avatar` (optional image file, max 2MB)
- Response format:
```json
{
  "success": true,
  "message": "Profile updated successfully",
  "data": {
    "user": {
      "id": "...",
      "name": "Updated Name",
      "email": "john@example.com",
      "username": "john@example.com",
      "avatar": "http://localhost:3000/uploads/profiles/avatar-...png",
      "isActive": true,
      "createdAt": "...",
      "updatedAt": "..."
    }
  }
}
```
- Authentication: Yes (User JWT)

---

### Blog Endpoints (`/blog`)

#### `GET /blog`
- Method: `GET`
- Query params:
  - `page` (optional)
  - `limit` (optional)
  - `search` (optional title search)
  - `tag` (optional, comma-separated or repeated)
- Request body: none
- Response format:
```json
{
  "success": true,
  "message": "Blogs fetched successfully",
  "data": [
    {
      "_id": "...",
      "title": "...",
      "slug": "...",
      "description": "...",
      "impression": 123,
      "user_id": {
        "_id": "...",
        "name": "...",
        "avatar": "..."
      },
      "tags": ["nodejs"],
      "status": "published",
      "createdAt": "...",
      "updatedAt": "...",
      "isBoosted": true,
      "boostType": "new"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 100,
    "pages": 10
  }
}
```
- Authentication: No

#### `GET /blog/tags/search`
- Method: `GET`
- Query params:
  - `q` or `search` (required)
- Request body: none
- Response format:
```json
{
  "success": true,
  "message": "Found 3 tag(s) matching \"no\"",
  "data": [
    { "tag": "nodejs", "count": 25 },
    { "tag": "nosql", "count": 6 }
  ]
}
```
- Authentication: No

#### `GET /blog/my-blogs`
- Method: `GET`
- Query params:
  - `page`, `limit`
  - `search` (title)
  - `status` (`draft|published|pending_approval|rejected`)
  - `tag`
- Request body: none
- Response format:
```json
{
  "success": true,
  "message": "Your blogs fetched successfully",
  "data": [
    {
      "_id": "...",
      "title": "...",
      "slug": "...",
      "status": "draft",
      "impression": 0,
      "createdAt": "...",
      "updatedAt": "..."
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 12,
    "pages": 2
  }
}
```
- Authentication: Yes (User JWT)

#### `POST /blog`
- Method: `POST`
- Request body:
```json
{
  "title": "Building APIs with Express and MongoDB",
  "description": "Practical API patterns",
  "content": "Long blog body...",
  "tags": ["nodejs", "express"],
  "cover_image": "https://example.com/cover.jpg",
  "status": "published"
}
```
- Notes:
  - If `status=published`, backend stores as `pending_approval` and triggers moderation.
- Response format (201):
```json
{
  "success": true,
  "message": "Blog created successfully",
  "data": {
    "_id": "...",
    "title": "...",
    "slug": "building-apis-with-express-and-mongodb",
    "status": "pending_approval",
    "user_id": {
      "_id": "...",
      "name": "...",
      "email": "..."
    },
    "createdAt": "...",
    "updatedAt": "..."
  }
}
```
- Authentication: Yes (User JWT)

#### `POST /blog/import`
- Method: `POST`
- Request body (multipart/form-data):
  - `file` (required CSV, max 5MB)
- Response format (success example):
```json
{
  "success": true,
  "message": "Successfully imported 12 blog(s)",
  "data": {
    "totalRows": 12,
    "inserted": 12,
    "skipped": 0,
    "validationErrors": 0
  }
}
```
- Partial success returns HTTP `207` with details.
- Authentication: Yes (User JWT)

#### `GET /blog/:slug`
- Method: `GET`
- Request body: none
- Response format:
```json
{
  "success": true,
  "message": "Blog fetched successfully",
  "data": {
    "_id": "...",
    "title": "...",
    "slug": "...",
    "content": "...",
    "description": "...",
    "status": "published",
    "impression": 124,
    "user_id": {
      "_id": "...",
      "name": "...",
      "email": "...",
      "username": "...",
      "avatar": "...",
      "bio": "..."
    }
  }
}
```
- Authentication: Optional
  - Public can access only published blogs.
  - Owner can access own non-published blog if valid bearer token is sent.

#### `PUT /blog/:slug`
- Method: `PUT`
- Request body (any subset):
```json
{
  "title": "Updated title",
  "description": "Updated description",
  "content": "Updated content",
  "tags": ["api"],
  "status": "published"
}
```
- Notes:
  - User can update only own blog.
  - If setting `status=published`, backend transitions to `pending_approval` and may retrigger moderation.
- Response format:
```json
{
  "success": true,
  "message": "Blog updated successfully",
  "data": {
    "_id": "...",
    "title": "Updated title",
    "slug": "updated-title",
    "status": "pending_approval",
    "updatedAt": "..."
  }
}
```
- Authentication: Yes (User JWT)

---

### Comment Endpoints (`/api`)

#### `GET /api/blogs/:slug/comments`
- Method: `GET`
- Query params:
  - `page` (default `1`)
  - `limit` (default `50`, paginates top-level comments)
- Request body: none
- Response format:
```json
{
  "success": true,
  "message": "Comments fetched successfully",
  "data": [
    {
      "id": "...",
      "author": {
        "id": "...",
        "name": "...",
        "username": "...",
        "avatar": null
      },
      "content": "...",
      "depth": 0,
      "status": "active",
      "spam_report_count": 0,
      "canReply": true,
      "replies": []
    }
  ],
  "pagination": {
    "total": 25,
    "page": 1,
    "limit": 50,
    "pages": 1
  }
}
```
- Authentication: No

#### `POST /api/blogs/:slug/comments`
- Method: `POST`
- Request body:
```json
{
  "content": "Great article!"
}
```
- Response format (201):
```json
{
  "success": true,
  "message": "Comment posted successfully",
  "data": {
    "id": "...",
    "author": {
      "id": "...",
      "name": "...",
      "username": "...",
      "avatar": null
    },
    "content": "Great article!",
    "depth": 0,
    "status": "active",
    "spam_report_count": 0,
    "createdAt": "...",
    "updatedAt": "...",
    "canReply": true,
    "replies": []
  }
}
```
- Authentication: Yes (User JWT)

#### `POST /api/comments/:commentId/reply`
- Method: `POST`
- Request body:
```json
{
  "content": "Thanks for your feedback!"
}
```
- Response format (201): same shape as comment create, with `depth > 0`.
- Authentication: Yes (User JWT)

#### `DELETE /api/comments/:commentId`
- Method: `DELETE`
- Request body: none
- Response format:
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```
- Authentication: Yes (User JWT, owner only)

#### `POST /api/comments/:commentId/report`
- Method: `POST`
- Request body:
```json
{
  "reason": "spam"
}
```
- Allowed reasons: `spam`, `offensive`, `harassment`, `other`
- Response format:
```json
{
  "success": true,
  "message": "Comment reported successfully",
  "data": {
    "status": "pending_review",
    "spam_report_count": 3
  }
}
```
- Authentication: Yes (User JWT)

#### `GET /api/admin/comments/flagged`
- Method: `GET`
- Query params:
  - `page` (default `1`)
  - `limit` (default `20`)
  - `status` optional (`pending_review|hidden|active`)
- Request body: none
- Response format:
```json
{
  "success": true,
  "message": "Flagged comments fetched successfully",
  "data": [
    {
      "id": "...",
      "content": "...",
      "author": { "id": "...", "name": "...", "username": "...", "email": "..." },
      "blog": { "id": "...", "title": "...", "slug": "..." },
      "status": "pending_review",
      "depth": 0,
      "spam_report_count": 4,
      "is_auto_flagged": true,
      "spam_reports": 4,
      "createdAt": "...",
      "moderated_by": null,
      "moderated_at": null,
      "moderation_reason": null
    }
  ],
  "pagination": {
    "total": 3,
    "page": 1,
    "limit": 20,
    "pages": 1
  }
}
```
- Authentication: Yes (Admin)

#### `PATCH /api/admin/comments/:commentId/moderate`
- Method: `PATCH`
- Request body:
```json
{
  "action": "approve",
  "reason": "Manual review completed"
}
```
- Allowed actions: `approve`, `hide`, `delete`
- Response format:
```json
{
  "success": true,
  "message": "Comment approved and set to active",
  "data": {
    "id": "...",
    "status": "active",
    "moderated_at": "..."
  }
}
```
- Authentication: Yes (Admin)

#### `GET /api/admin/comments/:commentId/reports`
- Method: `GET`
- Request body: none
- Response format:
```json
{
  "success": true,
  "message": "Comment reports fetched successfully",
  "data": {
    "comment": {
      "id": "...",
      "content": "...",
      "author": { "id": "...", "name": "...", "username": "...", "email": "..." },
      "blog": { "title": "...", "slug": "..." },
      "status": "pending_review",
      "spam_report_count": 3,
      "createdAt": "..."
    },
    "reports": [
      {
        "reporter": { "id": "...", "name": "...", "username": "...", "email": "..." },
        "reason": "spam",
        "reported_at": "..."
      }
    ],
    "total_reports": 1
  }
}
```
- Authentication: Yes (Admin)

---

### Admin Panel Endpoints (`/admin`)

These are backend endpoints but primarily for admin UI and management operations.

#### `GET /admin/login`
- Method: `GET`
- Request body: none
- Response format: HTML page (`views/admin/login.ejs`)
- Authentication: No

#### `POST /admin/login`
- Method: `POST`
- Request body:
```json
{
  "email": "admin@example.com",
  "password": "adminPassword"
}
```
- Response format:
```json
{
  "success": true,
  "message": "Login successful",
  "token": "jwt",
  "user": {
    "id": "...",
    "name": "...",
    "email": "...",
    "isAdmin": true
  }
}
```
- Side effect: sets `adminToken` HttpOnly cookie.
- Authentication: No

#### `GET /admin/logout`
- Method: `GET`
- Request body: none
- Response format: HTML page with script to clear browser storage and redirect.
- Authentication: No

#### `GET /admin`
- Method: `GET`
- Request body: none
- Response format: HTML dashboard view.
- Authentication: Yes (Admin)

#### `GET /admin/users`
- Method: `GET`
- Query params: `page`, `limit`
- Response format: HTML users management view.
- Authentication: Yes (Admin)

#### `PATCH /admin/users/:id`
- Method: `PATCH`
- Request body: none
- Response format:
```json
{
  "success": true,
  "message": "User deactivated successfully",
  "isActive": false
}
```
- Authentication: Yes (Admin)

#### `GET /admin/blogs`
- Method: `GET`
- Query params: `page`, `limit`
- Response format: HTML blogs management view.
- Authentication: Yes (Admin)

#### `PATCH /admin/blogs/:id`
- Method: `PATCH`
- Request body:
```json
{
  "status": "published"
}
```
- Allowed status values: `draft`, `published`, `pending_approval`, `rejected`.
- Response format:
```json
{
  "success": true,
  "message": "Blog status updated to published successfully",
  "status": "published"
}
```
- Authentication: Yes (Admin)

#### `DELETE /admin/blogs/:id`
- Method: `DELETE`
- Request body: none
- Response format:
```json
{
  "success": true,
  "message": "Blog deleted successfully"
}
```
- Authentication: Yes (Admin)

#### `GET /admin/comments`
- Method: `GET`
- Query params:
  - `status` (`all|pending_review|hidden|active|deleted`)
  - `page`, `limit`
- Response format: HTML comments moderation view.
- Authentication: Yes (Admin)

#### `PATCH /admin/comments/:id/moderate`
- Method: `PATCH`
- Request body:
```json
{
  "action": "hide",
  "reason": "Policy violation"
}
```
- Response format:
```json
{
  "success": true,
  "message": "Comment hidden successfully (3 comment(s) affected)",
  "data": {
    "id": "...",
    "status": "hidden",
    "impactedCount": 3
  }
}
```
- Note: this route moderates the target comment and descendants for `hide`/`delete`.
- Authentication: Yes (Admin)

## 5. Database Documentation

Database: MongoDB (Mongoose models). In relational terms, these correspond to tables; in MongoDB they are collections.

### Collection: `users`

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| `_id` | ObjectId | Yes | Primary key |
| `name` | String | Yes | Max 100 chars |
| `email` | String | Yes | Unique, lowercase, email regex validated |
| `password` | String | Yes | Min 6, hashed via bcrypt, `select: false` |
| `username` | String | No (auto-set) | Unique, lowercase; defaults to email in pre-save hook |
| `bio` | String | No | Max 500 chars |
| `avatar` | String | No | URL or local upload path |
| `isActive` | Boolean | No | Default `true` |
| `isAdmin` | Boolean | No | Default `false` |
| `resetToken` | String | No | Hashed reset token, `select: false` |
| `resetTokenExpiry` | Date | No | Reset token expiration, `select: false` |
| `createdAt` | Date | Auto | Timestamp |
| `updatedAt` | Date | Auto | Timestamp |

Indexes:
- `email` ascending
- `username` ascending

### Collection: `blogs`

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| `_id` | ObjectId | Yes | Primary key |
| `title` | String | Yes | 10-200 chars |
| `slug` | String | Yes | Unique, lowercase |
| `content` | String | Yes | Blog body |
| `description` | String | Yes | 10-5000 chars |
| `cover_image` | String | No | Optional image URL |
| `impression` | Number | No | Default `0`, min `0` |
| `user_id` | ObjectId | Yes | Ref `User` |
| `tags` | [String] | No | Max 5 tags, normalized lowercase |
| `status` | String | No | Enum: `draft`, `published`, `pending_approval`, `rejected` |
| `rejectionReason` | String | No | Reason if moderation rejects |
| `createdAt` | Date | Auto | Timestamp |
| `updatedAt` | Date | Auto | Timestamp |

Indexes:
- `slug`
- `user_id`
- `tags`

### Collection: `comments`

| Field | Type | Required | Constraints / Notes |
|---|---|---|---|
| `_id` | ObjectId | Yes | Primary key |
| `blog_id` | ObjectId | Yes | Ref `Blog`, indexed |
| `user_id` | ObjectId | Yes | Ref `User`, indexed |
| `parent_id` | ObjectId | No | Self-ref `Comment`, default `null`, indexed |
| `content` | String | Yes | 1-500 chars |
| `depth` | Number | No | Default `0`, min `0`, max `4` |
| `status` | String | No | Enum: `active`, `pending_review`, `hidden`, `deleted` |
| `spam_reports` | Array<Object> | No | Embedded reports (`reported_by`, `reported_at`, `reason`) |
| `spam_report_count` | Number | No | Default `0` |
| `is_auto_flagged` | Boolean | No | Default `false` |
| `moderated_by` | ObjectId | No | Ref `User` (admin/moderator) |
| `moderated_at` | Date | No | Moderation timestamp |
| `moderation_reason` | String | No | Max 500 chars |
| `createdAt` | Date | Auto | Timestamp |
| `updatedAt` | Date | Auto | Timestamp |

Indexes:
- Compound: `(blog_id, status, createdAt desc)`
- Compound: `(parent_id, status)`
- Compound: `(status, spam_report_count desc)`

### Relationships
- `users (1) -> blogs (many)` via `blogs.user_id`.
- `users (1) -> comments (many)` via `comments.user_id`.
- `blogs (1) -> comments (many)` via `comments.blog_id`.
- `comments (1) -> comments (many)` via `comments.parent_id` (nested replies).
- `users (1) -> comments (many)` via `comments.moderated_by` (admin moderation actor).
- `users (1) -> comments.spam_reports (many)` via `spam_reports.reported_by`.

## 6. Setup Instructions

### Installation Steps
1. Clone repository and enter backend directory:
```bash
git clone <repo-url>
cd nodejs-blog-api
```
2. Install dependencies:
```bash
npm install
```
3. Create environment file:
```bash
cp .env.example .env
```
4. Update `.env` values.
5. Ensure MongoDB is reachable.
6. Run application:
```bash
npm run dev
```

### Environment Variables

Required core variables:

| Variable | Purpose |
|---|---|
| `MONGODB_URI` | MongoDB connection string |
| `PORT` | Server port |
| `NODE_ENV` | `development` or `production` |
| `JWT_SECRET` | JWT signing key |
| `JWT_EXPIRES_IN` | Token TTL (example: `7d`) |

API and pagination/rate-limit:

| Variable | Purpose |
|---|---|
| `PAGINATION_LIMIT` | Default blog list limit |
| `RATE_LIMIT_MAX` | Global max requests per window |
| `RATE_LIMIT_WINDOW_MS` | Global limiter window |
| `COMMENT_RATE_LIMIT_MAX` | Comment create/reply limiter max |
| `COMMENT_RATE_LIMIT_WINDOW_MS` | Comment limiter window |
| `REPORT_RATE_LIMIT_MAX` | Report limiter max |
| `REPORT_RATE_LIMIT_WINDOW_MS` | Report limiter window |

Email and app links:

| Variable | Purpose |
|---|---|
| `EMAIL_FROM` | Sender address |
| `EMAIL_HOST` | SMTP host |
| `EMAIL_PORT` | SMTP port |
| `EMAIL_HOST_USER` | SMTP username |
| `EMAIL_HOST_PASSWORD` | SMTP password |
| `FRONTEND_URL` | Used in reset/comment/reply links |
| `APP_URL` | Used in welcome email links |
| `APP_NAME` | Branding/supporting app metadata |
| `BLOG_VIEWS_EMAIL_THRESHOLD` | Send milestone email every N views |

LLM moderation:

| Variable | Purpose |
|---|---|
| `LLM_PROVIDER` | `openai`, `groq`, or `gemini` |
| `LLM_MODEL` | Global model override |
| `LLM_API_KEY` | Generic API key fallback |
| `OPENAI_API_KEY` | OpenAI key |
| `OPENAI_MODEL` | OpenAI model |
| `GROQ_API_KEY` | Groq key |
| `GROQ_MODEL` | Groq model |
| `GROQ_BASE_URL` | Groq API base URL override |
| `GEMINI_API_KEY` | Gemini key |
| `GEMINI_MODEL` | Gemini model |
| `LLM_TIMEOUT_MS` | LLM request timeout |
| `LLM_MAX_RETRIES` | Retry count (OpenAI/Groq adapters) |
| `MODERATION_TITLE_MAX` | Title chars passed to moderation |
| `MODERATION_DESCRIPTION_MAX` | Description chars passed to moderation |
| `MODERATION_CONTENT_SNIPPET_MAX` | Content chars passed to moderation |

### How to Run Locally
- Development mode:
```bash
npm run dev
```
- Production mode:
```bash
npm start
```
- Seed sample data:
```bash
npm run seed
```
- Create/promote admin user:
```bash
npm run create-admin
```

Local URLs:
- API root: `http://localhost:<PORT>/`
- Admin panel: `http://localhost:<PORT>/admin`

## 7. Security Explanation

### Authentication Flow

User authentication (`/auth` + bearer token):
1. User registers or logs in.
2. Backend issues JWT containing `{ userId }` signed with `JWT_SECRET`.
3. Client sends token as `Authorization: Bearer <token>`.
4. `middleware/auth.js` verifies JWT, validates object id format, loads active user, attaches `req.user` and `req.userId`.

Admin authentication (`/admin` and `/api/admin/*`):
1. Admin logs in via `/admin/login` with email/password.
2. Backend validates account is active and `isAdmin=true`.
3. Backend issues JWT containing `{ id }`, sets HttpOnly `adminToken` cookie, and returns token.
4. `middleware/adminAuth.js` verifies token from cookie/header/query and checks admin role.

### Authorization Logic
- User-protected routes require valid user JWT (`middleware/auth`).
- Blog updates are owner-only (`blog.user_id === req.userId`).
- Comment delete is owner-only.
- Admin routes require `isAdmin=true` (`middleware/adminAuth`).
- Public blog detail endpoint restricts non-owner access to published blogs only.
- Public comments endpoint filters to active comments for non-admin contexts.

### Sensitive Data Handling
- Passwords are hashed with bcrypt before save.
- Password field is excluded by default in query results (`select: false`).
- Reset tokens are stored hashed (SHA-256), not plain text.
- Password reset responses are intentionally generic to prevent email enumeration.
- Admin auth cookie uses:
  - `httpOnly: true`
  - `sameSite: 'strict'`
  - `secure` in production
- Centralized error responses avoid leaking detailed internals in production (`NODE_ENV` check).
- Input sanitization helpers reduce injection risk (slug/objectId/regex/tag sanitation).
- Rate limiters mitigate abuse/spam on API and comment/report endpoints.

## 8. Improvement Suggestions

### Code Quality Improvements
1. Standardize response formatting across all controllers.
- `auth/blog` controllers use `responseHelper`; `comment/admin` often use custom `res.json` directly.
- Adopting a single response contract improves client integration consistency.

2. Split large controllers into service/use-case layers.
- `blogController` and `commentController` contain many responsibilities.
- Move validation/business rules/email side effects to dedicated services.

3. Add comprehensive test coverage.
- Add unit + integration tests for auth, moderation transitions, ownership checks, and comment depth/report logic.

4. Introduce API schema validation library.
- Use `zod`/`joi`/`express-validator` for declarative validation rather than manual checks per controller.

5. Add OpenAPI/Swagger generation.
- Keep machine-readable API contract in sync with implementation.

### Security Improvements
1. Harden CORS policy.
- Current setup allows default `cors()` behavior; restrict origins and methods explicitly.

2. Add CSRF protection for cookie-based admin flows.
- Admin panel relies on cookie auth, so CSRF tokens or double-submit protection is recommended.

3. Improve admin token/session lifecycle.
- Add token revocation strategy or short-lived access + refresh token model.

4. Add audit logging for privileged actions.
- Persist who changed user/blog/comment statuses and from where.

5. Improve file upload hardening.
- Perform content sniffing (magic bytes), image re-encoding, and virus scanning for avatar uploads.

### Scalability Improvements
1. Move async tasks to a real job queue.
- EventEmitter runs in-process only. Use Redis queue (BullMQ) or similar for reliability/retries.

2. Add caching for high-read endpoints.
- Cache blog lists, tag search, and blog detail reads with invalidation strategy.

3. Optimize pagination strategy for large collections.
- Use cursor-based pagination for deep page requests.

4. Expand database indexing strategy.
- Add indexes based on real query patterns (for example status+updatedAt on blogs).

5. Externalize file storage.
- Store avatars in object storage (S3-compatible) instead of local disk for multi-instance deployments.

6. Add observability.
- Structured logs, request tracing, metrics, and alerting for error rates and queue failures.

---

## Suggested Docs Usage
- Use this file as `README.md` backend section content.
- Or keep it as dedicated backend reference under `docs/BACKEND_DOCUMENTATION.md`.
