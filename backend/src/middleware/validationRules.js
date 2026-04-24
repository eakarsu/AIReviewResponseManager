const { body, query } = require('express-validator');

const authRules = {
  register: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain a number')
      .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character'),
    body('name').trim().notEmpty().withMessage('Name is required')
  ],
  login: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required'),
    body('password').notEmpty().withMessage('Password is required')
  ],
  changePassword: [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain a number')
      .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character')
  ],
  forgotPassword: [
    body('email').isEmail().normalizeEmail().withMessage('Valid email is required')
  ],
  resetPassword: [
    body('token').notEmpty().withMessage('Reset token is required'),
    body('password')
      .isLength({ min: 8 }).withMessage('Password must be at least 8 characters')
      .matches(/[A-Z]/).withMessage('Password must contain an uppercase letter')
      .matches(/[a-z]/).withMessage('Password must contain a lowercase letter')
      .matches(/[0-9]/).withMessage('Password must contain a number')
      .matches(/[!@#$%^&*(),.?":{}|<>]/).withMessage('Password must contain a special character')
  ]
};

const reviewRules = {
  create: [
    body('business_id').isInt().withMessage('Valid business ID is required'),
    body('platform').isIn(['google', 'yelp']).withMessage('Platform must be google or yelp'),
    body('reviewer_name').trim().notEmpty().withMessage('Reviewer name is required'),
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review_text').trim().notEmpty().withMessage('Review text is required'),
    body('review_date').isISO8601().withMessage('Valid date is required')
  ],
  update: [
    body('reviewer_name').optional().trim().notEmpty().withMessage('Reviewer name cannot be empty'),
    body('rating').optional().isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1 and 5'),
    body('review_text').optional().trim().notEmpty().withMessage('Review text cannot be empty')
  ]
};

const businessRules = {
  create: [
    body('name').trim().notEmpty().withMessage('Business name is required'),
    body('platform').isIn(['google', 'yelp']).withMessage('Platform must be google or yelp')
  ],
  update: [
    body('name').optional().trim().notEmpty().withMessage('Business name cannot be empty')
  ]
};

const templateRules = {
  create: [
    body('name').trim().notEmpty().withMessage('Template name is required'),
    body('category').isIn(['positive', 'negative', 'neutral', 'apology', 'thank_you']).withMessage('Invalid category'),
    body('content').trim().notEmpty().withMessage('Template content is required')
  ],
  update: [
    body('name').optional().trim().notEmpty().withMessage('Template name cannot be empty'),
    body('content').optional().trim().notEmpty().withMessage('Template content cannot be empty')
  ]
};

const draftRules = {
  create: [
    body('review_id').isInt().withMessage('Valid review ID is required'),
    body('draft_text').trim().notEmpty().withMessage('Draft text is required')
  ],
  update: [
    body('draft_text').optional().trim().notEmpty().withMessage('Draft text cannot be empty')
  ]
};

const fakeReviewRules = {
  create: [
    body('review_text').trim().notEmpty().withMessage('Review text is required'),
    body('platform').optional().isIn(['amazon', 'ebay', 'google', 'yelp', 'g2']).withMessage('Invalid platform')
  ]
};

const summaryRules = {
  create: [
    body('product_name').trim().notEmpty().withMessage('Product name is required')
  ]
};

const trendRules = {
  create: [
    body('analysis_name').trim().notEmpty().withMessage('Analysis name is required')
  ]
};

const counterfeitRules = {
  create: [
    body('product_name').trim().notEmpty().withMessage('Product name is required')
  ]
};

const competitorRules = {
  create: [
    body('competitor_name').trim().notEmpty().withMessage('Competitor name is required')
  ]
};

const personalizerRules = {
  create: [
    body('reviewer_name').trim().notEmpty().withMessage('Reviewer name is required'),
    body('original_review').trim().notEmpty().withMessage('Original review is required')
  ]
};

const solicitorRules = {
  create: [
    body('customer_name').trim().notEmpty().withMessage('Customer name is required')
  ]
};

const paginationRules = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  query('sort_by').optional().trim().notEmpty(),
  query('sort_order').optional().isIn(['asc', 'desc']).withMessage('Sort order must be asc or desc')
];

const bulkRules = {
  delete: [
    body('ids').isArray({ min: 1 }).withMessage('At least one ID is required'),
    body('ids.*').isInt().withMessage('Each ID must be an integer')
  ],
  update: [
    body('ids').isArray({ min: 1 }).withMessage('At least one ID is required'),
    body('ids.*').isInt().withMessage('Each ID must be an integer'),
    body('updates').isObject().withMessage('Updates object is required')
  ]
};

module.exports = {
  authRules,
  reviewRules,
  businessRules,
  templateRules,
  draftRules,
  fakeReviewRules,
  summaryRules,
  trendRules,
  counterfeitRules,
  competitorRules,
  personalizerRules,
  solicitorRules,
  paginationRules,
  bulkRules
};
