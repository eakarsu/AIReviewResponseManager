import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AIOutputDisplay from '../components/AIOutputDisplay';
import './PersonalizerDetail.css';

const PersonalizerDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [response, setResponse] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    fetchResponse();
  }, [id]);

  const fetchResponse = async () => {
    try {
      const res = await api.get(`/personalizer/${id}`);
      setResponse(res.data);
    } catch (error) {
      console.error('Error fetching response:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const res = await api.post(`/personalizer/${id}/analyze`);
      setResponse(res.data);
    } catch (error) {
      console.error('Error generating response:', error);
      alert('Failed to generate personalized response. Please try again.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApprove = async () => {
    try {
      await api.put(`/personalizer/${id}`, { status: 'approved' });
      fetchResponse();
    } catch (error) {
      console.error('Error approving response:', error);
    }
  };

  const handleDelete = async () => {
    if (window.confirm('Are you sure you want to delete this response?')) {
      try {
        await api.delete(`/personalizer/${id}`);
        navigate('/personalizer');
      } catch (error) {
        console.error('Error deleting response:', error);
      }
    }
  };

  const getSentimentStyle = (sentiment) => {
    const styles = {
      positive: { bg: '#dcfce7', color: '#166534', icon: '😊' },
      neutral: { bg: '#e0e7ff', color: '#4338ca', icon: '😐' },
      negative: { bg: '#fee2e2', color: '#991b1b', icon: '😞' }
    };
    return styles[sentiment?.toLowerCase()] || styles.neutral;
  };

  const getToneIcon = (tone) => {
    const icons = {
      professional: '👔',
      friendly: '😊',
      apologetic: '🙏',
      grateful: '💝'
    };
    return icons[tone?.toLowerCase()] || '📝';
  };

  if (loading) {
    return <div className="loading">Loading...</div>;
  }

  if (!response) {
    return <div className="not-found">Response not found</div>;
  }

  return (
    <div className="personalizer-detail">
      <div className="detail-header">
        <button className="btn-back" onClick={() => navigate('/personalizer')}>
          ← Back to Responses
        </button>
        <div className="header-actions">
          {response.status === 'generated' && (
            <button className="btn-approve" onClick={handleApprove}>
              ✓ Approve Response
            </button>
          )}
          <button className="btn-delete" onClick={handleDelete}>Delete</button>
        </div>
      </div>

      <div className="detail-content">
        <div className="main-section">
          <div className="reviewer-card">
            <div className="reviewer-header">
              <h1>{response.reviewer_name}</h1>
              <span
                className="sentiment-badge"
                style={{
                  backgroundColor: getSentimentStyle(response.review_sentiment).bg,
                  color: getSentimentStyle(response.review_sentiment).color
                }}
              >
                {getSentimentStyle(response.review_sentiment).icon} {response.review_sentiment}
              </span>
            </div>

            {response.reviewer_profile && (
              <div className="profile-info">
                <h3>Reviewer Profile</h3>
                <AIOutputDisplay data={response.reviewer_profile} />
              </div>
            )}
          </div>

          <div className="review-section">
            <h3>Original Review</h3>
            <blockquote>"{response.original_review}"</blockquote>
          </div>

          {!response.generated_response && (
            <div className="generate-section">
              <button
                className="btn-generate"
                onClick={handleGenerate}
                disabled={generating}
              >
                {generating ? 'Generating...' : '✨ Generate Personalized Response'}
              </button>
              <p>AI will analyze the reviewer profile to create a highly personalized response.</p>
            </div>
          )}

          {response.generated_response && (
            <>
              <div className="response-section">
                <div className="response-header">
                  <h3>Generated Response</h3>
                  <span className="tone-badge">
                    {getToneIcon(response.tone)} {response.tone}
                  </span>
                </div>
                <div className="response-text">
                  "{response.generated_response}"
                </div>
              </div>

              {response.personalization_factors && response.personalization_factors.length > 0 && (
                <div className="factors-section">
                  <h3>Personalization Factors Used</h3>
                  <div className="factors-list">
                    {response.personalization_factors.map((factor, idx) => (
                      <span key={idx} className="factor-tag">{factor}</span>
                    ))}
                  </div>
                </div>
              )}

              {response.ai_reasoning && (
                <AIOutputDisplay
                  title="AI Reasoning"
                  type="info"
                  data={{
                    reasoning: response.ai_reasoning
                  }}
                />
              )}

              <div className="regenerate-section">
                <button
                  className="btn-regenerate"
                  onClick={handleGenerate}
                  disabled={generating}
                >
                  {generating ? 'Regenerating...' : '🔄 Regenerate Response'}
                </button>
              </div>
            </>
          )}
        </div>

        <div className="sidebar">
          <div className="info-card">
            <h3>Response Info</h3>
            <div className="info-item">
              <label>ID</label>
              <span>{response.id}</span>
            </div>
            <div className="info-item">
              <label>Status</label>
              <span className={`status-${response.status}`}>{response.status}</span>
            </div>
            <div className="info-item">
              <label>Created</label>
              <span>{new Date(response.created_at).toLocaleDateString()}</span>
            </div>
          </div>

          {response.personalization_score && (
            <div className="score-card">
              <h3>Personalization Score</h3>
              <div className="score-circle" style={{ '--score': response.personalization_score }}>
                <span className="score-value">{response.personalization_score}%</span>
              </div>
              <p className="score-description">
                {response.personalization_score >= 90
                  ? 'Highly personalized response'
                  : response.personalization_score >= 70
                  ? 'Well personalized response'
                  : 'Moderately personalized'}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PersonalizerDetail;
