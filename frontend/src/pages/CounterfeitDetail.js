import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AIOutputDisplay from '../components/AIOutputDisplay';
import './CounterfeitDetail.css';

const CounterfeitDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [detection, setDetection] = useState(null);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    fetchDetection();
  }, [id]);

  const fetchDetection = async () => {
    try {
      const response = await api.get(`/counterfeit/${id}`);
      setDetection(response.data);
    } catch (error) {
      console.error('Error fetching detection:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const response = await api.post(`/counterfeit/${id}/analyze`);
      setDetection(response.data);
    } catch (error) {
      console.error('Error analyzing:', error);
      alert('Failed to analyze. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleUpdateStatus = async (newStatus, action = null) => {
    try {
      await api.put(`/counterfeit/${id}`, {
        status: newStatus,
        action_taken: action
      });
      fetchDetection();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this detection?')) {
      try {
        await api.delete(`/counterfeit/${id}`);
        navigate('/counterfeit');
      } catch (error) {
        console.error('Error deleting:', error);
      }
    }
  };

  const getRiskStyle = (level) => {
    const styles = {
      low: { bg: '#dcfce7', color: '#166534' },
      medium: { bg: '#fef3c7', color: '#92400e' },
      high: { bg: '#fee2e2', color: '#991b1b' },
      critical: { bg: '#7c2d12', color: '#fff' }
    };
    return styles[level?.toLowerCase()] || { bg: '#f1f5f9', color: '#475569' };
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!detection) {
    return <div className="not-found">Detection not found</div>;
  }

  return (
    <div className="counterfeit-detail">
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate('/counterfeit')}>
          ← Back to Detections
        </button>
        <div className="header-actions">
          <button className="btn-delete" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="detail-content">
        <div className="main-section">
          <div className="product-card">
            <h1>{detection.product_name}</h1>
            <div className="product-meta">
              <span>🏪 Seller: {detection.seller_name || 'Unknown'}</span>
              <span>🛒 Platform: {detection.platform}</span>
              <span>📝 Reviews: {detection.review_count || 0}</span>
            </div>
          </div>

          {!detection.risk_level && (
            <div className="analyze-section">
              <button
                className="btn-analyze"
                onClick={handleAnalyze}
                disabled={analyzing}
              >
                {analyzing ? 'Analyzing...' : '🔍 Run Counterfeit Analysis'}
              </button>
              <p>Analyze product reviews for signs of counterfeit goods.</p>
            </div>
          )}

          {detection.risk_level && (
            <>
              <div className="risk-overview">
                <div
                  className="risk-card"
                  style={{
                    backgroundColor: getRiskStyle(detection.risk_level).bg,
                    color: getRiskStyle(detection.risk_level).color
                  }}
                >
                  <div className="risk-score-display">
                    <span className="score">{detection.risk_score}%</span>
                    <span className="label">Risk Score</span>
                  </div>
                  <div className="risk-level-display">
                    <span className="level">{detection.risk_level?.toUpperCase()}</span>
                    <span className="label">Risk Level</span>
                  </div>
                </div>
              </div>

              {detection.warning_signs && detection.warning_signs.length > 0 && (
                <div className="warning-section">
                  <h3>⚠️ Warning Signs Detected</h3>
                  <ul>
                    {detection.warning_signs.map((sign, idx) => (
                      <li key={idx}>{sign}</li>
                    ))}
                  </ul>
                </div>
              )}

              {detection.suspicious_reviews && detection.suspicious_reviews.length > 0 && (
                <div className="suspicious-reviews">
                  <h3>🔎 Suspicious Review Excerpts</h3>
                  {detection.suspicious_reviews.map((review, idx) => (
                    <blockquote key={idx}>"{review}"</blockquote>
                  ))}
                </div>
              )}

              {detection.ai_analysis && (
                <AIOutputDisplay
                  title="AI Counterfeit Analysis"
                  type={detection.risk_level === 'critical' ? 'danger' : detection.risk_level === 'high' ? 'warning' : 'info'}
                  data={{
                    analysis: detection.ai_analysis
                  }}
                />
              )}

              <div className="actions-section">
                <h3>Take Action</h3>
                <div className="action-buttons">
                  <button
                    className="btn-action flag"
                    onClick={() => handleUpdateStatus('flagged', 'Flagged for review')}
                  >
                    🚩 Flag for Review
                  </button>
                  <button
                    className="btn-action escalate"
                    onClick={() => handleUpdateStatus('escalated', 'Escalated to brand/marketplace')}
                  >
                    🚨 Escalate
                  </button>
                  <button
                    className="btn-action verify"
                    onClick={() => handleUpdateStatus('verified', 'Verified as authentic')}
                  >
                    ✓ Mark Verified
                  </button>
                </div>
              </div>

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
            <h3>Detection Info</h3>
            <div className="info-item">
              <label>ID</label>
              <span>{detection.id}</span>
            </div>
            <div className="info-item">
              <label>Status</label>
              <span className={`status-${detection.status}`}>{detection.status}</span>
            </div>
            <div className="info-item">
              <label>Created</label>
              <span>{new Date(detection.created_at).toLocaleDateString()}</span>
            </div>
            {detection.action_taken && (
              <div className="info-item">
                <label>Action Taken</label>
                <span>{detection.action_taken}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default CounterfeitDetail;
