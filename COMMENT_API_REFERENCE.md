# Comment System API Reference

## 📋 Table of Contents
- [Public Endpoints](#public-endpoints)
- [User Endpoints (Protected)](#user-endpoints-protected)
- [Admin Endpoints](#admin-endpoints)
- [Rate Limiting](#rate-limiting)
- [Response Structure](#response-structure)

---

## 🌐 Public Endpoints

### Get Comments for a Blog
```http
GET /api/blogs/:slug/comments
```

**Description:** Fetch all comments for a specific blog post in a nested tree structure.

**Parameters:**
- `slug` (path) - Blog slug
- `page` (query, optional) - Page number (default: 1)
- `limit` (query, optional) - Comments per page (default: 50)

**Access:** Public (shows only 'active' comments to non-admins)

**Response:**
```json
{
  "success": true,
  "message": "Comments fetched successfully",
  "data": [
    {
      "id": "comment_id",
      "author": {
        "id": "user_id",
        "name": "John Doe",
        "username": "johndoe",
        "avatar": "url"
      },
      "content": "Great post!",
      "depth": 0,
      "status": "active",
      "spam_report_count": 0,
      "createdAt": "2026-02-11T10:00:00Z",
      "updatedAt": "2026-02-11T10:00:00Z",
      "canReply": true,
      "replies": [
        {
          "id": "reply_id",
          "author": { ... },
          "content": "Thanks!",
          "depth": 1,
          "replies": []
        }
      ]
    }
  ],
  "pagination": {
    "total": 42,
    "page": 1,
    "limit": 50,
    "pages": 1
  }
}
```

---

## 🔒 User Endpoints (Protected)

### Create a Comment
```http
POST /api/blogs/:slug/comments
Authorization: Bearer {token}
```

**Description:** Create a new top-level comment on a blog.

**Headers:**
- `Authorization: Bearer {JWT_TOKEN}`

**Body:**
```json
{
  "content": "This is a great blog post!"
}
```

**Validation:**
- Content: 1-500 characters
- Blog must be published
- User must be authenticated

**Rate Limit:** 10 comments per minute

**Response:**
```json
{
  "success": true,
  "message": "Comment posted successfully",
  "data": {
    "id": "comment_id",
    "author": { ... },
    "content": "This is a great blog post!",
    "depth": 0,
    "status": "active",
    "spam_report_count": 0,
    "createdAt": "2026-02-11T10:00:00Z",
    "canReply": true,
    "replies": []
  }
}
```

---

### Reply to a Comment
```http
POST /api/comments/:commentId/reply
Authorization: Bearer {token}
```

**Description:** Reply to an existing comment.

**Headers:**
- `Authorization: Bearer {JWT_TOKEN}`

**Parameters:**
- `commentId` (path) - Parent comment ID

**Body:**
```json
{
  "content": "I agree with your point!"
}
```

**Validation:**
- Content: 1-500 characters
- Parent comment must exist and be active
- Parent depth must be < 4 (max 5 levels)
- User must be authenticated

**Rate Limit:** 10 comments per minute

**Response:**
```json
{
  "success": true,
  "message": "Reply posted successfully",
  "data": {
    "id": "reply_id",
    "author": { ... },
    "content": "I agree with your point!",
    "depth": 1,
    "status": "active",
    "canReply": true,
    "replies": []
  }
}
```

---

### Delete a Comment
```http
DELETE /api/comments/:commentId
Authorization: Bearer {token}
```

**Description:** Soft delete your own comment.

**Headers:**
- `Authorization: Bearer {JWT_TOKEN}`

**Parameters:**
- `commentId` (path) - Comment ID to delete

**Validation:**
- User must own the comment

**Response:**
```json
{
  "success": true,
  "message": "Comment deleted successfully"
}
```

**Note:** This is a soft delete. The comment status changes to 'deleted' and content is replaced with "[Comment deleted by user]".

---

### Report a Comment
```http
POST /api/comments/:commentId/report
Authorization: Bearer {token}
```

**Description:** Report a comment as spam or offensive.

**Headers:**
- `Authorization: Bearer {JWT_TOKEN}`

**Parameters:**
- `commentId` (path) - Comment ID to report

**Body:**
```json
{
  "reason": "spam"
}
```

**Valid Reasons:**
- `spam` - Spam content
- `offensive` - Offensive language
- `harassment` - Harassment or bullying
- `other` - Other reason

**Validation:**
- Cannot report your own comment
- Cannot report the same comment twice
- User must be authenticated

**Auto-Moderation:**
- **3+ reports**: Comment status → `pending_review`
- **10+ reports**: Comment status → `hidden`

**Rate Limit:** 5 reports per minute

**Response:**
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

---

## 👮 Admin Endpoints

### Get Flagged Comments
```http
GET /api/admin/comments/flagged
Authorization: Bearer {admin_token}
```

**Description:** Get all comments flagged for moderation.

**Headers:**
- `Authorization: Bearer {JWT_TOKEN}` (admin only)

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Comments per page (default: 20)
- `status` (optional) - Filter by status: `pending_review`, `hidden`, `active`

**Response:**
```json
{
  "success": true,
  "message": "Flagged comments fetched successfully",
  "data": [
    {
      "id": "comment_id",
      "content": "Comment content...",
      "author": {
        "id": "user_id",
        "name": "Commenter Name",
        "username": "username",
        "email": "user@example.com"
      },
      "blog": {
        "id": "blog_id",
        "title": "Blog Title",
        "slug": "blog-slug"
      },
      "status": "pending_review",
      "depth": 0,
      "spam_report_count": 5,
      "is_auto_flagged": true,
      "spam_reports": 5,
      "createdAt": "2026-02-11T10:00:00Z",
      "moderated_by": null,
      "moderated_at": null,
      "moderation_reason": null
    }
  ],
  "pagination": { ... }
}
```

---

### Moderate a Comment
```http
PATCH /api/admin/comments/:commentId/moderate
Authorization: Bearer {admin_token}
```

**Description:** Take moderation action on a comment.

**Headers:**
- `Authorization: Bearer {JWT_TOKEN}` (admin only)

**Parameters:**
- `commentId` (path) - Comment ID to moderate

**Body:**
```json
{
  "action": "approve",
  "reason": "False positive - not spam"
}
```

**Valid Actions:**
- `approve` - Set status to 'active' (false positive)
- `hide` - Set status to 'hidden' (confirmed spam)
- `delete` - Set status to 'deleted' (remove content)

**Response:**
```json
{
  "success": true,
  "message": "Comment approved and set to active",
  "data": {
    "id": "comment_id",
    "status": "active",
    "moderated_at": "2026-02-11T10:30:00Z"
  }
}
```

---

### Get Comment Reports
```http
GET /api/admin/comments/:commentId/reports
Authorization: Bearer {admin_token}
```

**Description:** View detailed spam reports for a specific comment.

**Headers:**
- `Authorization: Bearer {JWT_TOKEN}` (admin only)

**Parameters:**
- `commentId` (path) - Comment ID

**Response:**
```json
{
  "success": true,
  "message": "Comment reports fetched successfully",
  "data": {
    "comment": {
      "id": "comment_id",
      "content": "Comment content...",
      "author": { ... },
      "blog": { ... },
      "status": "pending_review",
      "spam_report_count": 3,
      "createdAt": "2026-02-11T10:00:00Z"
    },
    "reports": [
      {
        "reporter": {
          "id": "user_id",
          "name": "Reporter Name",
          "username": "reporter",
          "email": "reporter@example.com"
        },
        "reason": "spam",
        "reported_at": "2026-02-11T10:15:00Z"
      }
    ],
    "total_reports": 3
  }
}
```

---

## ⏱️ Rate Limiting

### Comment Creation
- **Limit:** 10 comments per minute per user/IP
- **Window:** 60 seconds
- **Scope:** POST comment & reply endpoints

### Spam Reporting
- **Limit:** 5 reports per minute per user/IP
- **Window:** 60 seconds
- **Scope:** POST report endpoint

### General API
- **Limit:** 20 requests per minute per IP
- **Window:** 60 seconds
- **Scope:** All `/api` endpoints

**Rate Limit Response:**
```json
{
  "success": false,
  "message": "Too many comments from this IP, please slow down and try again later."
}
```

---

## 📦 Response Structure

### Success Response
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... },
  "pagination": { ... } // Optional
}
```

### Error Response
```json
{
  "success": false,
  "message": "Error description"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request (validation error)
- `401` - Unauthorized (not authenticated)
- `403` - Forbidden (not authorized)
- `404` - Not Found
- `429` - Too Many Requests (rate limit exceeded)
- `500` - Internal Server Error

---

## 🔑 Authentication

All protected endpoints require a JWT token in the Authorization header:

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

Get your token by logging in via `/auth/login`.

---

## 🛡️ Security Features

1. **Authentication Required** - All write operations require login
2. **Ownership Verification** - Users can only delete their own comments
3. **Admin Authorization** - Moderation endpoints require admin role
4. **Rate Limiting** - Prevents spam and abuse
5. **Input Validation** - 500 character limit, XSS prevention
6. **Soft Deletion** - Comments are never truly deleted (maintains thread integrity)
7. **Auto-Moderation** - Automatic flagging at 3 reports, hiding at 10 reports
8. **Duplicate Prevention** - Users can't report the same comment twice

---

## 📝 Notes

- Comments are nested up to 5 levels deep (depth 0-4)
- Only 'active' comments are visible to non-admins
- Deleted/hidden comments preserve thread structure
- Top-level comments are paginated, replies come with their parents
- All timestamps are in ISO 8601 format (UTC)

---

## 🚀 Quick Start

```bash
# Get comments for a blog
curl http://localhost:3000/api/blogs/my-blog-slug/comments

# Create a comment (requires auth)
curl -X POST http://localhost:3000/api/blogs/my-blog-slug/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Great post!"}'

# Reply to a comment
curl -X POST http://localhost:3000/api/comments/COMMENT_ID/reply \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "I agree!"}'

# Report a comment
curl -X POST http://localhost:3000/api/comments/COMMENT_ID/report \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "spam"}'
```
