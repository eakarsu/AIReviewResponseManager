import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './BusinessDetail.css';

const BusinessDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [business, setBusiness] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchBusinessData();
  }, [id]);

  const fetchBusinessData = async () => {
    try {
      const [businessRes, reviewsRes] = await Promise.all([
        api.get(`/businesses/${id}`),
        api.get(`/reviews?business_id=${id}`)
      ]);
      setBusiness(businessRes.data);
      setEditData(businessRes.data);
      setReviews(reviewsRes.data);
    } catch (error) {
      console.error('Error fetching business:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await api.put(`/businesses/${id}`, editData);
      setBusiness({ ...business, ...editData });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating business:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/businesses/${id}`);
      navigate('/businesses');
    } catch (error) {
      console.error('Error deleting business:', error);
    }
  };

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  if (loading) {
    return <div className="loading">Loading business...</div>;
  }

  if (!business) {
    return <div className="error">Business not found</div>;
  }

  return (
    <div className="business-detail detail-page">
      <div className="detail-header">
        <div>
          <button className="btn btn-secondary btn-small" onClick={() => navigate('/businesses')}>
            ← Back to Businesses
          </button>
          <h1>Business Details</h1>
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

      {/* Business Info Card */}
      <div className="card detail-section">
        <div className="business-info-header">
          <div className="business-icon-large">🏪</div>
          <div className="business-main-info">
            <h2>{business.name}</h2>
            <div className="business-badges">
              <span className={`badge badge-${business.platform}`}>{business.platform}</span>
              <span className="business-category-badge">{business.category}</span>
            </div>
          </div>
        </div>

        <div className="business-details-grid">
          {business.address && (
            <div className="detail-item">
              <span className="detail-label">Address</span>
              <span className="detail-value">📍 {business.address}</span>
            </div>
          )}
          {business.phone && (
            <div className="detail-item">
              <span className="detail-label">Phone</span>
              <span className="detail-value">📞 {business.phone}</span>
            </div>
          )}
          <div className="detail-item">
            <span className="detail-label">Rating</span>
            <span className="detail-value">
              <span className="stars">{renderStars(Math.round(business.rating || 0))}</span>
              {business.rating || 'N/A'}
            </span>
          </div>
          <div className="detail-item">
            <span className="detail-label">Total Reviews</span>
            <span className="detail-value">{business.review_count || 0}</span>
          </div>
        </div>

        {business.stats && (
          <div className="business-stats">
            <div className="stat-box">
              <span className="stat-number">{business.stats.total_reviews}</span>
              <span className="stat-label">Total Reviews</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{business.stats.average_rating || 'N/A'}</span>
              <span className="stat-label">Average Rating</span>
            </div>
            <div className="stat-box">
              <span className="stat-number">{business.stats.pending_reviews}</span>
              <span className="stat-label">Pending</span>
            </div>
          </div>
        )}
      </div>

      {/* Reviews for this Business */}
      <div className="card detail-section">
        <h3>Reviews ({reviews.length})</h3>
        {reviews.length > 0 ? (
          <div className="reviews-list">
            {reviews.map((review) => (
              <div
                key={review.id}
                className="review-item"
                onClick={() => navigate(`/reviews/${review.id}`)}
              >
                <div className="review-header">
                  <span className="reviewer-name">{review.reviewer_name}</span>
                  <span className="stars">{renderStars(review.rating)}</span>
                </div>
                <p className="review-text">{review.review_text.substring(0, 150)}...</p>
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
            <p>No reviews for this business yet</p>
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Business</h2>
              <button className="modal-close" onClick={() => setIsEditing(false)}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
              <div className="form-group">
                <label>Business Name</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Platform</label>
                <select
                  value={editData.platform}
                  onChange={(e) => setEditData({ ...editData, platform: e.target.value })}
                >
                  <option value="google">Google</option>
                  <option value="yelp">Yelp</option>
                </select>
              </div>
              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  value={editData.category || ''}
                  onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={editData.address || ''}
                  onChange={(e) => setEditData({ ...editData, address: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  value={editData.phone || ''}
                  onChange={(e) => setEditData({ ...editData, phone: e.target.value })}
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
              <h2>Delete Business</h2>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>×</button>
            </div>
            <p>Are you sure you want to delete this business? All associated reviews will also be deleted.</p>
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

export default BusinessDetail;
