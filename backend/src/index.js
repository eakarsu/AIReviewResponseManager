const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { apiLimiter } = require('./middleware/rateLimiter');

const authRoutes = require('./routes/authRoutes');
const reviewRoutes = require('./routes/reviewRoutes');
const templateRoutes = require('./routes/templateRoutes');
const businessRoutes = require('./routes/businessRoutes');
const draftRoutes = require('./routes/draftRoutes');

// New feature routes
const fakeReviewRoutes = require('./routes/fakeReviewRoutes');
const reviewSummaryRoutes = require('./routes/reviewSummaryRoutes');
const trendRoutes = require('./routes/trendRoutes');
const counterfeitRoutes = require('./routes/counterfeitRoutes');
const competitorRoutes = require('./routes/competitorRoutes');
const personalizerRoutes = require('./routes/personalizerRoutes');
const solicitorRoutes = require('./routes/solicitorRoutes');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(express.json());

// Rate limiting for all API routes
app.use('/api/', apiLimiter);

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/templates', templateRoutes);
app.use('/api/businesses', businessRoutes);
app.use('/api/drafts', draftRoutes);

// New feature routes
app.use('/api/fake-reviews', fakeReviewRoutes);
app.use('/api/review-summaries', reviewSummaryRoutes);
app.use('/api/trends', trendRoutes);
app.use('/api/counterfeit', counterfeitRoutes);
app.use('/api/competitors', competitorRoutes);
app.use('/api/personalizer', personalizerRoutes);
app.use('/api/solicitations', solicitorRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
