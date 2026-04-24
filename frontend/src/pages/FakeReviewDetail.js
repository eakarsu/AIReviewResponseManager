import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AIOutputDisplay from '../components/AIOutputDisplay';
import './FakeReviewDetail.css';

const FakeReviewDetail = () => {
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
      const response = await api.get(`/fake-reviews/${id}`);
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
      const response = await api.post(`/fake-reviews/${id}/analyze`);
      setDetection(response.data);
    } catch (error) {
      console.error('Error analyzing review:', error);
      alert('Failed to analyze review. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleVerify = async (isFake) => {
    try {
      await api.put(`/fake-reviews/${id}`, {
        status: 'verified',
        is_fake: isFake,
        verified_by: 'Admin User'
      });
      fetchDetection();
    } catch (error) {
      console.error('Error verifying detection:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this detection?')) {
      try {
        await api.delete(`/fake-reviews/${id}`);
        navigate('/fake-reviews');
      } catch (error) {
        console.error('Error deleting detection:', error);
      }
    }
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!detection) {
    return <div className="not-found">Detection not found</div>;
  }

  const getRiskType = (probability) => {
    if (!probability) return 'default';
    if (probability >= 70) return 'danger';
    if (probability >= 40) return 'warning';
    return 'success';
  };

  return (
    <div className="fake-review-detail">
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate('/fake-reviews')}>
          ← Back to Detections
        </button>
        <div className="header-actions">
          <button className="btn-delete" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="detail-content">
        <div className="main-section">
          <div className="review-card">
            <h2>Review Under Analysis</h2>
            <div className="review-meta">
              <span className="meta-item">
                <strong>Reviewer:</strong> {detection.reviewer_name || 'Unknown'}
              </span>
              <span className="meta-item">
                <strong>Platform:</strong> {detection.platform}
              </span>
              <span className={`status-badge status-${detection.status}`}>
                {detection.status}
              </span>
            </div>
            <div className="review-text">
              "{detection.review_text}"
            </div>
          </div>

          <div className="analyze-section">
            <button
              className="btn-analyze"
              onClick={handleAnalyze}
              disabled={analyzing}
            >
              {analyzing ? 'Analyzing...' : detection.status === 'pending' ? '🔍 Run AI Analysis' : '🔍 Re-analyze'}
            </button>
            <p>{detection.status === 'pending' ? 'Click to analyze this review for signs of being fake or spam.' : 'Run the AI analysis again to get updated results.'}</p>
          </div>

          {detection.ai_analysis && (
            <AIOutputDisplay
              title="AI Fake Detection Analysis"
              type={getRiskType(detection.fake_probability)}
              data={{
                fake_probability: detection.fake_probability,
                confidence_score: detection.confidence_score,
                red_flags: detection.red_flags,
                analysis: detection.ai_analysis
              }}
            />
          )}

          {detection.status === 'analyzed' && (
            <div className="verification-section">
              <h3>Manual Verification</h3>
              <p>Based on the AI analysis, verify whether this review is fake:</p>
              <div className="verification-buttons">
                <button
                  className="btn-verify btn-fake"
                  onClick={() => handleVerify(true)}
                >
                  ❌ Confirm Fake
                </button>
                <button
                  className="btn-verify btn-genuine"
                  onClick={() => handleVerify(false)}
                >
                  ✓ Mark as Genuine
                </button>
              </div>
            </div>
          )}

          {detection.status === 'verified' && (
            <div className={`verdict-card ${detection.is_fake ? 'verdict-fake' : 'verdict-genuine'}`}>
              <h3>Verification Result</h3>
              <div className="verdict">
                {detection.is_fake ? (
                  <>
                    <span className="verdict-icon">❌</span>
                    <span>Confirmed FAKE Review</span>
                  </>
                ) : (
                  <>
                    <span className="verdict-icon">✓</span>
                    <span>Verified as GENUINE</span>
                  </>
                )}
              </div>
              <p className="verified-by">Verified by: {detection.verified_by}</p>
            </div>
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
              <label>Created</label>
              <span>{new Date(detection.created_at).toLocaleDateString()}</span>
            </div>
            <div className="info-item">
              <label>Updated</label>
              <span>{new Date(detection.updated_at).toLocaleDateString()}</span>
            </div>
          </div>

          {detection.fake_probability !== null && (
            <div className="score-card">
              <h3>Risk Score</h3>
              <div className="score-circle" style={{ '--score': detection.fake_probability }}>
                <span className="score-value">{detection.fake_probability}%</span>
                <span className="score-label">Fake Probability</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FakeReviewDetail;
