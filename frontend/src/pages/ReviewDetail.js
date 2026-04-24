import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './ReviewDetail.css';

const ReviewDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [selectedTone, setSelectedTone] = useState('professional');
  const [aiResponse, setAiResponse] = useState('');
  const [latestDraftId, setLatestDraftId] = useState(null);
  const [sending, setSending] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchReview();
  }, [id]);

  const fetchReview = async () => {
    try {
      const response = await api.get(`/reviews/${id}`);
      setReview(response.data);
      setEditData(response.data);
    } catch (error) {
      console.error('Error fetching review:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateResponse = async () => {
    setGenerating(true);
    try {
      const response = await api.post(`/reviews/${id}/generate-response`, {
        tone: selectedTone
      });
      setAiResponse(response.data.response_text);
      setLatestDraftId(response.data.draft.id);
      fetchReview();
    } catch (error) {
      console.error('Error generating response:', error);
      alert('Failed to generate AI response. Please check your OpenRouter API key.');
    } finally {
      setGenerating(false);
    }
  };

  const handleApproveAndSend = async () => {
    if (!latestDraftId) return;
    setSending(true);
    try {
      await api.post(`/drafts/${latestDraftId}/send`);
      alert('Response sent successfully!');
      setAiResponse('');
      setLatestDraftId(null);
      fetchReview();
    } catch (error) {
      console.error('Error sending response:', error);
      alert('Failed to send response.');
    } finally {
      setSending(false);
    }
  };

  const handleEditDraft = () => {
    if (latestDraftId) {
      navigate(`/drafts/${latestDraftId}`);
    }
  };

  const handleUpdate = async () => {
    try {
      await api.put(`/reviews/${id}`, editData);
      setReview({ ...review, ...editData });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating review:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/reviews/${id}`);
      navigate('/reviews');
    } catch (error) {
      console.error('Error deleting review:', error);
    }
  };

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  if (loading) {
    return <div className="loading">Loading review...</div>;
  }

  if (!review) {
    return <div className="error">Review not found</div>;
  }

  return (
    <div className="review-detail detail-page">
      <div className="detail-header">
        <div>
          <button className="btn btn-secondary btn-small" onClick={() => navigate('/reviews')}>
            ← Back to Reviews
          </button>
          <h1>Review Details</h1>
        </div>
        <div className="detail-actions">
          <button className="btn btn-secondary" onClick={() => setIsEditing(true)}>
            Edit
          </button>
          <button className="btn btn-danger" onClick={() => setShowDeleteConfirm(true)}>
            Delete
          </button>
        </div>
      </div>

      {/* Review Info Card */}
      <div className="card detail-section">
        <div className="review-info">
          <div className="review-meta">
            <span className={`badge badge-${review.platform}`}>{review.platform}</span>
            <span className={`badge badge-${review.response_status}`}>{review.response_status}</span>
            {review.sentiment && (
              <span className={`badge badge-${review.sentiment}`}>{review.sentiment}</span>
            )}
          </div>
          <h2 className="reviewer">{review.reviewer_name}</h2>
          <div className="rating">
            <span className="stars large">{renderStars(review.rating)}</span>
            <span className="rating-text">{review.rating}/5 stars</span>
          </div>
          <p className="date">
            Reviewed on {new Date(review.review_date).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </p>
        </div>
        <div className="review-content">
          <h3>Review Text</h3>
          <p>{review.review_text}</p>
        </div>
        {review.keywords && review.keywords.length > 0 && (
          <div className="review-keywords">
            <h3>Keywords</h3>
            <div className="keywords-list">
              {review.keywords.map((keyword, index) => (
                <span key={index} className="keyword-tag">{keyword}</span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* AI Response Generator */}
      <div className="card detail-section">
        <h3>Generate AI Response</h3>
        <div className="generator-controls">
          <div className="tone-selector">
            <label>Response Tone:</label>
            <select value={selectedTone} onChange={(e) => setSelectedTone(e.target.value)}>
              <option value="professional">Professional</option>
              <option value="friendly">Friendly</option>
              <option value="apologetic">Apologetic</option>
              <option value="grateful">Grateful</option>
            </select>
          </div>
          <button
            className="btn btn-primary"
            onClick={handleGenerateResponse}
            disabled={generating}
          >
            {generating ? 'Generating...' : 'Generate AI Response'}
          </button>
        </div>
        {aiResponse && (
          <div className="ai-response">
            <h4>Generated Response:</h4>
            <div className="response-text">{aiResponse}</div>
            <div className="response-actions">
              <button
                className="btn btn-success btn-small"
                onClick={handleApproveAndSend}
                disabled={sending}
              >
                {sending ? 'Sending...' : 'Approve & Send'}
              </button>
              <button className="btn btn-secondary btn-small" onClick={handleEditDraft}>
                Edit Draft
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Existing Drafts */}
      {review.drafts && review.drafts.length > 0 && (
        <div className="card detail-section">
          <h3>Response Drafts</h3>
          <div className="drafts-list">
            {review.drafts.map((draft) => (
              <div key={draft.id} className="draft-item">
                <div className="draft-meta">
                  <span className="draft-tone">{draft.tone}</span>
                  <span className="draft-status">
                    {draft.is_sent ? 'Sent' : draft.is_approved ? 'Approved' : 'Draft'}
                  </span>
                </div>
                <p className="draft-text">{draft.draft_text}</p>
                <span className="draft-date">
                  Created: {new Date(draft.created_at).toLocaleDateString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Review</h2>
              <button className="modal-close" onClick={() => setIsEditing(false)}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
              <div className="form-group">
                <label>Reviewer Name</label>
                <input
                  type="text"
                  value={editData.reviewer_name}
                  onChange={(e) => setEditData({ ...editData, reviewer_name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Rating</label>
                <select
                  value={editData.rating}
                  onChange={(e) => setEditData({ ...editData, rating: parseInt(e.target.value) })}
                >
                  {[5, 4, 3, 2, 1].map((r) => (
                    <option key={r} value={r}>{r} Stars</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={editData.response_status}
                  onChange={(e) => setEditData({ ...editData, response_status: e.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="draft">Draft</option>
                  <option value="responded">Responded</option>
                  <option value="ignored">Ignored</option>
                </select>
              </div>
              <div className="form-group">
                <label>Review Text</label>
                <textarea
                  value={editData.review_text}
                  onChange={(e) => setEditData({ ...editData, review_text: e.target.value })}
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setIsEditing(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteConfirm(false)}>
          <div className="modal modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete Review</h2>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>×</button>
            </div>
            <p>Are you sure you want to delete this review? This action cannot be undone.</p>
            <div className="modal-actions">
              <button className="btn btn-secondary" onClick={() => setShowDeleteConfirm(false)}>
                Cancel
              </button>
              <button className="btn btn-danger" onClick={handleDelete}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewDetail;
