const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { validateRuntime } = require('./governance/runtime');
const { createProviderGate } = require('./governance/providerGate');
const auth = require('./middleware/auth');
const { apiLimiter, aiRateLimiter } = require('./middleware/rateLimiter');

validateRuntime();

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;
const origins = String(process.env.CORS_ORIGINS || process.env.CLIENT_URL || 'http://localhost:3000')
  .split(',').map((value) => value.trim()).filter(Boolean);

app.use(helmet());
app.use(cors({
  origin(origin, callback) {
    if (!origin || origins.includes(origin)) return callback(null, true);
    return callback(new Error('CORS origin denied'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '1mb' }));
app.use('/api/', apiLimiter);
app.use((req, _res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

app.use('/api/auth', require('./routes/authRoutes'));
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const providerPrefixes = [
  '/api/ai','/api/gap','/api/fake-reviews','/api/review-summaries','/api/trends',
  '/api/counterfeit','/api/competitors','/api/personalizer','/api/auto-respond','/api/quality',
  '/api/reviews/semantic-search','/api/reviews/bulk-import',
];
app.use(createProviderGate(providerPrefixes));
app.use('/api/governed-review-responses', require('./governance/router'));
app.use('/api', auth);

app.use('/api/reviews', require('./routes/reviewRoutes'));
app.use('/api/templates', require('./routes/templateRoutes'));
app.use('/api/businesses', require('./routes/businessRoutes'));
app.use('/api/drafts', require('./routes/draftRoutes'));
app.use('/api/solicitations', require('./routes/solicitorRoutes'));
app.use('/api/businesses', require('./routes/reputationRoutes'));
app.use('/api/custom-views', require('./routes/customViews'));

if (process.env.ENABLE_LEGACY_SCHEMA_BOOTSTRAP === 'true') {
  const pool = require('./config/database');
  Promise.all([
    pool.query(`CREATE TABLE IF NOT EXISTS ai_results (
      id SERIAL PRIMARY KEY, feature VARCHAR(100) NOT NULL,
      business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
      input_summary TEXT, result_text TEXT, result_json JSONB,
      model_used VARCHAR(100), tokens_used INTEGER, created_at TIMESTAMP DEFAULT NOW()
    )`),
    pool.query('ALTER TABLE reviews ADD COLUMN IF NOT EXISTS external_id VARCHAR(255)'),
    pool.query(`CREATE TABLE IF NOT EXISTS auto_respond_configs (
      id SERIAL PRIMARY KEY, business_id INTEGER NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
      enabled BOOLEAN DEFAULT false, min_rating INTEGER DEFAULT 1, max_rating INTEGER DEFAULT 5,
      tone VARCHAR(50) DEFAULT 'professional', signature TEXT, respond_to_platforms TEXT[],
      created_at TIMESTAMP DEFAULT NOW(), updated_at TIMESTAMP DEFAULT NOW(), UNIQUE(business_id)
    )`),
  ]).catch((error) => console.error('Legacy schema bootstrap failed:', error.message));
}

if (process.env.ENABLE_LEGACY_PROVIDER_ROUTES === 'true') {
  app.use('/api/fake-reviews', aiRateLimiter, require('./routes/fakeReviewRoutes'));
  app.use('/api/review-summaries', aiRateLimiter, require('./routes/reviewSummaryRoutes'));
  app.use('/api/trends', aiRateLimiter, require('./routes/trendRoutes'));
  app.use('/api/counterfeit', aiRateLimiter, require('./routes/counterfeitRoutes'));
  app.use('/api/competitors', aiRateLimiter, require('./routes/competitorRoutes'));
  app.use('/api/personalizer', aiRateLimiter, require('./routes/personalizerRoutes'));
  app.use('/api/auto-respond', aiRateLimiter, require('./routes/autoRespondRoutes'));
  app.use('/api/quality', aiRateLimiter, require('./routes/qualityRoutes'));
  app.use('/api/reviews', aiRateLimiter, require('./routes/semanticSearchRoutes'));
  app.use('/api/ai/generate-response', require('./routes/ai-generate-response'));
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
  app.use('/api/ai', aiRateLimiter, require('./routes/aiCollabRoutes'));
}

app.use((err, _req, res, _next) => {
  console.error('Error:', err.message);
  res.status(err.status || 500).json({ error: err.status ? err.message : 'Internal server error' });
});
app.use((_req, res) => res.status(404).json({ error: 'Route not found' }));

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
