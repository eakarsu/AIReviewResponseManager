import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './DraftDetail.css';

const DraftDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [draft, setDraft] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchDraft();
  }, [id]);

  const fetchDraft = async () => {
    try {
      const response = await api.get(`/drafts/${id}`);
      setDraft(response.data);
      setEditData(response.data);
    } catch (error) {
      console.error('Error fetching draft:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await api.put(`/drafts/${id}`, editData);
      setDraft({ ...draft, ...editData });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating draft:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/drafts/${id}`);
      navigate('/drafts');
    } catch (error) {
      console.error('Error deleting draft:', error);
    }
  };

  const handleApprove = async () => {
    try {
      await api.post(`/drafts/${id}/approve`);
      fetchDraft();
    } catch (error) {
      console.error('Error approving draft:', error);
    }
  };

  const handleSend = async () => {
    try {
      await api.post(`/drafts/${id}/send`);
      fetchDraft();
    } catch (error) {
      console.error('Error sending draft:', error);
    }
  };

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  if (loading) {
    return <div className="loading">Loading draft...</div>;
  }

  if (!draft) {
    return <div className="error">Draft not found</div>;
  }

  return (
    <div className="draft-detail detail-page">
      <div className="detail-header">
        <div>
          <button className="btn btn-secondary btn-small" onClick={() => navigate('/drafts')}>
            ← Back to Drafts
          </button>
          <h1>Draft Details</h1>
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

      {/* Draft Status Card */}
      <div className="card detail-section">
        <div className="draft-status-header">
          <div className="status-badges">
            <span className={`badge ${draft.is_approved ? 'badge-positive' : 'badge-pending'}`}>
              {draft.is_approved ? 'Approved' : 'Pending Approval'}
            </span>
            <span className={`badge ${draft.is_sent ? 'badge-responded' : 'badge-neutral'}`}>
              {draft.is_sent ? 'Sent' : 'Not Sent'}
            </span>
            <span className="tone-badge">{draft.tone}</span>
          </div>
          <div className="action-buttons">
            {!draft.is_approved && (
              <button className="btn btn-success" onClick={handleApprove}>
                Approve Draft
              </button>
            )}
            {draft.is_approved && !draft.is_sent && (
              <button className="btn btn-primary" onClick={handleSend}>
                Send Response
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Original Review */}
      <div className="card detail-section">
        <h3>Original Review</h3>
        <div className="original-review">
          <div className="review-meta">
            <span className="reviewer">{draft.reviewer_name}</span>
            <span className={`badge badge-${draft.platform}`}>{draft.platform}</span>
            <span className="stars">{renderStars(draft.rating)}</span>
          </div>
          <div className="review-content">
            {draft.review_text}
          </div>
        </div>
        <button
          className="btn btn-secondary btn-small"
          onClick={() => navigate(`/reviews/${draft.review_id}`)}
        >
          View Full Review
        </button>
      </div>

      {/* Draft Response */}
      <div className="card detail-section">
        <h3>Draft Response</h3>
        <div className="draft-content">
          {draft.draft_text}
        </div>
        <div className="draft-meta">
          <span>Created: {new Date(draft.created_at).toLocaleString()}</span>
          {draft.updated_at !== draft.created_at && (
            <span>Updated: {new Date(draft.updated_at).toLocaleString()}</span>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Draft</h2>
              <button className="modal-close" onClick={() => setIsEditing(false)}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
              <div className="form-group">
                <label>Tone</label>
                <select
                  value={editData.tone}
                  onChange={(e) => setEditData({ ...editData, tone: e.target.value })}
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="apologetic">Apologetic</option>
                  <option value="grateful">Grateful</option>
                </select>
              </div>
              <div className="form-group">
                <label>Response Draft</label>
                <textarea
                  value={editData.draft_text}
                  onChange={(e) => setEditData({ ...editData, draft_text: e.target.value })}
                  rows={8}
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
              <h2>Delete Draft</h2>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>×</button>
            </div>
            <p>Are you sure you want to delete this draft?</p>
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

export default DraftDetail;
