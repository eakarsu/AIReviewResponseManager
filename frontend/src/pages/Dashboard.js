import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import './Dashboard.css';

const Dashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentReviews, setRecentReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, reviewsRes] = await Promise.all([
        api.get('/reviews/stats'),
        api.get('/reviews?limit=5')
      ]);
      setStats(statsRes.data);
      setRecentReviews(reviewsRes.data.slice(0, 5));
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  if (loading) {
    return <div className="loading">Loading dashboard...</div>;
  }

  const cards = [
    {
      title: 'Reviews',
      path: '/reviews',
      icon: '⭐',
      color: '#667eea',
      description: 'Manage all your reviews'
    },
    {
      title: 'Drafts',
      path: '/drafts',
      icon: '📝',
      color: '#2ed573',
      description: 'View pending responses'
    },
    {
      title: 'Templates',
      path: '/templates',
      icon: '📋',
      color: '#ffa502',
      description: 'Create response templates'
    },
    {
      title: 'Businesses',
      path: '/businesses',
      icon: '🏪',
      color: '#ff6b81',
      description: 'Manage your businesses'
    }
  ];

  const aiFeatureCards = [
    {
      title: 'Fake Review Detector',
      path: '/fake-reviews',
      icon: '🔍',
      color: '#ef4444',
      description: 'Detect fake and spam reviews'
    },
    {
      title: 'Review Summarizer',
      path: '/review-summaries',
      icon: '📑',
      color: '#8b5cf6',
      description: 'Summarize product reviews'
    },
    {
      title: 'Trend Analyzer',
      path: '/trends',
      icon: '📈',
      color: '#06b6d4',
      description: 'Identify review trends'
    },
    {
      title: 'Counterfeit Detector',
      path: '/counterfeit',
      icon: '⚠️',
      color: '#f59e0b',
      description: 'Detect counterfeit products'
    },
    {
      title: 'Competitor Monitor',
      path: '/competitors',
      icon: '🏆',
      color: '#10b981',
      description: 'Track competitor reviews'
    },
    {
      title: 'Response Personalizer',
      path: '/personalizer',
      icon: '✨',
      color: '#ec4899',
      description: 'Personalized responses'
    },
    {
      title: 'Review Solicitor',
      path: '/solicitations',
      icon: '📧',
      color: '#3b82f6',
      description: 'Request customer reviews'
    }
  ];

  return (
    <div className="dashboard">
      <div className="page-header">
        <h1>Dashboard</h1>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e3f2fd' }}>📊</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.total_reviews || 0}</span>
            <span className="stat-label">Total Reviews</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fff3e0' }}>⏳</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.pending_reviews || 0}</span>
            <span className="stat-label">Pending</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#e8f5e9' }}>✅</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.responded_reviews || 0}</span>
            <span className="stat-label">Responded</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: '#fce4ec' }}>⭐</div>
          <div className="stat-info">
            <span className="stat-value">{stats?.average_rating || 0}</span>
            <span className="stat-label">Avg Rating</span>
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <h2 className="section-title">Quick Access</h2>
      <div className="nav-cards">
        {cards.map((card) => (
          <div
            key={card.path}
            className="nav-card card card-clickable"
            onClick={() => navigate(card.path)}
            style={{ borderTop: `4px solid ${card.color}` }}
          >
            <span className="nav-card-icon">{card.icon}</span>
            <h3>{card.title}</h3>
            <p>{card.description}</p>
          </div>
        ))}
      </div>

      {/* AI Features */}
      <h2 className="section-title">AI-Powered Tools</h2>
      <div className="ai-feature-cards">
        {aiFeatureCards.map((card) => (
          <div
            key={card.path}
            className="ai-feature-card card card-clickable"
            onClick={() => navigate(card.path)}
            style={{ borderLeft: `4px solid ${card.color}` }}
          >
            <span className="ai-card-icon" style={{ backgroundColor: `${card.color}20`, color: card.color }}>{card.icon}</span>
            <div className="ai-card-content">
              <h3>{card.title}</h3>
              <p>{card.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Platform Stats */}
      <div className="grid-2">
        <div className="card">
          <h3 className="card-title">Reviews by Platform</h3>
          <div className="platform-stats">
            <div className="platform-item">
              <span className="platform-name">
                <span className="badge badge-google">Google</span>
              </span>
              <span className="platform-count">{stats?.google_reviews || 0} reviews</span>
            </div>
            <div className="platform-item">
              <span className="platform-name">
                <span className="badge badge-yelp">Yelp</span>
              </span>
              <span className="platform-count">{stats?.yelp_reviews || 0} reviews</span>
            </div>
          </div>
        </div>

        <div className="card">
          <h3 className="card-title">Sentiment Analysis</h3>
          <div className="sentiment-stats">
            <div className="sentiment-item">
              <span className="sentiment-label positive">Positive</span>
              <span className="sentiment-count">{stats?.positive_reviews || 0}</span>
            </div>
            <div className="sentiment-item">
              <span className="sentiment-label neutral">Neutral</span>
              <span className="sentiment-count">{stats?.neutral_reviews || 0}</span>
            </div>
            <div className="sentiment-item">
              <span className="sentiment-label negative">Negative</span>
              <span className="sentiment-count">{stats?.negative_reviews || 0}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Reviews */}
      <div className="card recent-reviews">
        <div className="card-header">
          <h3 className="card-title">Recent Reviews</h3>
          <button className="btn btn-secondary btn-small" onClick={() => navigate('/reviews')}>
            View All
          </button>
        </div>
        {recentReviews.length > 0 ? (
          <div className="reviews-list">
            {recentReviews.map((review) => (
              <div
                key={review.id}
                className="review-item"
                onClick={() => navigate(`/reviews/${review.id}`)}
              >
                <div className="review-header">
                  <span className="reviewer-name">{review.reviewer_name}</span>
                  <span className={`badge badge-${review.platform}`}>{review.platform}</span>
                </div>
                <div className="review-rating">
                  <span className="stars">{renderStars(review.rating)}</span>
                </div>
                <p className="review-text">{review.review_text.substring(0, 100)}...</p>
                <div className="review-footer">
                  <span className={`badge badge-${review.response_status}`}>
                    {review.response_status}
                  </span>
                  <span className="review-date">
                    {new Date(review.review_date).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <p>No reviews yet</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
