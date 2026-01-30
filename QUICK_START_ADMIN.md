# Quick Start Guide: Admin Panel

This guide will help you get the admin panel up and running in under 5 minutes! ⚡

## Step 1: Start Your Server

Make sure your server is running:

```bash
npm run dev
```

You should see:
```
✅ MongoDB Connected: localhost
✅ Server is running on port 3000
```

## Step 2: Create an Admin User

Run the admin user creation script:

```bash
node scripts/createAdminUser.js
```

You'll be prompted to enter:
- **Name**: Your full name (e.g., "John Doe")
- **Email**: Your email (e.g., "admin@example.com")
- **Password**: A secure password (min 6 characters)

Example:
```
📝 Create Admin User

This script will create a new user with admin privileges.

Enter name: Admin User
Enter email: admin@example.com
Enter password (min 6 characters): admin123

✅ Admin user created successfully!

📋 User Details:
   ID: 64abc123def456789
   Name: Admin User
   Email: admin@example.com
   Admin: true
   Active: true
```

## Step 3: Get Your JWT Token

Since the admin panel requires authentication, you need to login first:

### Option A: Use Postman/Thunder Client

**1. Send a POST request to login:**

```
POST http://localhost:3000/auth/login
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123"
}
```

**2. Copy the token from the response:**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### Option B: Use cURL

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@example.com","password":"admin123"}'
```

## Step 4: Access the Admin Panel

### Option A: Browser with Token in URL (Quick Test)

Open your browser and navigate to:

```
http://localhost:3000/admin?token=YOUR_JWT_TOKEN_HERE
```

Replace `YOUR_JWT_TOKEN_HERE` with the actual token from Step 3.

### Option B: Browser with Token in LocalStorage (Recommended)

1. **Open your browser and go to:** `http://localhost:3000`

2. **Open browser console** (F12 or Right-click → Inspect)

3. **Store the token in localStorage:**
   ```javascript
   localStorage.setItem('token', 'YOUR_JWT_TOKEN_HERE');
   ```

4. **Navigate to admin panel:**
   ```
   http://localhost:3000/admin
   ```

### Option C: Use Browser Extension (Dev Tools)

1. Install a browser extension like "ModHeader" or "Simple Modify Headers"
2. Add header: `Authorization: Bearer YOUR_JWT_TOKEN_HERE`
3. Navigate to: `http://localhost:3000/admin`

## What You'll See

### Dashboard (`/admin`)
- Total users and active users count
- Total blogs, published, drafts, and pending count
- Quick action buttons
- Beautiful statistics cards

### Users Page (`/admin/users`)
- List of all users with their details
- Toggle button to activate/deactivate users
- Real-time status updates (no page reload!)

### Blogs Page (`/admin/blogs`)
- List of all blogs with author info
- Dropdown to change blog status (draft/published/pending/rejected)
- Delete button for removing blogs
- Real-time updates

## Testing the Features

### Test 1: Create a Regular User

```bash
curl -X POST http://localhost:3000/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Regular User",
    "email": "user@example.com",
    "password": "user123"
  }'
```

Now go to `/admin/users` and you should see this new user!

### Test 2: Deactivate a User

1. Go to `/admin/users`
2. Click the "Deactivate" button next to any user (not yourself!)
3. Watch the status change from "Active" to "Inactive" in real-time
4. Try logging in with that user - it should fail!

### Test 3: Create a Blog

First, login as a regular user and get their token:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"user123"}'
```

Create a blog with that user's token:

```bash
curl -X POST http://localhost:3000/blog \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer USER_TOKEN_HERE" \
  -d '{
    "title": "My Test Blog Post",
    "content": "This is a test blog post content.",
    "description": "A short description of the blog.",
    "tags": ["test", "nodejs"]
  }'
```

### Test 4: Manage the Blog as Admin

1. Go to `/admin/blogs` (with admin token)
2. You should see the newly created blog
3. Click "Change Status" and try different statuses
4. Try deleting a blog (with confirmation)

## Troubleshooting

### Issue: "Not authorized to access this route"

**Problem**: Token is missing or invalid

**Solutions**:
- Make sure you're logged in with an admin user
- Check that the token is correctly set
- Verify the token hasn't expired (check JWT_EXPIRES_IN in .env)
- Try logging in again to get a fresh token

### Issue: "Access denied. Admin privileges required."

**Problem**: The user doesn't have admin privileges

**Solution**: 
Run this in MongoDB shell to make the user an admin:

```javascript
// MongoDB Shell
use blog_db
db.users.updateOne(
  { email: "user@example.com" },
  { $set: { isAdmin: true } }
)
```

Or use MongoDB Compass:
1. Open the `users` collection
2. Find your user by email
3. Edit the document and set `isAdmin: true`

### Issue: Can't see the admin panel (404)

**Problem**: Server not configured correctly

**Solutions**:
- Restart your server: `npm run dev`
- Check that `views/admin/` directory exists
- Verify `server.js` has the admin routes configured
- Check console for any startup errors

### Issue: Styles not loading

**Problem**: Bootstrap CDN issue or network problem

**Solutions**:
- Check your internet connection (Bootstrap loads from CDN)
- Check browser console for any errors
- Try hard refresh: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

## Next Steps

✅ **You've successfully set up the admin panel!** 

Now you can:
- [ ] Create more test users and blogs
- [ ] Try all the admin features
- [ ] Customize the UI colors and styles
- [ ] Add more admin features
- [ ] Set up proper session management with cookies
- [ ] Add pagination for large datasets
- [ ] Implement search and filter functionality

## Need Help?

- Check the full documentation: [ADMIN_PANEL_README.md](./ADMIN_PANEL_README.md)
- Review the main README: [README.md](./README.md)
- Check server logs for errors
- Verify your environment variables in `.env`

---

**Happy Admining!** 🎉🔐
