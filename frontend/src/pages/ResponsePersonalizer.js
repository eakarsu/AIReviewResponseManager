import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import SortControls from '../components/SortControls';
import BulkActions from '../components/BulkActions';
import { SkeletonCard } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import './ResponsePersonalizer.css';

const ResponsePersonalizer = () => {
  const navigate = useNavigate();
  const [responses, setResponses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ status: '', tone: '' });
  const [formData, setFormData] = useState({
    reviewer_name: '',
    original_review: '',
    review_sentiment: 'neutral'
  });
  const toast = useToast();

  useEffect(() => {
    fetchResponses();
  }, [filters, search, sortBy, sortOrder]);

  const fetchResponses = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (search) params.append('search', search);
      if (sortBy) { params.append('sortBy', sortBy); params.append('sortOrder', sortOrder); }
      if (filters.status) params.append('status', filters.status);
      if (filters.tone) params.append('tone', filters.tone);

      const response = await api.get(`/personalizer?${params}`);
      setResponses(response.data.data || response.data);
      setPagination(response.data.pagination || null);
    } catch (error) {
      console.error('Error fetching responses:', error);
      toast.error('Failed to load responses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/personalizer', formData);
      setShowModal(false);
      setFormData({ reviewer_name: '', original_review: '', review_sentiment: 'neutral' });
      fetchResponses();
      toast.success('Response created successfully');
    } catch (error) {
      console.error('Error creating response:', error);
      toast.error('Failed to create response');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this response?')) {
      try {
        await api.delete(`/personalizer/${id}`);
        fetchResponses();
        toast.success('Response deleted');
      } catch (error) {
        console.error('Error deleting response:', error);
        toast.error('Failed to delete response');
      }
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/personalizer/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'personalizer.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('CSV exported successfully');
    } catch (error) {
      toast.error('Failed to export CSV');
    }
  };

  const handleExportPDF = async () => {
    try {
      const response = await api.get('/personalizer/export/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'personalizer.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} response(s)?`)) {
      try {
        await api.post('/personalizer/bulk-delete', { ids: selectedIds });
        toast.success(`${selectedIds.length} response(s) deleted`);
        setSelectedIds([]);
        fetchResponses();
      } catch (error) {
        toast.error('Failed to delete responses');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      await api.put('/personalizer/bulk-update', { ids: selectedIds, updates });
      toast.success(`${selectedIds.length} response(s) updated`);
      setSelectedIds([]);
      fetchResponses();
    } catch (error) {
      toast.error('Failed to update responses');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const getSentimentStyle = (sentiment) => {
    const styles = {
      positive: { bg: '#dcfce7', color: '#166534', icon: '😊' },
      neutral: { bg: '#e0e7ff', color: '#4338ca', icon: '😐' },
      negative: { bg: '#fee2e2', color: '#991b1b', icon: '😞' }
    };
    return styles[sentiment?.toLowerCase()] || styles.neutral;
  };

  const getStatusStyle = (status) => {
    const styles = {
      draft: { bg: '#f1f5f9', color: '#475569' },
      generated: { bg: '#dbeafe', color: '#1e40af' },
      approved: { bg: '#dcfce7', color: '#166534' },
      pending: { bg: '#fef3c7', color: '#92400e' }
    };
    return styles[status?.toLowerCase()] || styles.draft;
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

  return (
    <div className="response-personalizer">
      <div className="page-header">
        <div>
          <h1>AI Response Personalizer</h1>
          <p>Create highly personalized responses based on reviewer profiles</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>Export CSV</button>
          <button className="btn btn-secondary" onClick={handleExportPDF}>Export PDF</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + New Response
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <SearchBar onSearch={setSearch} placeholder="Search responses..." />
        <SortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
          options={[
            { value: 'reviewer_name', label: 'Reviewer' },
            { value: 'created_at', label: 'Date' },
            { value: 'personalization_score', label: 'Score' }
          ]}
        />
      </div>

      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="draft">Draft</option>
          <option value="generated">Generated</option>
          <option value="approved">Approved</option>
        </select>
        <select
          value={filters.tone}
          onChange={(e) => setFilters({ ...filters, tone: e.target.value })}
        >
          <option value="">All Tones</option>
          <option value="professional">Professional</option>
          <option value="friendly">Friendly</option>
          <option value="apologetic">Apologetic</option>
          <option value="grateful">Grateful</option>
        </select>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalItems={responses.length}
        onSelectAll={() => setSelectedIds(responses.map(r => r.id))}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={handleBulkDelete}
        onBulkUpdate={handleBulkUpdate}
        updateOptions={[
          { value: 'status_approved', label: 'Approve All', updates: { status: 'approved' } },
          { value: 'status_draft', label: 'Set Draft', updates: { status: 'draft' } }
        ]}
      />

      {loading ? (
        <SkeletonCard count={6} />
      ) : responses.length > 0 ? (
        <div className="responses-grid">
          {responses.map((response) => (
            <div
              key={response.id}
              className="response-card"
              onClick={() => navigate(`/personalizer/${response.id}`)}
              style={{ position: 'relative' }}
            >
              <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(response.id)}
                  onChange={() => toggleSelect(response.id)}
                />
              </div>
              <div className="card-header">
                <div className="reviewer-info">
                  <h3>{response.reviewer_name}</h3>
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
                <span
                  className="status-badge"
                  style={{
                    backgroundColor: getStatusStyle(response.status).bg,
                    color: getStatusStyle(response.status).color
                  }}
                >
                  {response.status}
                </span>
              </div>

              <div className="original-review">
                <span className="label">Original Review:</span>
                <p>"{response.original_review?.substring(0, 100)}..."</p>
              </div>

              {response.generated_response && (
                <div className="generated-response">
                  <span className="label">
                    {getToneIcon(response.tone)} Generated Response:
                  </span>
                  <p>"{response.generated_response?.substring(0, 100)}..."</p>
                </div>
              )}

              {response.personalization_score && (
                <div className="score-bar-container">
                  <span className="label">Personalization Score</span>
                  <div className="score-bar">
                    <div
                      className="score-fill"
                      style={{ width: `${response.personalization_score}%` }}
                    ></div>
                    <span>{response.personalization_score}%</span>
                  </div>
                </div>
              )}

              <div className="card-footer">
                <span className="created-date">
                  {new Date(response.created_at).toLocaleDateString()}
                </span>
                <button className="btn-delete" onClick={(e) => handleDelete(response.id, e)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">No personalized responses found. Create one to get started.</div>
      )}

      <Pagination pagination={pagination} onPageChange={(page) => fetchResponses(page)} />

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Personalized Response</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Reviewer Name *</label>
                <input
                  type="text"
                  value={formData.reviewer_name}
                  onChange={(e) => setFormData({ ...formData, reviewer_name: e.target.value })}
                  placeholder="e.g., John Smith"
                  required
                />
              </div>
              <div className="form-group">
                <label>Original Review *</label>
                <textarea
                  value={formData.original_review}
                  onChange={(e) => setFormData({ ...formData, original_review: e.target.value })}
                  placeholder="Paste the original review here..."
                  rows={4}
                  required
                />
              </div>
              <div className="form-group">
                <label>Review Sentiment</label>
                <select
                  value={formData.review_sentiment}
                  onChange={(e) => setFormData({ ...formData, review_sentiment: e.target.value })}
                >
                  <option value="positive">Positive</option>
                  <option value="neutral">Neutral</option>
                  <option value="negative">Negative</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Response</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ResponsePersonalizer;
