# Comment System Testing Checklist

## 🧪 Phase 7: Testing & Polish

This document provides a comprehensive testing checklist for the comment system implementation.

---

## ✅ Backend Testing

### **1. Comment Creation**
- [ ] **Test 1.1**: Create a top-level comment on a published blog
  - Expected: Comment created successfully with status 'active'
  - Verify: Comment appears in database with correct `blog_id`, `user_id`, `depth: 0`
  
- [ ] **Test 1.2**: Try to create comment on draft blog
  - Expected: Error - "Blog not found or not published"
  
- [ ] **Test 1.3**: Create comment without authentication
  - Expected: 401 Unauthorized error
  
- [ ] **Test 1.4**: Create comment with empty content
  - Expected: 400 Bad Request - "Comment content is required"
  
- [ ] **Test 1.5**: Create comment with >500 characters
  - Expected: 400 Bad Request - "Comment cannot exceed 500 characters"

### **2. Reply Functionality**
- [ ] **Test 2.1**: Reply to a top-level comment (depth 0)
  - Expected: Reply created with `depth: 1`, `parent_id` set correctly
  
- [ ] **Test 2.2**: Reply to a reply (nested replies)
  - Expected: Can reply up to depth 4 (5 levels total)
  
- [ ] **Test 2.3**: Try to reply at max depth (depth 4)
  - Expected: 400 Bad Request - "Maximum reply depth reached"
  
- [ ] **Test 2.4**: Reply to deleted/hidden comment
  - Expected: 400 Bad Request - "Cannot reply to this comment"
  
- [ ] **Test 2.5**: Reply without authentication
  - Expected: 401 Unauthorized error

### **3. Comment Deletion**
- [ ] **Test 3.1**: Delete own comment
  - Expected: Status changes to 'deleted', content replaced with placeholder
  
- [ ] **Test 3.2**: Try to delete someone else's comment
  - Expected: 403 Forbidden - "You can only delete your own comments"
  
- [ ] **Test 3.3**: Delete comment without authentication
  - Expected: 401 Unauthorized error
  
- [ ] **Test 3.4**: Verify thread structure maintained after deletion
  - Expected: Replies still visible, parent shows "[Comment deleted by user]"

### **4. Spam Reporting**
- [ ] **Test 4.1**: Report a comment as spam
  - Expected: Report added to `spam_reports` array, count incremented
  
- [ ] **Test 4.2**: Report same comment twice
  - Expected: 400 Bad Request - "You have already reported this comment"
  
- [ ] **Test 4.3**: Report own comment
  - Expected: 400 Bad Request - "You cannot report your own comment"
  
- [ ] **Test 4.4**: Report with 3 reports (auto-flag threshold)
  - Expected: Status changes to 'pending_review', `is_auto_flagged: true`
  
- [ ] **Test 4.5**: Report with 10 reports (auto-hide threshold)
  - Expected: Status changes to 'hidden' automatically
  
- [ ] **Test 4.6**: Report without authentication
  - Expected: 401 Unauthorized error

### **5. Comment Fetching**
- [ ] **Test 5.1**: Get comments for a blog (public)
  - Expected: Returns nested tree structure, only 'active' comments
  
- [ ] **Test 5.2**: Get comments as admin
  - Expected: Returns all comments including 'pending_review' and 'hidden'
  
- [ ] **Test 5.3**: Get comments for non-existent blog
  - Expected: 404 Not Found - "Blog not found"
  
- [ ] **Test 5.4**: Verify nested structure correctness
  - Expected: Replies properly nested under parents, correct depth values
  
- [ ] **Test 5.5**: Test pagination
  - Expected: Top-level comments paginated, replies come with parents

### **6. Admin Moderation**
- [ ] **Test 6.1**: Get flagged comments (admin)
  - Expected: Returns comments with status 'pending_review' or spam_report_count > 0
  
- [ ] **Test 6.2**: Moderate comment - approve
  - Expected: Status changes to 'active', moderation metadata saved
  
- [ ] **Test 6.3**: Moderate comment - hide
  - Expected: Status changes to 'hidden', moderation metadata saved
  
- [ ] **Test 6.4**: Moderate comment - delete
  - Expected: Status changes to 'deleted', content replaced
  
- [ ] **Test 6.5**: Moderate without admin role
  - Expected: 403 Forbidden - "Admin privileges required"
  
- [ ] **Test 6.6**: View comment reports (admin)
  - Expected: Returns all spam reports with reporter details

### **7. Rate Limiting**
- [ ] **Test 7.1**: Create 10+ comments rapidly
  - Expected: After 10 comments, 429 Too Many Requests
  
- [ ] **Test 7.2**: Report 5+ comments rapidly
  - Expected: After 5 reports, 429 Too Many Requests
  
- [ ] **Test 7.3**: Verify rate limit resets after window
  - Expected: Can create comments again after 1 minute

### **8. Edge Cases**
- [ ] **Test 8.1**: Comment with exactly 500 characters
  - Expected: Success
  
- [ ] **Test 8.2**: Comment with exactly 501 characters
  - Expected: 400 Bad Request
  
- [ ] **Test 8.3**: Comment with special characters/emoji
  - Expected: Success, content preserved
  
- [ ] **Test 8.4**: Comment with HTML/XSS attempt
  - Expected: Content sanitized or escaped
  
- [ ] **Test 8.5**: Very long blog slug
  - Expected: Handles gracefully
  
- [ ] **Test 8.6**: Concurrent comment creation
  - Expected: Both comments created successfully

---

## ✅ Frontend Testing

### **1. Comment Display**
- [ ] **Test 1.1**: Comments load correctly on blog detail page
  - Expected: Nested tree structure displayed correctly
  
- [ ] **Test 1.2**: Loading skeleton shows while fetching
  - Expected: 3 skeleton cards displayed
  
- [ ] **Test 1.3**: Error state displays on API failure
  - Expected: Error message with retry button
  
- [ ] **Test 1.4**: Empty state shows when no comments
  - Expected: "No comments yet" message with icon
  
- [ ] **Test 1.5**: Comments refresh after mutations
  - Expected: New comments appear without page reload

### **2. Comment Creation**
- [ ] **Test 2.1**: Create comment as authenticated user
  - Expected: Comment appears immediately, form clears
  
- [ ] **Test 2.2**: Character counter updates live
  - Expected: Shows "X/500 characters", turns red at 450+
  
- [ ] **Test 2.3**: Submit with Ctrl/Cmd + Enter
  - Expected: Comment posted successfully
  
- [ ] **Test 2.4**: Submit button disabled when invalid
  - Expected: Disabled when empty or >500 chars
  
- [ ] **Test 2.5**: Show "Login to comment" for guests
  - Expected: Message with login link displayed
  
- [ ] **Test 2.6**: Toast notification on success/error
  - Expected: Success toast on create, error toast on failure

### **3. Reply Functionality**
- [ ] **Test 3.1**: Reply button shows for authenticated users
  - Expected: Reply button visible on active comments
  
- [ ] **Test 3.2**: Reply button hidden at depth 4
  - Expected: No reply button on max depth comments
  
- [ ] **Test 3.3**: Reply box opens/closes correctly
  - Expected: Textarea appears, auto-focuses
  
- [ ] **Test 3.4**: Submit reply with Ctrl/Cmd + Enter
  - Expected: Reply posted successfully
  
- [ ] **Test 3.5**: Cancel reply clears input
  - Expected: Textarea clears, box closes
  
- [ ] **Test 3.6**: Replies show/hide toggle works
  - Expected: Replies collapse/expand correctly

### **4. Comment Actions**
- [ ] **Test 4.1**: Delete button shows for comment owner
  - Expected: Delete button visible only on own comments
  
- [ ] **Test 4.2**: Delete confirmation dialog appears
  - Expected: Dialog with confirmation message
  
- [ ] **Test 4.3**: Delete comment successfully
  - Expected: Comment shows "[Comment deleted]", toast success
  
- [ ] **Test 4.4**: Report button shows for non-owners
  - Expected: Report button visible on others' comments
  
- [ ] **Test 4.5**: Report dialog with reason selection
  - Expected: Dialog with dropdown for reason
  
- [ ] **Test 4.6**: Report comment successfully
  - Expected: Toast with appropriate message based on count

### **5. Visual Design**
- [ ] **Test 5.1**: Thread lines display correctly
  - Expected: Vertical lines show nesting depth
  
- [ ] **Test 5.2**: Avatar images display
  - Expected: User avatars shown, fallback initials if missing
  
- [ ] **Test 5.3**: Relative time formatting
  - Expected: Shows "2h ago", "just now", etc.
  
- [ ] **Test 5.4**: Status badges display
  - Expected: "Flagged" badge on pending_review comments
  
- [ ] **Test 5.5**: Responsive design on mobile
  - Expected: Layout adapts, buttons accessible

### **6. User Experience**
- [ ] **Test 6.1**: Smooth scrolling after reply
  - Expected: Page scrolls to top after posting reply
  
- [ ] **Test 6.2**: Loading states during mutations
  - Expected: Buttons show "Posting...", "Deleting...", etc.
  
- [ ] **Test 6.3**: Disabled states prevent double submission
  - Expected: Buttons disabled during API calls
  
- [ ] **Test 6.4**: Toast notifications don't stack
  - Expected: Previous toasts dismissed before new ones
  
- [ ] **Test 6.5**: Error messages are user-friendly
  - Expected: Clear, actionable error messages

### **7. Accessibility**
- [ ] **Test 7.1**: Keyboard navigation works
  - Expected: Tab through all interactive elements
  
- [ ] **Test 7.2**: Screen reader compatibility
  - Expected: Proper ARIA labels, semantic HTML
  
- [ ] **Test 7.3**: Focus management
  - Expected: Focus moves to reply box when opened
  
- [ ] **Test 7.4**: Color contrast meets WCAG standards
  - Expected: Text readable on all backgrounds

### **8. Edge Cases**
- [ ] **Test 8.1**: Very long comment content
  - Expected: Wraps correctly, doesn't break layout
  
- [ ] **Test 8.2**: Many nested replies
  - Expected: All levels display correctly, indentation works
  
- [ ] **Test 8.3**: Rapid clicking (prevent double submission)
  - Expected: Only one API call made
  
- [ ] **Test 8.4**: Network error handling
  - Expected: Error toast, retry option available
  
- [ ] **Test 8.5**: Token expiration during use
  - Expected: Redirects to login, shows appropriate message

---

## ✅ Integration Testing

### **1. End-to-End Flows**
- [ ] **Test 1.1**: Complete comment flow
  - Steps: Login → View blog → Create comment → Reply → Delete
  - Expected: All steps work seamlessly
  
- [ ] **Test 1.2**: Spam reporting flow
  - Steps: View comment → Report → Verify status change
  - Expected: Comment flagged/hidden based on count
  
- [ ] **Test 1.3**: Admin moderation flow
  - Steps: Admin login → View flagged → Moderate → Verify change
  - Expected: Comment status updates correctly

### **2. Cross-Browser Testing**
- [ ] **Test 2.1**: Chrome/Chromium
- [ ] **Test 2.2**: Firefox
- [ ] **Test 2.3**: Safari
- [ ] **Test 2.4**: Edge

### **3. Performance Testing**
- [ ] **Test 3.1**: Load blog with 100+ comments
  - Expected: Renders in <2 seconds
  
- [ ] **Test 3.2**: Rapid comment creation
  - Expected: No UI lag, smooth updates
  
- [ ] **Test 3.3**: Large nested threads
  - Expected: All levels render correctly

---

## ✅ Security Testing

### **1. Authentication**
- [ ] **Test 1.1**: Unauthenticated users can't create comments
- [ ] **Test 1.2**: Unauthenticated users can't delete comments
- [ ] **Test 1.3**: Unauthenticated users can't report comments

### **2. Authorization**
- [ ] **Test 2.1**: Users can only delete own comments
- [ ] **Test 2.2**: Users can't report own comments
- [ ] **Test 2.3**: Only admins can moderate comments

### **3. Input Validation**
- [ ] **Test 3.1**: XSS attempts are sanitized
- [ ] **Test 3.2**: SQL injection attempts fail safely
- [ ] **Test 3.3**: Very long inputs are rejected

---

## ✅ Polish Features Checklist

### **Implemented Features**
- [x] Keyboard shortcuts (Ctrl/Cmd + Enter to submit)
- [x] Character counter with visual feedback (red at 450+)
- [x] Loading skeletons with animation
- [x] Error state with retry button
- [x] Empty state with icon and message
- [x] Toast notifications for all actions
- [x] Smooth scrolling after actions
- [x] Focus management (auto-focus reply box)
- [x] Disabled states during API calls
- [x] Visual thread lines for nesting
- [x] Relative time formatting
- [x] Avatar display with fallback
- [x] Status badges for flagged comments
- [x] Better error messages
- [x] Retry functionality

### **Future Enhancements** (Optional)
- [ ] Real-time updates via WebSocket
- [ ] Comment editing functionality
- [ ] Comment reactions/likes
- [ ] Comment search/filter
- [ ] Comment sorting options
- [ ] Rich text editor for comments
- [ ] Image uploads in comments
- [ ] @mentions functionality
- [ ] Comment notifications
- [ ] Comment moderation queue UI

---

## 📝 Test Results Template

```
Test ID: [e.g., 1.1]
Test Name: [e.g., Create top-level comment]
Status: ✅ Pass / ❌ Fail / ⚠️ Partial
Notes: [Any observations or issues]
Date: [Date tested]
Tester: [Name]
```

---

## 🚀 Quick Test Commands

### Backend API Tests (using curl)

```bash
# Get comments
curl http://localhost:3000/api/blogs/test-slug/comments

# Create comment (requires auth token)
curl -X POST http://localhost:3000/api/blogs/test-slug/comments \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test comment"}'

# Reply to comment
curl -X POST http://localhost:3000/api/comments/COMMENT_ID/reply \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Test reply"}'

# Report comment
curl -X POST http://localhost:3000/api/comments/COMMENT_ID/report \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"reason": "spam"}'

# Delete comment
curl -X DELETE http://localhost:3000/api/comments/COMMENT_ID \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 📊 Success Criteria

All critical tests must pass:
- ✅ Comment creation works for authenticated users
- ✅ Replies nest correctly up to 5 levels
- ✅ Spam reporting auto-flags at thresholds
- ✅ Delete functionality works for owners
- ✅ Admin moderation works correctly
- ✅ Rate limiting prevents abuse
- ✅ Frontend displays comments correctly
- ✅ Error handling works gracefully
- ✅ UX is smooth and intuitive

---

**Last Updated:** [Current Date]
**Version:** 1.0.0
