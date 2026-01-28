const jwt = require('jsonwebtoken');

const draftBlogView = (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        req.userId = null;
        return next();
    }

    try {
        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userId = decoded.userId;
    } catch (err) {
        req.userId = null;
    }

    next();
};

module.exports = draftBlogView;
