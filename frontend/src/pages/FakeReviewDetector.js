import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import SortControls from '../components/SortControls';
import BulkActions from '../components/BulkActions';
import { SkeletonTable } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import './FakeReviewDetector.css';

const FakeReviewDetector = () => {
  const navigate = useNavigate();
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ status: '', platform: '' });
  const [formData, setFormData] = useState({
    review_text: '',
    reviewer_name: '',
    platform: 'amazon'
  });
  const [analyzingId, setAnalyzingId] = useState(null);
  const toast = useToast();

  useEffect(() => {
    fetchDetections();
  }, [filters, search, sortBy, sortOrder]);

  const fetchDetections = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (search) params.append('search', search);
      if (sortBy) { params.append('sortBy', sortBy); params.append('sortOrder', sortOrder); }
      if (filters.status) params.append('status', filters.status);
      if (filters.platform) params.append('platform', filters.platform);

      const response = await api.get(`/fake-reviews?${params}`);
      setDetections(response.data.data || response.data);
      setPagination(response.data.pagination || null);
    } catch (error) {
      console.error('Error fetching detections:', error);
      toast.error('Failed to load detections');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/fake-reviews', formData);
      setShowModal(false);
      setFormData({ review_text: '', reviewer_name: '', platform: 'amazon' });
      fetchDetections();
      toast.success('Detection created successfully');
    } catch (error) {
      console.error('Error creating detection:', error);
      toast.error('Failed to create detection');
    }
  };

  const handleAnalyze = async (id, e) => {
    e.stopPropagation();
    setAnalyzingId(id);
    try {
      await api.post(`/fake-reviews/${id}/analyze`);
      fetchDetections();
      toast.success('Analysis complete');
    } catch (error) {
      console.error('Error analyzing review:', error);
      toast.error('Failed to analyze review. Please try again.');
    } finally {
      setAnalyzingId(null);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this detection?')) {
      try {
        await api.delete(`/fake-reviews/${id}`);
        fetchDetections();
        toast.success('Detection deleted');
      } catch (error) {
        console.error('Error deleting detection:', error);
        toast.error('Failed to delete detection');
      }
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/fake-reviews/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'fake-reviews.csv');
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
      const response = await api.get('/fake-reviews/export/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'fake-reviews.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} detection(s)?`)) {
      try {
        await api.post('/fake-reviews/bulk-delete', { ids: selectedIds });
        toast.success(`${selectedIds.length} detection(s) deleted`);
        setSelectedIds([]);
        fetchDetections();
      } catch (error) {
        toast.error('Failed to delete detections');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      await api.put('/fake-reviews/bulk-update', { ids: selectedIds, updates });
      toast.success(`${selectedIds.length} detection(s) updated`);
      setSelectedIds([]);
      fetchDetections();
    } catch (error) {
      toast.error('Failed to update detections');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const getRiskColor = (probability) => {
    if (!probability) return '#94a3b8';
    if (probability >= 70) return '#ef4444';
    if (probability >= 40) return '#f59e0b';
    return '#22c55e';
  };

  const getStatusBadge = (status) => {
    const styles = {
      pending: { bg: '#fef3c7', color: '#92400e' },
      analyzed: { bg: '#dbeafe', color: '#1e40af' },
      verified: { bg: '#dcfce7', color: '#166534' }
    };
    return styles[status] || styles.pending;
  };

  return (
    <div className="fake-review-detector">
      <div className="page-header">
        <div>
          <h1>AI Fake Review Detector</h1>
          <p>Detect potentially fake, spam, or fraudulent reviews using AI analysis</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>Export CSV</button>
          <button className="btn btn-secondary" onClick={handleExportPDF}>Export PDF</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + New Detection
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <SearchBar onSearch={setSearch} placeholder="Search detections..." />
        <SortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
          options={[
            { value: 'created_at', label: 'Date' },
            { value: 'fake_probability', label: 'Probability' },
            { value: 'reviewer_name', label: 'Reviewer' }
          ]}
        />
      </div>

      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="analyzed">Analyzed</option>
          <option value="verified">Verified</option>
        </select>
        <select
          value={filters.platform}
          onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
        >
          <option value="">All Platforms</option>
          <option value="amazon">Amazon</option>
          <option value="ebay">eBay</option>
          <option value="google">Google</option>
          <option value="yelp">Yelp</option>
        </select>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalItems={detections.length}
        onSelectAll={() => setSelectedIds(detections.map(d => d.id))}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={handleBulkDelete}
        onBulkUpdate={handleBulkUpdate}
        updateOptions={[
          { value: 'status_verified', label: 'Set Verified', updates: { status: 'verified' } },
          { value: 'status_analyzed', label: 'Set Analyzed', updates: { status: 'analyzed' } }
        ]}
      />

      <div className="detections-table">
        {loading ? (
          <SkeletonTable rows={5} cols={7} />
        ) : (
          <>
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === detections.length && detections.length > 0}
                      onChange={() => selectedIds.length === detections.length ? setSelectedIds([]) : setSelectedIds(detections.map(d => d.id))}
                    />
                  </th>
                  <th>Review Excerpt</th>
                  <th>Reviewer</th>
                  <th>Platform</th>
                  <th>Fake Probability</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {detections.map((detection) => (
                  <tr key={detection.id} onClick={() => navigate(`/fake-reviews/${detection.id}`)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(detection.id)}
                        onChange={() => toggleSelect(detection.id)}
                      />
                    </td>
                    <td className="review-excerpt">
                      {detection.review_text?.substring(0, 80)}...
                    </td>
                    <td>{detection.reviewer_name || 'Unknown'}</td>
                    <td>
                      <span className="platform-badge">{detection.platform}</span>
                    </td>
                    <td>
                      <div className="probability-bar">
                        <div
                          className="probability-fill"
                          style={{
                            width: `${detection.fake_probability || 0}%`,
                            backgroundColor: getRiskColor(detection.fake_probability)
                          }}
                        ></div>
                        <span>{detection.fake_probability ? `${detection.fake_probability}%` : 'N/A'}</span>
                      </div>
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getStatusBadge(detection.status).bg,
                          color: getStatusBadge(detection.status).color
                        }}
                      >
                        {detection.status}
                      </span>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="btn-analyze-sm"
                        onClick={(e) => handleAnalyze(detection.id, e)}
                        disabled={analyzingId === detection.id}
                      >
                        {analyzingId === detection.id ? 'Analyzing...' : 'Analyze'}
                      </button>
                      <button
                        className="btn-delete"
                        onClick={(e) => handleDelete(detection.id, e)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {detections.length === 0 && (
              <div className="empty-state">No detections found. Add a review to analyze.</div>
            )}
          </>
        )}
      </div>

      <Pagination pagination={pagination} onPageChange={(page) => fetchDetections(page)} />

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Review for Detection</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Review Text *</label>
                <textarea
                  value={formData.review_text}
                  onChange={(e) => setFormData({ ...formData, review_text: e.target.value })}
                  placeholder="Paste the review text to analyze..."
                  rows={5}
                  required
                />
              </div>
              <div className="form-group">
                <label>Reviewer Name</label>
                <input
                  type="text"
                  value={formData.reviewer_name}
                  onChange={(e) => setFormData({ ...formData, reviewer_name: e.target.value })}
                  placeholder="e.g., JohnDoe123"
                />
              </div>
              <div className="form-group">
                <label>Platform</label>
                <select
                  value={formData.platform}
                  onChange={(e) => setFormData({ ...formData, platform: e.target.value })}
                >
                  <option value="amazon">Amazon</option>
                  <option value="ebay">eBay</option>
                  <option value="google">Google</option>
                  <option value="yelp">Yelp</option>
                  <option value="g2">G2</option>
                </select>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Detection</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default FakeReviewDetector;
