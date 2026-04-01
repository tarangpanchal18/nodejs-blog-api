/**
 * Build nested comment tree from flat array of comments
 * This recursive function organizes comments into a hierarchical structure
 * where each comment can have an array of reply comments.
 * 
 * @param {Array} comments - Flat array of all comments (must be lean/plain objects)
 * @param {String|null} parentId - Parent comment ID to match (null for top-level)
 * @param {Number} currentDepth - Current depth level in the tree
 * @returns {Array} - Nested array of comment objects with replies
 * 
 * @example
 * const comments = await Comment.find({ blog_id }).populate('user_id').lean();
 * const tree = buildCommentTree(comments);
 */
function buildCommentTree(comments, parentId = null, currentDepth = 0) {
  const tree = [];
  
  for (const comment of comments) {
    // Convert parent_id to string for comparison (handles both ObjectId and null)
    const commentParentId = comment.parent_id ? comment.parent_id.toString() : null;
    const targetParentId = parentId ? parentId.toString() : null;
    
    // Check if this comment belongs at this level
    if (commentParentId === targetParentId) {
      // Transform comment to frontend-friendly structure
      const commentObj = {
        id: comment._id.toString(),
        author: {
          id: comment.user_id._id.toString(),
          name: comment.user_id.name,
          username: comment.user_id.username,
          avatar: comment.user_id.avatar || null
        },
        content: comment.content,
        depth: comment.depth,
        status: comment.status,
        spam_report_count: comment.spam_report_count || 0,
        is_auto_flagged: comment.is_auto_flagged || false,
        createdAt: comment.createdAt,
        updatedAt: comment.updatedAt,
        canReply: comment.depth < 4 && comment.status === 'active',
        replies: []
      };
      
      // Only include moderation info if present
      if (comment.moderated_by) {
        commentObj.moderated_by = comment.moderated_by;
        commentObj.moderated_at = comment.moderated_at;
        commentObj.moderation_reason = comment.moderation_reason;
      }
      
      // Recursively build replies for this comment
      commentObj.replies = buildCommentTree(
        comments,
        comment._id,
        currentDepth + 1
      );
      
      tree.push(commentObj);
    }
  }
  
  // Sort comments by creation date
  // Top-level: Newest first (better UX - recent discussions on top)
  // Replies: Oldest first (chronological conversation flow)
  return tree.sort((a, b) => {
    if (currentDepth === 0) {
      // Top-level comments: newest first
      return new Date(b.createdAt) - new Date(a.createdAt);
    }
    // Replies: oldest first (chronological)
    return new Date(a.createdAt) - new Date(b.createdAt);
  });
}

module.exports = buildCommentTree;
