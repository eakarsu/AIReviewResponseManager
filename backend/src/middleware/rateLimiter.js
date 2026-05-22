const rateLimit = require('express-rate-limit');
const { ipKeyGenerator: _ipKeyGenerator } = require('express-rate-limit');
// Fallback if ipKeyGenerator isn't exported by this version of express-rate-limit
const ipKeyGenerator = typeof _ipKeyGenerator === 'function' ? _ipKeyGenerator : (ip) => ip || '0.0.0.0';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Too many attempts. Please try again after 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false
});

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: { error: 'Too many requests. Please try again later.' },
  standardHeaders: true,
  legacyHeaders: false
});

// AI-specific rate limiter: 20 requests per hour per user ID or IP
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 20,
  keyGenerator: (req) => {
    // Use authenticated user ID if available, otherwise fall back to IP
    return req.user ? `user_${req.user.id}` : ipKeyGenerator(req.ip);
  },
  message: { error: 'AI rate limit exceeded. Maximum 20 AI requests per hour.' },
  standardHeaders: true,
  legacyHeaders: false
});

module.exports = { authLimiter, apiLimiter, aiRateLimiter };
