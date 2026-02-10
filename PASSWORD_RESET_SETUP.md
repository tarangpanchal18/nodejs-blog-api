# Password Reset Feature Setup

This document explains how to set up and use the password reset functionality.

## Backend Setup

### 1. Environment Variables

Add the following to your `.env` file:

```env
# Application URL for password reset links (already configured)
APP_URL=http://localhost:5173

# Email Configuration (already configured)
EMAIL_HOST=your-smtp-host
EMAIL_PORT=587
EMAIL_HOST_USER=your-email@example.com
EMAIL_HOST_PASSWORD=your-email-password
EMAIL_FROM=noreply@yourdomain.com
```

**Note**: The `APP_URL` and email settings should already be configured from the welcome email setup.

### 2. Database Schema

The `User` model has been updated with two new fields:
- `resetToken`: Stores the hashed reset token
- `resetTokenExpiry`: Stores the token expiration timestamp (1 hour from creation)

These fields are automatically managed by the backend.

## API Endpoints

### Request Password Reset

**POST** `/auth/forgot-password`

Request body:
```json
{
  "email": "user@example.com"
}
```

Response (always returns success to prevent email enumeration):
```json
{
  "success": true,
  "message": "If an account with that email exists, a password reset link has been sent"
}
```

### Reset Password

**POST** `/auth/reset-password`

Request body:
```json
{
  "token": "reset-token-from-email",
  "password": "newPassword123"
}
```

Success response:
```json
{
  "success": true,
  "message": "Password has been reset successfully. You can now log in with your new password."
}
```

Error response (invalid/expired token):
```json
{
  "success": false,
  "message": "Invalid or expired reset token. Please request a new password reset link."
}
```

## Frontend Flow

### 1. User Journey

1. User clicks "Forgot password?" on login page
2. User enters email on `/forgot-password` page
3. User receives email with reset link
4. User clicks link → redirected to `/reset-password/:token`
5. User enters new password
6. User is redirected to login page

### 2. Frontend Routes

- `/forgot-password` - Email submission form
- `/reset-password/:token` - New password form

## Security Features

### Token Security

1. **Cryptographically Secure Generation**: Uses `crypto.randomBytes(32)` for token generation
2. **Hashed Storage**: Tokens are hashed using SHA-256 before storing in database
3. **Time-Limited**: Tokens expire after 1 hour
4. **One-Time Use**: Token is cleared from database after successful password reset

### Email Enumeration Prevention

The API always returns the same success message regardless of whether the email exists or not. This prevents attackers from discovering valid email addresses.

### Password Validation

- Minimum 6 characters required
- Password confirmation must match
- Password is hashed using bcrypt before storage (handled by User model pre-save hook)

## Email Template

The password reset email includes:
- User's name
- Reset link with token
- Expiry information (60 minutes)
- Security warnings
- Professional HTML styling

Template location: `/template/email/resetPassword.ejs`

## Testing

### Manual Testing Steps

1. **Request Reset**:
   ```bash
   curl -X POST http://localhost:3000/auth/forgot-password \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com"}'
   ```

2. **Check Email**: Look for the reset link in your email inbox

3. **Reset Password**:
   ```bash
   curl -X POST http://localhost:3000/auth/reset-password \
     -H "Content-Type: application/json" \
     -d '{"token":"TOKEN_FROM_EMAIL","password":"newPassword123"}'
   ```

4. **Login**: Try logging in with the new password

### Testing Without Email

For testing without email setup, you can:

1. Check server logs for the generated token (when email sending fails)
2. Use a test email service like Mailtrap or Ethereal Email
3. Manually copy the token from the database (for development only)

## Troubleshooting

### Email Not Sending

Check the following:
- Email credentials in `.env` are correct
- SMTP host and port are correct
- Firewall/network allows SMTP connections
- Check server logs for detailed error messages

### Token Expired

- Tokens expire after 1 hour
- User needs to request a new password reset
- Check server time is synchronized correctly

### Invalid Token

- Token must be used only once
- Token is case-sensitive
- Token must match exactly as sent in email
- Check URL encoding if copying manually

## File Structure

```
Backend:
├── models/User.js                         # Updated with reset fields
├── controllers/authController.js           # New endpoints
├── routes/authRoutes.js                   # New routes
├── helpers/sendPasswordResetEmail.js      # Email sender
└── template/email/resetPassword.ejs       # Email template

Frontend:
├── src/pages/ForgotPassword.tsx           # Email submission
├── src/pages/ResetPassword.tsx            # Password reset
├── src/pages/Login.tsx                    # Added "Forgot password?" link
├── src/lib/api.ts                         # API methods
└── src/App.tsx                            # Routes
```

## Production Considerations

1. **Use HTTPS**: Always use HTTPS in production for reset links
2. **Rate Limiting**: Implement rate limiting on forgot-password endpoint
3. **Email Provider**: Use a reliable email service (SendGrid, AWS SES, etc.)
4. **Token Expiry**: Consider adjusting expiry time based on your needs
5. **Audit Logging**: Log password reset attempts for security monitoring
6. **Multi-Factor Auth**: Consider adding 2FA for additional security

## Environment-Specific Configuration

### Development
```env
APP_URL=http://localhost:5173
```

### Production
```env
APP_URL=https://yourdomain.com
```

Make sure to update `APP_URL` for each environment! This is the same variable used for welcome emails.
