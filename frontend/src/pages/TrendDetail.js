import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AIOutputDisplay from '../components/AIOutputDisplay';
import './TrendDetail.css';

const TrendDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchAnalysis();
  }, [id]);

  const fetchAnalysis = async () => {
    try {
      const response = await api.get(`/trends/${id}`);
      setAnalysis(response.data);
    } catch (error) {
      console.error('Error fetching analysis:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRunAnalysis = async () => {
    setAnalyzing(true);
    try {
      const response = await api.post(`/trends/${id}/analyze`);
      setAnalysis(response.data);
    } catch (error) {
      console.error('Error running analysis:', error);
      alert('Failed to run analysis. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this analysis?')) {
      try {
        await api.delete(`/trends/${id}`);
        navigate('/trends');
      } catch (error) {
        console.error('Error deleting analysis:', error);
      }
    }
  };

  const getTrendIcon = (direction) => {
    switch (direction?.toLowerCase()) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➡️';
      default: return '📊';
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!analysis) {
    return <div className="not-found">Analysis not found</div>;
  }

  return (
    <div className="trend-detail">
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate('/trends')}>
          ← Back to Analyses
        </button>
        <div className="header-actions">
          <button className="btn-delete" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="detail-content">
        <div className="main-section">
          <div className="analysis-card">
            <h1>{analysis.analysis_name}</h1>
            <p className="business-name">📍 {analysis.business_name}</p>
            <div className="date-range">
              📅 {analysis.date_range_start} — {analysis.date_range_end}
            </div>
          </div>

          {!analysis.trend_direction && (
            <div className="analyze-section">
              <button
                className="btn-analyze"
                onClick={handleRunAnalysis}
                disabled={analyzing}
              >
                {analyzing ? 'Analyzing...' : '📊 Run Trend Analysis'}
              </button>
              <p>Analyze review data to identify trends, patterns, and predictions.</p>
            </div>
          )}

          {analysis.trend_direction && (
            <>
              <div className="trend-summary">
                <div className="trend-main">
                  <span className="trend-icon">{getTrendIcon(analysis.trend_direction)}</span>
                  <div className="trend-info">
                    <h2>{analysis.trend_direction}</h2>
                    {analysis.sentiment_change !== null && (
                      <p className={analysis.sentiment_change >= 0 ? 'positive' : 'negative'}>
                        {analysis.sentiment_change >= 0 ? '+' : ''}{analysis.sentiment_change}% sentiment change
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <div className="topics-grid">
                {analysis.emerging_topics && analysis.emerging_topics.length > 0 && (
                  <div className="topics-card emerging">
                    <h3>📈 Emerging Topics</h3>
                    <div className="topics-list">
                      {analysis.emerging_topics.map((topic, idx) => (
                        <span key={idx} className="topic-tag">{topic}</span>
                      ))}
                    </div>
                  </div>
                )}

                {analysis.declining_topics && analysis.declining_topics.length > 0 && (
                  <div className="topics-card declining">
                    <h3>📉 Declining Topics</h3>
                    <div className="topics-list">
                      {analysis.declining_topics.map((topic, idx) => (
                        <span key={idx} className="topic-tag">{topic}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {analysis.seasonal_patterns && (
                <AIOutputDisplay
                  title="Seasonal Patterns"
                  type="info"
                  data={analysis.seasonal_patterns}
                />
              )}

              {analysis.ai_prediction && (
                <div className="prediction-card">
                  <h3>🔮 AI Prediction</h3>
                  <p>{analysis.ai_prediction}</p>
                </div>
              )}

              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="recommendations-card">
                  <h3>💡 Recommendations</h3>
                  <ul>
                    {analysis.recommendations.map((rec, idx) => (
                      <li key={idx}>{rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="rerun-section">
                <button
                  className="btn-rerun"
                  onClick={handleRunAnalysis}
                  disabled={analyzing}
                >
                  {analyzing ? 'Re-analyzing...' : '🔄 Re-run Analysis'}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="sidebar">
          <div className="info-card">
            <h3>Analysis Info</h3>
            <div className="info-item">
              <label>ID</label>
              <span>{analysis.id}</span>
            </div>
            <div className="info-item">
              <label>Created</label>
              <span>{new Date(analysis.created_at).toLocaleDateString()}</span>
            </div>
            <div className="info-item">
              <label>Updated</label>
              <span>{new Date(analysis.updated_at).toLocaleDateString()}</span>
            </div>
          </div>

          {analysis.trend_direction && (
            <div className="status-card">
              <h3>Status</h3>
              <div className={`status-indicator ${analysis.trend_direction}`}>
                <span>{getTrendIcon(analysis.trend_direction)}</span>
                <span>{analysis.trend_direction}</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default TrendDetail;
