import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AIOutputDisplay from '../components/AIOutputDisplay';
import './SummaryDetail.css';

const SummaryDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, [id]);

  const fetchSummary = async () => {
    try {
      const response = await api.get(`/review-summaries/${id}`);
      setSummary(response.data);
    } catch (error) {
      console.error('Error fetching summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateSummary = async () => {
    setGenerating(true);
    try {
      const response = await api.post(`/review-summaries/${id}/analyze`);
      setSummary(response.data);
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Failed to generate summary. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this summary?')) {
      try {
        await api.delete(`/review-summaries/${id}`);
        navigate('/review-summaries');
      } catch (error) {
        console.error('Error deleting summary:', error);
      }
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={`star ${i <= rating ? 'filled' : ''}`}>★</span>
      );
    }
    return stars;
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!summary) {
    return <div className="not-found">Summary not found</div>;
  }

  return (
    <div className="summary-detail">
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate('/review-summaries')}>
          ← Back to Summaries
        </button>
        <div className="header-actions">
          <button className="btn-delete" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="detail-content">
        <div className="main-section">
          <div className="product-card">
            <div className="product-header">
              <h1>{summary.product_name}</h1>
              {summary.product_category && (
                <span className="category-badge">{summary.product_category}</span>
              )}
            </div>

            <div className="product-stats">
              <div className="stat-box">
                <span className="stat-value">{summary.total_reviews || 0}</span>
                <span className="stat-label">Total Reviews</span>
              </div>
              <div className="stat-box">
                <div className="rating">
                  {renderStars(Math.round(summary.average_rating || 0))}
                </div>
                <span className="stat-value">{summary.average_rating ? Number(summary.average_rating).toFixed(1) : 'N/A'}</span>
                <span className="stat-label">Average Rating</span>
              </div>
            </div>
          </div>

          {!summary.summary_text && (
            <div className="generate-section">
              <button
                className="btn-generate"
                onClick={handleGenerateSummary}
                disabled={generating}
              >
                {generating ? 'Generating...' : '📊 Generate AI Summary'}
              </button>
              <p>Analyze reviews to extract key insights, pros, cons, and themes.</p>
            </div>
          )}

          {summary.summary_text && (
            <>
              <div className="summary-section">
                <h2>Summary</h2>
                <p>{summary.summary_text}</p>
              </div>

              <div className="insights-grid">
                {summary.pros && summary.pros.length > 0 && (
                  <div className="insight-card pros">
                    <h3>👍 Pros</h3>
                    <ul>
                      {summary.pros.map((pro, idx) => (
                        <li key={idx}>{pro}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {summary.cons && summary.cons.length > 0 && (
                  <div className="insight-card cons">
                    <h3>👎 Cons</h3>
                    <ul>
                      {summary.cons.map((con, idx) => (
                        <li key={idx}>{con}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {summary.common_themes && summary.common_themes.length > 0 && (
                <div className="themes-section">
                  <h3>Common Themes</h3>
                  <div className="themes-list">
                    {summary.common_themes.map((theme, idx) => (
                      <span key={idx} className="theme-tag">{theme}</span>
                    ))}
                  </div>
                </div>
              )}

              {summary.sentiment_breakdown && (
                <AIOutputDisplay
                  title="Sentiment Breakdown"
                  type="info"
                  data={{
                    sentiment_breakdown: summary.sentiment_breakdown
                  }}
                />
              )}

              {summary.ai_insights && (
                <AIOutputDisplay
                  title="AI Business Insights"
                  type="success"
                  data={{
                    insights: summary.ai_insights
                  }}
                />
              )}

              <div className="regenerate-section">
                <button
                  className="btn-regenerate"
                  onClick={handleGenerateSummary}
                  disabled={generating}
                >
                  {generating ? 'Regenerating...' : '🔄 Regenerate Summary'}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="sidebar">
          <div className="info-card">
            <h3>Product Info</h3>
            <div className="info-item">
              <label>ID</label>
              <span>{summary.id}</span>
            </div>
            <div className="info-item">
              <label>Category</label>
              <span>{summary.product_category || 'N/A'}</span>
            </div>
            <div className="info-item">
              <label>Last Updated</label>
              <span>{new Date(summary.last_updated || summary.updated_at).toLocaleDateString()}</span>
            </div>
            <div className="info-item">
              <label>Created</label>
              <span>{new Date(summary.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SummaryDetail;
