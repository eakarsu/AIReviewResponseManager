const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { apiLimiter, aiRateLimiter } = require('./middleware/rateLimiter');

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
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));
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

// New production routes
const reputationRoutes = require('./routes/reputationRoutes');
const autoRespondRoutes = require('./routes/autoRespondRoutes');
const semanticSearchRoutes = require('./routes/semanticSearchRoutes');

// New feature routes (AI rate limiter applied to all AI-heavy routes)
app.use('/api/fake-reviews', aiRateLimiter, fakeReviewRoutes);
app.use('/api/review-summaries', aiRateLimiter, reviewSummaryRoutes);
app.use('/api/trends', aiRateLimiter, trendRoutes);
app.use('/api/counterfeit', aiRateLimiter, counterfeitRoutes);
app.use('/api/competitors', aiRateLimiter, competitorRoutes);
app.use('/api/personalizer', aiRateLimiter, personalizerRoutes);
app.use('/api/solicitations', solicitorRoutes);

// Production feature routes
app.use('/api/businesses', reputationRoutes);  // adds /:id/reputation-score and /:id/auto-respond-config on top of businessRoutes
app.use('/api/reviews', aiRateLimiter, semanticSearchRoutes); // adds /semantic-search, /bulk-import
app.use('/api/auto-respond', aiRateLimiter, autoRespondRoutes); // adds /reviews/:id/auto-respond
app.use('/api/quality', aiRateLimiter, require('./routes/qualityRoutes')); // /score-response, /reputation-risk-alert, /translate-response

// Auto-migrate: ensure ai_results and auto_respond_configs tables exist
const pool = require('./config/database');
pool.query(`
  CREATE TABLE IF NOT EXISTS ai_results (
    id SERIAL PRIMARY KEY,
    feature VARCHAR(100) NOT NULL,
    business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
    input_summary TEXT,
    result_text TEXT,
    result_json JSONB,
    model_used VARCHAR(100),
    tokens_used INTEGER,
    created_at TIMESTAMP DEFAULT NOW()
  )
`).catch(() => {});
pool.query(`ALTER TABLE reviews ADD COLUMN IF NOT EXISTS external_id VARCHAR(255)`).catch(() => {});
pool.query(`
  CREATE TABLE IF NOT EXISTS auto_respond_configs (
    id SERIAL PRIMARY KEY,
    business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    enabled BOOLEAN DEFAULT false,
    min_rating INTEGER DEFAULT 1,
    max_rating INTEGER DEFAULT 5,
    tone VARCHAR(50) DEFAULT 'professional',
    signature TEXT,
    respond_to_platforms TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    UNIQUE(business_id)
  )
`).catch(() => {});

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

// AI feature mount: generate-response
app.use('/api/ai/generate-response', require('./routes/ai-generate-response'));
// === Batch 07 Gaps & Frontend Mounts ===
app.use('/api/gap-no-generateresponse-aidrafted-responses', require('./routes/gap-no-generateresponse-aidrafted-responses'));
app.use('/api/gap-no-sentimentanalysis-classify-sentiment-urge', require('./routes/gap-no-sentimentanalysis-classify-sentiment-urge'));
app.use('/api/gap-no-fakereviewdetector-ml-scoring', require('./routes/gap-no-fakereviewdetector-ml-scoring'));
app.use('/api/gap-no-competitorsentiment-ai', require('./routes/gap-no-competitorsentiment-ai'));
app.use('/api/gap-no-responsequalityscorer', require('./routes/gap-no-responsequalityscorer'));
app.use('/api/gap-no-reputationriskalert-forecasting-branddama', require('./routes/gap-no-reputationriskalert-forecasting-branddama'));
app.use('/api/gap-no-review-aggregation-from-google-yelp-tripa', require('./routes/gap-no-review-aggregation-from-google-yelp-tripa'));
app.use('/api/gap-no-publishing-to-multiple-platforms', require('./routes/gap-no-publishing-to-multiple-platforms'));
app.use('/api/gap-limited-team-collaboration-assignment-commen', require('./routes/gap-limited-team-collaboration-assignment-commen'));
app.use('/api/gap-no-analytics-dashboard-response-rate-timetor', require('./routes/gap-no-analytics-dashboard-response-rate-timetor'));
app.use('/api/gap-no-notifications-for-new-reviews', require('./routes/gap-no-notifications-for-new-reviews'));
app.use('/api/gap-no-smsemail-solicitor-channel-integration', require('./routes/gap-no-smsemail-solicitor-channel-integration'));
// === End Batch 07 ===
