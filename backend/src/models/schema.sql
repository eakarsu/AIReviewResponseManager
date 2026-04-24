-- Drop tables if they exist
DROP TABLE IF EXISTS response_drafts CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS templates CASCADE;
DROP TABLE IF EXISTS businesses CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS settings CASCADE;
DROP TABLE IF EXISTS fake_review_detections CASCADE;
DROP TABLE IF EXISTS review_summaries CASCADE;
DROP TABLE IF EXISTS trend_analyses CASCADE;
DROP TABLE IF EXISTS counterfeit_detections CASCADE;
DROP TABLE IF EXISTS competitor_monitors CASCADE;
DROP TABLE IF EXISTS personalized_responses CASCADE;
DROP TABLE IF EXISTS review_solicitations CASCADE;

-- Users table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user',
    email_verified BOOLEAN DEFAULT FALSE,
    email_verification_token VARCHAR(255),
    password_reset_token VARCHAR(255),
    password_reset_expires TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Token blacklist table
CREATE TABLE token_blacklist (
    id SERIAL PRIMARY KEY,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_token_blacklist_hash ON token_blacklist(token_hash);
CREATE INDEX idx_token_blacklist_expires ON token_blacklist(expires_at);

-- Businesses table
CREATE TABLE businesses (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    platform VARCHAR(50) NOT NULL, -- 'google' or 'yelp'
    business_id VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    category VARCHAR(100),
    rating DECIMAL(2,1),
    review_count INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Reviews table
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
    platform VARCHAR(50) NOT NULL, -- 'google' or 'yelp'
    reviewer_name VARCHAR(255) NOT NULL,
    reviewer_avatar TEXT,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    review_text TEXT NOT NULL,
    review_date TIMESTAMP NOT NULL,
    response_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'draft', 'responded', 'ignored'
    sentiment VARCHAR(50), -- 'positive', 'neutral', 'negative'
    keywords TEXT[], -- Array of extracted keywords
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Response drafts table
CREATE TABLE response_drafts (
    id SERIAL PRIMARY KEY,
    review_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
    draft_text TEXT NOT NULL,
    tone VARCHAR(50), -- 'professional', 'friendly', 'apologetic', 'grateful'
    is_approved BOOLEAN DEFAULT FALSE,
    is_sent BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Templates table
CREATE TABLE templates (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL, -- 'positive', 'negative', 'neutral', 'apology', 'thank_you'
    content TEXT NOT NULL,
    tone VARCHAR(50),
    use_count INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Settings table
CREATE TABLE settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    setting_key VARCHAR(255) NOT NULL,
    setting_value TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, setting_key)
);

-- Fake Review Detections table
CREATE TABLE fake_review_detections (
    id SERIAL PRIMARY KEY,
    review_text TEXT NOT NULL,
    reviewer_name VARCHAR(255),
    platform VARCHAR(50),
    detection_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    fake_probability DECIMAL(5,2),
    confidence_score DECIMAL(5,2),
    red_flags TEXT[],
    ai_analysis TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    verified_by VARCHAR(255),
    is_fake BOOLEAN,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Review Summaries table (E-commerce)
CREATE TABLE review_summaries (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    product_category VARCHAR(100),
    total_reviews INTEGER,
    average_rating DECIMAL(3,2),
    summary_text TEXT,
    pros TEXT[],
    cons TEXT[],
    common_themes TEXT[],
    sentiment_breakdown JSONB,
    ai_insights TEXT,
    last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Trend Analyses table
CREATE TABLE trend_analyses (
    id SERIAL PRIMARY KEY,
    analysis_name VARCHAR(255) NOT NULL,
    business_name VARCHAR(255),
    date_range_start DATE,
    date_range_end DATE,
    trend_direction VARCHAR(50),
    sentiment_change DECIMAL(5,2),
    emerging_topics TEXT[],
    declining_topics TEXT[],
    seasonal_patterns JSONB,
    ai_prediction TEXT,
    recommendations TEXT[],
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Counterfeit Detections table (E-commerce)
CREATE TABLE counterfeit_detections (
    id SERIAL PRIMARY KEY,
    product_name VARCHAR(255) NOT NULL,
    seller_name VARCHAR(255),
    platform VARCHAR(50),
    review_count INTEGER,
    risk_level VARCHAR(50),
    risk_score DECIMAL(5,2),
    warning_signs TEXT[],
    suspicious_reviews TEXT[],
    ai_analysis TEXT,
    status VARCHAR(50) DEFAULT 'monitoring',
    action_taken VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Competitor Monitors table
CREATE TABLE competitor_monitors (
    id SERIAL PRIMARY KEY,
    competitor_name VARCHAR(255) NOT NULL,
    competitor_platform VARCHAR(50),
    business_category VARCHAR(100),
    total_reviews INTEGER,
    average_rating DECIMAL(3,2),
    sentiment_score DECIMAL(5,2),
    strengths TEXT[],
    weaknesses TEXT[],
    key_differentiators TEXT[],
    ai_competitive_analysis TEXT,
    last_scraped TIMESTAMP,
    monitoring_status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Personalized Responses table
CREATE TABLE personalized_responses (
    id SERIAL PRIMARY KEY,
    reviewer_name VARCHAR(255) NOT NULL,
    reviewer_profile JSONB,
    original_review TEXT,
    review_sentiment VARCHAR(50),
    personalization_factors TEXT[],
    generated_response TEXT,
    tone VARCHAR(50),
    personalization_score DECIMAL(5,2),
    ai_reasoning TEXT,
    status VARCHAR(50) DEFAULT 'draft',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Review Solicitations table
CREATE TABLE review_solicitations (
    id SERIAL PRIMARY KEY,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255),
    customer_phone VARCHAR(50),
    purchase_date DATE,
    product_service VARCHAR(255),
    optimal_send_time TIMESTAMP,
    channel VARCHAR(50),
    message_template TEXT,
    personalized_message TEXT,
    ai_timing_reason TEXT,
    status VARCHAR(50) DEFAULT 'scheduled',
    sent_at TIMESTAMP,
    response_received BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better performance
CREATE INDEX idx_reviews_business_id ON reviews(business_id);
CREATE INDEX idx_reviews_platform ON reviews(platform);
CREATE INDEX idx_reviews_status ON reviews(response_status);
CREATE INDEX idx_templates_user_id ON templates(user_id);
CREATE INDEX idx_templates_category ON templates(category);
CREATE INDEX idx_businesses_user_id ON businesses(user_id);

-- Indexes for new tables
CREATE INDEX idx_fake_review_status ON fake_review_detections(status);
CREATE INDEX idx_fake_review_platform ON fake_review_detections(platform);
CREATE INDEX idx_review_summaries_category ON review_summaries(product_category);
CREATE INDEX idx_trend_analyses_business ON trend_analyses(business_name);
CREATE INDEX idx_counterfeit_risk ON counterfeit_detections(risk_level);
CREATE INDEX idx_counterfeit_status ON counterfeit_detections(status);
CREATE INDEX idx_competitor_status ON competitor_monitors(monitoring_status);
CREATE INDEX idx_personalized_status ON personalized_responses(status);
CREATE INDEX idx_solicitation_status ON review_solicitations(status);
