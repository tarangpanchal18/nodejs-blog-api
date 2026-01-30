# Admin Panel Documentation

This is a minimal admin panel for managing users and blogs in your Node.js blog application.

## Features

- ✅ **Dashboard**: Overview of users and blogs with statistics
- ✅ **User Management**: View all users and toggle their active/inactive status
- ✅ **Blog Management**: View all blogs and change their status (draft/published/pending/rejected)
- ✅ **Admin Authentication**: Only users with `isAdmin: true` can access the admin panel
- ✅ **Bootstrap 5 UI**: Modern, responsive design with minimal effort
- ✅ **Real-time Updates**: AJAX-based status updates without page reload

## Tech Stack

- **Backend**: Node.js with Express
- **Template Engine**: EJS
- **Database**: MongoDB with Mongoose
- **Styling**: Bootstrap 5 with Bootstrap Icons
- **Authentication**: JWT-based admin authentication

## File Structure

```
node_learn/
├── controllers/
│   └── adminController.js       # Admin panel controller logic
├── middleware/
│   └── adminAuth.js             # Admin authentication middleware
├── routes/
│   └── adminRoutes.js           # Admin panel routes
├── views/
│   └── admin/
│       ├── dashboard.ejs        # Dashboard page
│       ├── users.ejs            # User management page
│       ├── blogs.ejs            # Blog management page
│       └── error.ejs            # Error page
├── scripts/
│   └── createAdminUser.js       # Script to create admin users
└── models/
    ├── User.js                  # User model (with isAdmin field)
    └── Blog.js                  # Blog model
```

## Routes

### Admin Panel Routes

All routes are protected by the `adminAuth` middleware:

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/admin` | Admin dashboard with statistics |
| GET | `/admin/users` | List all users |
| PATCH | `/admin/users/:id` | Toggle user active/inactive status |
| GET | `/admin/blogs` | List all blogs |
| PATCH | `/admin/blogs/:id` | Update blog status |
| DELETE | `/admin/blogs/:id` | Delete a blog |

## Setup Instructions

### 1. Create an Admin User

Before accessing the admin panel, you need to create a user with admin privileges.

**Option A: Using the Script**

Run the provided script to create an admin user interactively:

```bash
node scripts/createAdminUser.js
```

This will prompt you to enter:
- Name
- Email
- Password

**Option B: Manual Database Update**

If you already have a user account, you can update it directly in MongoDB:

```javascript
// In MongoDB shell or Compass
db.users.updateOne(
  { email: "your-email@example.com" },
  { $set: { isAdmin: true } }
)
```

**Option C: Update via Seeder**

Add the following to your user seeder:

```javascript
const adminUser = await User.create({
  name: 'Admin User',
  email: 'admin@example.com',
  password: 'admin123',
  isAdmin: true,
  isActive: true
});
```

### 2. Start the Server

```bash
npm run dev
```

The server will start on `http://localhost:3000` (or your configured PORT).

### 3. Access the Admin Panel

Navigate to: `http://localhost:3000/admin`

## Authentication Flow

The admin panel uses JWT-based authentication. Here's how it works:

1. **Login**: Users must first login through your existing auth system (`/auth/login`)
2. **JWT Token**: Upon successful login, a JWT token is issued
3. **Token Storage**: The token should be stored in:
   - `Authorization` header as `Bearer <token>`
   - Cookie (if implemented)
   - Or query parameter (fallback)
4. **Access Admin Panel**: When accessing `/admin/*` routes, the `adminAuth` middleware:
   - Verifies the JWT token
   - Checks if the user has `isAdmin: true`
   - Checks if the user is active (`isActive: true`)
   - If all checks pass, grants access to the admin panel

### Important Notes on Authentication

⚠️ **Current Implementation**: The admin authentication middleware expects a JWT token but doesn't include a login page. You have two options:

**Option 1: Use Existing Auth System**
- Login through your existing `/auth/login` endpoint
- Store the JWT token in localStorage or cookies
- The admin panel will use this token for authentication

**Option 2: Create Admin Login Page** (recommended)
- Create a dedicated login page at `views/admin/login.ejs`
- Add a route `GET /admin/login` that renders the login form
- Handle login POST request and set the token in a cookie
- Redirect to admin dashboard on success

## User Model Schema

```javascript
{
  name: String,          // User's full name
  email: String,         // User's email (unique)
  password: String,      // Hashed password
  username: String,      // Username (optional)
  bio: String,          // User bio (optional)
  avatar: String,       // Avatar URL (optional)
  isActive: Boolean,    // User account status (default: true)
  isAdmin: Boolean,     // Admin privileges (default: false) ⭐ NEW
  createdAt: Date,      // Account creation timestamp
  updatedAt: Date       // Last update timestamp
}
```

## Blog Model Schema

```javascript
{
  title: String,              // Blog title
  slug: String,               // URL-friendly slug
  content: String,            // Blog content
  description: String,        // Short description
  cover_image: String,        // Cover image URL
  impression: Number,         // View count
  user_id: ObjectId,          // Reference to User model
  tags: [String],             // Array of tags
  status: String,             // 'draft', 'published', 'pending_approval', 'rejected'
  rejectionReason: String,    // Reason for rejection (if applicable)
  createdAt: Date,            // Creation timestamp
  updatedAt: Date             // Last update timestamp
}
```

## Dashboard Features

The dashboard provides:

- **Total Users**: Count of all registered users
- **Active Users**: Count of active users (percentage shown)
- **Total Blogs**: Count of all blogs
- **Published Blogs**: Count of published blogs
- **Draft Blogs**: Count of draft blogs
- **Pending Blogs**: Count of blogs awaiting approval
- **Quick Actions**: Links to user and blog management pages

## User Management Features

- **View All Users**: Display users in a table with:
  - Name (with avatar circle showing first letter)
  - Email
  - Role (Admin/User badge)
  - Status (Active/Inactive badge)
  - Join date
- **Toggle Status**: Activate or deactivate user accounts
  - ⚠️ Admins cannot deactivate themselves
- **Real-time Updates**: Status changes without page reload
- **Visual Feedback**: Color-coded badges and alerts

## Blog Management Features

- **View All Blogs**: Display blogs in a table with:
  - Title and slug
  - Author information (name and email)
  - Status (with color-coded badges)
  - View count
  - Creation date
- **Change Status**: Update blog status to:
  - Draft (yellow badge)
  - Published (green badge)
  - Pending Approval (blue badge)
  - Rejected (red badge)
- **Delete Blogs**: Remove blogs with confirmation dialog
- **Real-time Updates**: Status changes and deletions without page reload

## Security Features

- ✅ **JWT Authentication**: Secure token-based authentication
- ✅ **Admin-only Access**: Routes protected by `adminAuth` middleware
- ✅ **Active User Check**: Deactivated users cannot access admin panel
- ✅ **Self-protection**: Admins cannot deactivate themselves
- ✅ **Token Verification**: Validates JWT signature and expiration
- ⚠️ **Note**: Make sure to use HTTPS in production for secure token transmission

## UI/UX Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Modern UI**: Bootstrap 5 with custom styling
- **Icons**: Bootstrap Icons for visual clarity
- **Color-coded Status**: Easy identification of user/blog status
- **Alerts**: Success/error messages with auto-dismiss
- **Loading States**: Spinners during AJAX operations
- **Hover Effects**: Interactive elements with smooth transitions
- **Sidebar Navigation**: Fixed sidebar with active state
- **Cards**: Stats displayed in attractive card layout

## API Endpoints Used by Admin Panel

### User Management

**PATCH `/admin/users/:id`**

Toggle user active/inactive status.

Request:
```
PATCH /admin/users/64abc123def456789
Authorization: Bearer <jwt_token>
```

Response:
```json
{
  "success": true,
  "message": "User deactivated successfully",
  "isActive": false
}
```

### Blog Management

**PATCH `/admin/blogs/:id`**

Update blog status.

Request:
```
PATCH /admin/blogs/64xyz123def456789
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "status": "published"
}
```

Response:
```json
{
  "success": true,
  "message": "Blog status updated to published successfully",
  "status": "published"
}
```

**DELETE `/admin/blogs/:id`**

Delete a blog.

Request:
```
DELETE /admin/blogs/64xyz123def456789
Authorization: Bearer <jwt_token>
```

Response:
```json
{
  "success": true,
  "message": "Blog deleted successfully"
}
```

## Customization

### Change Colors

Edit the styles in each EJS file's `<style>` section:

```css
/* Sidebar gradient */
.sidebar {
  background: linear-gradient(180deg, #2c3e50 0%, #34495e 100%);
}

/* Active sidebar link color */
.sidebar .nav-link.active {
  background-color: #3498db;
}
```

### Add More Features

To add new features:

1. **Add Route**: Update `routes/adminRoutes.js`
2. **Add Controller Method**: Update `controllers/adminController.js`
3. **Create View**: Add new EJS file in `views/admin/`
4. **Update Sidebar**: Add link in sidebar navigation

### Modify Table Columns

Edit the table structure in the respective EJS files:

```html
<!-- In users.ejs or blogs.ejs -->
<thead class="table-light">
  <tr>
    <th scope="col">Column 1</th>
    <th scope="col">Column 2</th>
    <!-- Add more columns -->
  </tr>
</thead>
```

## Troubleshooting

### Issue: "Not authorized to access this route"

**Solution**: Make sure:
- You're logged in with a valid JWT token
- The user has `isAdmin: true` in the database
- The token is sent in the Authorization header

### Issue: "User not found" or "Blog not found"

**Solution**: Check that:
- The database connection is working
- The User/Blog models are correctly defined
- MongoDB is running

### Issue: Admin panel not loading

**Solution**: Verify:
- EJS is installed (`npm list ejs`)
- Views directory path is correct in `server.js`
- Server is running without errors

### Issue: Status toggle not working

**Solution**: Check:
- Browser console for JavaScript errors
- JWT token is valid and not expired
- Network tab shows the PATCH request is being sent
- Backend logs for any errors

## Production Considerations

Before deploying to production:

1. ✅ **Use HTTPS**: Ensure all traffic is encrypted
2. ✅ **Secure JWT Secret**: Use a strong, random secret key
3. ✅ **Set Token Expiration**: Configure reasonable JWT expiration time
4. ✅ **Rate Limiting**: Add rate limiting to admin routes
5. ✅ **Logging**: Implement audit logs for admin actions
6. ✅ **Input Validation**: Add validation for all inputs
7. ✅ **Error Handling**: Implement proper error handling
8. ✅ **CORS**: Configure CORS properly for your frontend
9. ✅ **Environment Variables**: Store sensitive data in .env file
10. ✅ **Database Backups**: Regular backups before admin actions

## Future Enhancements

Potential features to add:

- [ ] Admin login page with session management
- [ ] Pagination for large datasets
- [ ] Search and filter functionality
- [ ] Bulk actions (activate/deactivate multiple users)
- [ ] User role management (multiple roles)
- [ ] Blog content preview
- [ ] Activity logs/audit trail
- [ ] Export data to CSV/Excel
- [ ] Email notifications for admin actions
- [ ] Two-factor authentication for admins
- [ ] Dark mode toggle
- [ ] Analytics dashboard with charts

## Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review the server logs for errors
3. Verify your environment variables are set correctly
4. Ensure all dependencies are installed

## License

This admin panel is part of your blog application and follows the same license.

---

**Created with** ❤️ **using Node.js, Express, EJS, and Bootstrap 5**
