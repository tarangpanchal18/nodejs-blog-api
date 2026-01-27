require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

// Import models to ensure they're registered before routes use them
require('./models/User');
require('./models/Blog');

// Import routes
const blogRoutes = require('./routes/blogRoutes');
const authRoutes = require('./routes/authRoutes');

// Import middleware
const errorHandler = require('./middleware/errorHandler');
const notFound = require('./middleware/notFound');
const apiLimiter = require('./middleware/rateLimiter');
const { sendSuccess } = require('./helpers/responseHelper');

const app = express();

// Connect to MongoDB
connectDB();

// ==================== Middleware ====================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
