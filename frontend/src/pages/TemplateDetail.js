import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import './TemplateDetail.css';

const TemplateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    fetchTemplate();
  }, [id]);

  const fetchTemplate = async () => {
    try {
      const response = await api.get(`/templates/${id}`);
      setTemplate(response.data);
      setEditData(response.data);
    } catch (error) {
      console.error('Error fetching template:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdate = async () => {
    try {
      await api.put(`/templates/${id}`, editData);
      setTemplate({ ...template, ...editData });
      setIsEditing(false);
    } catch (error) {
      console.error('Error updating template:', error);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/templates/${id}`);
      navigate('/templates');
    } catch (error) {
      console.error('Error deleting template:', error);
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      positive: '😊',
      negative: '😔',
      neutral: '😐',
      apology: '🙏',
      thank_you: '🙌'
    };
    return icons[category] || '📝';
  };

  if (loading) {
    return <div className="loading">Loading template...</div>;
  }

  if (!template) {
    return <div className="error">Template not found</div>;
  }

  return (
    <div className="template-detail detail-page">
      <div className="detail-header">
        <div>
          <button className="btn btn-secondary btn-small" onClick={() => navigate('/templates')}>
            ← Back to Templates
          </button>
          <h1>Template Details</h1>
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

      <div className="card detail-section">
        <div className="template-info">
          <div className="template-header-info">
            <span className="template-icon-large">{getCategoryIcon(template.category)}</span>
            <div>
              <h2>{template.name}</h2>
              <div className="template-meta">
                <span className={`badge badge-${template.category}`}>{template.category}</span>
                <span className="template-tone-badge">{template.tone}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="template-stats">
          <div className="stat-item">
            <span className="stat-label">Times Used</span>
            <span className="stat-value">{template.use_count}</span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Status</span>
            <span className={`stat-value ${template.is_active ? 'active' : 'inactive'}`}>
              {template.is_active ? 'Active' : 'Inactive'}
            </span>
          </div>
          <div className="stat-item">
            <span className="stat-label">Created</span>
            <span className="stat-value">{new Date(template.created_at).toLocaleDateString()}</span>
          </div>
        </div>

        <div className="template-content-section">
          <h3>Template Content</h3>
          <div className="content-box">
            {template.content}
          </div>
        </div>

        <div className="template-preview-section">
          <h3>Preview (with sample data)</h3>
          <div className="preview-box">
            {template.content
              .replace('{reviewer_name}', 'John Smith')
              .replace('{rating}', '5')
              .replace('{business_name}', 'Your Business')
              .replace('{highlight}', 'our excellent service')
              .replace('{offer}', 'a complimentary meal')
              .replace('{contact}', 'manager@business.com')
              .replace('{email}', 'owner@business.com')
              .replace('{occasion}', 'anniversary')
              .replace('{positive_aspects}', 'the food quality')}
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      {isEditing && (
        <div className="modal-overlay" onClick={() => setIsEditing(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Edit Template</h2>
              <button className="modal-close" onClick={() => setIsEditing(false)}>×</button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); handleUpdate(); }}>
              <div className="form-group">
                <label>Template Name</label>
                <input
                  type="text"
                  value={editData.name}
                  onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={editData.category}
                    onChange={(e) => setEditData({ ...editData, category: e.target.value })}
                  >
                    <option value="positive">Positive</option>
                    <option value="negative">Negative</option>
                    <option value="neutral">Neutral</option>
                    <option value="apology">Apology</option>
                    <option value="thank_you">Thank You</option>
                  </select>
                </div>
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
              </div>
              <div className="form-group">
                <label>Status</label>
                <select
                  value={editData.is_active}
                  onChange={(e) => setEditData({ ...editData, is_active: e.target.value === 'true' })}
                >
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="form-group">
                <label>Template Content</label>
                <textarea
                  value={editData.content}
                  onChange={(e) => setEditData({ ...editData, content: e.target.value })}
                  rows={6}
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
              <h2>Delete Template</h2>
              <button className="modal-close" onClick={() => setShowDeleteConfirm(false)}>×</button>
            </div>
            <p>Are you sure you want to delete this template? This action cannot be undone.</p>
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

export default TemplateDetail;
