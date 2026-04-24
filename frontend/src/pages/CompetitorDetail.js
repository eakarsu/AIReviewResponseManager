import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AIOutputDisplay from '../components/AIOutputDisplay';
import './CompetitorDetail.css';

const CompetitorDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [monitor, setMonitor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchMonitor();
  }, [id]);

  const fetchMonitor = async () => {
    try {
      const response = await api.get(`/competitors/${id}`);
      setMonitor(response.data);
    } catch (error) {
      console.error('Error fetching monitor:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const response = await api.post(`/competitors/${id}/analyze`);
      setMonitor(response.data);
    } catch (error) {
      console.error('Error analyzing:', error);
      alert('Failed to analyze competitor. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleToggleStatus = async () => {
    const newStatus = monitor.monitoring_status === 'active' ? 'paused' : 'active';
    try {
      await api.put(`/competitors/${id}`, { monitoring_status: newStatus });
      fetchMonitor();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this competitor monitor?')) {
      try {
        await api.delete(`/competitors/${id}`);
        navigate('/competitors');
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={`star ${i <= Math.round(rating || 0) ? 'filled' : ''}`}>★</span>
      );
    }
    return stars;
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!monitor) {
    return <div className="not-found">Monitor not found</div>;
  }

  return (
    <div className="competitor-detail">
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate('/competitors')}>
          ← Back to Competitors
        </button>
        <div className="header-actions">
          <button
            className={`btn-status ${monitor.monitoring_status}`}
            onClick={handleToggleStatus}
          >
            {monitor.monitoring_status === 'active' ? 'Pause' : 'Resume'} Monitoring
          </button>
          <button className="btn-delete" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="detail-content">
        <div className="main-section">
          <div className="competitor-card">
            <div className="competitor-header">
              <h1>{monitor.competitor_name}</h1>
              <span className={`status-badge ${monitor.monitoring_status}`}>
                {monitor.monitoring_status}
              </span>
            </div>
            <div className="competitor-meta">
              <span>🌐 {monitor.competitor_platform}</span>
              {monitor.business_category && <span>📂 {monitor.business_category}</span>}
            </div>
            <div className="competitor-stats">
              <div className="stat-box">
                <div className="rating">{renderStars(monitor.average_rating)}</div>
                <span className="stat-value">{monitor.average_rating ? Number(monitor.average_rating).toFixed(1) : 'N/A'}</span>
                <span className="stat-label">Rating</span>
              </div>
              <div className="stat-box">
                <span className="stat-value">{monitor.total_reviews || 0}</span>
                <span className="stat-label">Reviews</span>
              </div>
              {monitor.sentiment_score && (
                <div className="stat-box">
                  <span className="stat-value">{monitor.sentiment_score}%</span>
                  <span className="stat-label">Sentiment</span>
                </div>
              )}
            </div>
          </div>

          {!monitor.ai_competitive_analysis && (
            <div className="analyze-section">
              <button
                className="btn-analyze"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? 'Analyzing...' : '🔍 Run Competitive Analysis'}
              </button>
              <p>Analyze competitor reviews to identify strengths, weaknesses, and opportunities.</p>
            </div>
          )}

          {monitor.ai_competitive_analysis && (
            <>
              <div className="swot-grid">
                {monitor.strengths && monitor.strengths.length > 0 && (
                  <div className="swot-card strengths">
                    <h3>💪 Strengths</h3>
                    <ul>
                      {monitor.strengths.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {monitor.weaknesses && monitor.weaknesses.length > 0 && (
                  <div className="swot-card weaknesses">
                    <h3>🎯 Weaknesses</h3>
                    <ul>
                      {monitor.weaknesses.map((item, idx) => (
                        <li key={idx}>{item}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {monitor.key_differentiators && monitor.key_differentiators.length > 0 && (
                <div className="differentiators-card">
                  <h3>🏆 Key Differentiators</h3>
                  <div className="differentiators-list">
                    {monitor.key_differentiators.map((item, idx) => (
                      <span key={idx} className="differentiator-tag">{item}</span>
                    ))}
                  </div>
                </div>
              )}

              <AIOutputDisplay
                title="AI Competitive Analysis"
                type="info"
                data={{
                  analysis: monitor.ai_competitive_analysis
                }}
              />

              <div className="rerun-section">
                <button
                  className="btn-rerun"
                  onClick={handleAnalyze}
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
            <h3>Monitor Info</h3>
            <div className="info-item">
              <label>ID</label>
              <span>{monitor.id}</span>
            </div>
            <div className="info-item">
              <label>Platform</label>
              <span>{monitor.competitor_platform}</span>
            </div>
            <div className="info-item">
              <label>Status</label>
              <span className={monitor.monitoring_status}>{monitor.monitoring_status}</span>
            </div>
            <div className="info-item">
              <label>Last Analyzed</label>
              <span>{monitor.last_scraped ? new Date(monitor.last_scraped).toLocaleDateString() : 'Never'}</span>
            </div>
            <div className="info-item">
              <label>Created</label>
              <span>{new Date(monitor.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          <div className="insights-card">
            <h3>Quick Insights</h3>
            <p>
              {monitor.sentiment_score >= 70
                ? '🟢 Strong competitor with positive sentiment'
                : monitor.sentiment_score >= 50
                ? '🟡 Moderate competitor - opportunities exist'
                : '🔴 Struggling competitor - potential to capture market share'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CompetitorDetail;
