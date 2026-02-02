require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const cookieParser = require('cookie-parser');
const connectDB = require('./config/db');

// Import models to ensure they're registered before routes use them
require('./models/User');
require('./models/Blog');

// Import routes
const blogRoutes = require('./routes/blogRoutes');
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const apiLimiter = require('./middleware/rateLimiter');
const { sendSuccess } = require('./helpers/responseHelper');

const app = express();

// Connect to MongoDB
connectDB();

// ==================== View Engine Setup ====================
// Set EJS as the template engine for admin panel
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ==================== Middleware ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Parse cookies for admin panel sessions

// Apply rate limiting to all API routes
app.use('/blog', apiLimiter);

// ==================== Routes ====================
// Health check endpoint
app.get('/', (req, res) => {
  return sendSuccess(res, null, 'API is running');
});

// API routes
app.use('/auth', authRoutes);
app.use('/blog', blogRoutes);

// Admin panel routes (renders HTML pages with EJS)
app.use('/admin', adminRoutes);


// ==================== Event Listeners ====================
require('./listeners/blogListeners');


// ==================== Error Handling ====================
// 404 handler (must be after all routes)
app.use(notFound);

// Global error handler (must be last)
app.use(errorHandler);

// ==================== Server ====================
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
