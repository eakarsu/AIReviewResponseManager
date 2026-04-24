import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import SortControls from '../components/SortControls';
import BulkActions from '../components/BulkActions';
import { SkeletonCard } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import './ReviewSummarizer.css';

const ReviewSummarizer = () => {
  const navigate = useNavigate();
  const [summaries, setSummaries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filter, setFilter] = useState('');
  const [formData, setFormData] = useState({
    product_name: '',
    product_category: '',
    total_reviews: 0,
    average_rating: 0
  });
  const toast = useToast();

  useEffect(() => {
    fetchSummaries();
  }, [filter, search, sortBy, sortOrder]);

  const fetchSummaries = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (search) params.append('search', search);
      if (sortBy) { params.append('sortBy', sortBy); params.append('sortOrder', sortOrder); }
      if (filter) params.append('product_category', filter);

      const response = await api.get(`/review-summaries?${params}`);
      setSummaries(response.data.data || response.data);
      setPagination(response.data.pagination || null);
    } catch (error) {
      console.error('Error fetching summaries:', error);
      toast.error('Failed to load summaries');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/review-summaries', formData);
      setShowModal(false);
      setFormData({ product_name: '', product_category: '', total_reviews: 0, average_rating: 0 });
      fetchSummaries();
      toast.success('Summary created successfully');
    } catch (error) {
      console.error('Error creating summary:', error);
      toast.error('Failed to create summary');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this summary?')) {
      try {
        await api.delete(`/review-summaries/${id}`);
        fetchSummaries();
        toast.success('Summary deleted');
      } catch (error) {
        console.error('Error deleting summary:', error);
        toast.error('Failed to delete summary');
      }
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/review-summaries/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'review-summaries.csv');
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
      const response = await api.get('/review-summaries/export/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'review-summaries.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} summary(ies)?`)) {
      try {
        await api.post('/review-summaries/bulk-delete', { ids: selectedIds });
        toast.success(`${selectedIds.length} summary(ies) deleted`);
        setSelectedIds([]);
        fetchSummaries();
      } catch (error) {
        toast.error('Failed to delete summaries');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      await api.put('/review-summaries/bulk-update', { ids: selectedIds, updates });
      toast.success(`${selectedIds.length} summary(ies) updated`);
      setSelectedIds([]);
      fetchSummaries();
    } catch (error) {
      toast.error('Failed to update summaries');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={`star ${i <= rating ? 'filled' : ''}`}>★</span>
      );
    }
    return stars;
  };

  const categories = [...new Set(summaries.map(s => s.product_category).filter(Boolean))];

  return (
    <div className="review-summarizer">
      <div className="page-header">
        <div>
          <h1>AI Review Summarizer</h1>
          <p>Aggregate and summarize product reviews to extract key insights</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>Export CSV</button>
          <button className="btn btn-secondary" onClick={handleExportPDF}>Export PDF</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + New Summary
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <SearchBar onSearch={setSearch} placeholder="Search summaries..." />
        <SortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
          options={[
            { value: 'product_name', label: 'Product Name' },
            { value: 'created_at', label: 'Date' },
            { value: 'average_rating', label: 'Rating' }
          ]}
        />
      </div>

      <div className="filters">
        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalItems={summaries.length}
        onSelectAll={() => setSelectedIds(summaries.map(s => s.id))}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={handleBulkDelete}
        onBulkUpdate={handleBulkUpdate}
        updateOptions={[]}
      />

      {loading ? (
        <SkeletonCard count={6} />
      ) : summaries.length > 0 ? (
        <div className="summaries-grid">
          {summaries.map((summary) => (
            <div
              key={summary.id}
              className="summary-card"
              onClick={() => navigate(`/review-summaries/${summary.id}`)}
              style={{ position: 'relative' }}
            >
              <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(summary.id)}
                  onChange={() => toggleSelect(summary.id)}
                />
              </div>
              <div className="card-header">
                <h3>{summary.product_name}</h3>
                <span className="category-badge">{summary.product_category}</span>
              </div>

              <div className="card-stats">
                <div className="stat">
                  <span className="stat-value">{summary.total_reviews || 0}</span>
                  <span className="stat-label">Reviews</span>
                </div>
                <div className="stat">
                  <div className="rating">
                    {renderStars(Math.round(summary.average_rating || 0))}
                  </div>
                  <span className="stat-label">{summary.average_rating ? Number(summary.average_rating).toFixed(1) : 'N/A'}</span>
                </div>
              </div>

              {summary.summary_text && (
                <p className="summary-excerpt">{summary.summary_text.substring(0, 150)}...</p>
              )}

              {summary.pros && summary.pros.length > 0 && (
                <div className="pros-cons">
                  <div className="pros">
                    <span className="label">👍 Pros:</span>
                    <span>{summary.pros.slice(0, 2).join(', ')}</span>
                  </div>
                </div>
              )}

              <div className="card-footer">
                <span className="last-updated">
                  Updated: {new Date(summary.last_updated || summary.updated_at).toLocaleDateString()}
                </span>
                <button className="btn-delete" onClick={(e) => handleDelete(summary.id, e)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">No summaries found. Add a product to summarize reviews.</div>
      )}

      <Pagination pagination={pagination} onPageChange={(page) => fetchSummaries(page)} />

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Product for Summary</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  placeholder="e.g., Wireless Bluetooth Headphones"
                  required
                />
              </div>
              <div className="form-group">
                <label>Product Category</label>
                <input
                  type="text"
                  value={formData.product_category}
                  onChange={(e) => setFormData({ ...formData, product_category: e.target.value })}
                  placeholder="e.g., Electronics"
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Total Reviews</label>
                  <input
                    type="number"
                    value={formData.total_reviews}
                    onChange={(e) => setFormData({ ...formData, total_reviews: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div className="form-group">
                  <label>Average Rating</label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="5"
                    value={formData.average_rating}
                    onChange={(e) => setFormData({ ...formData, average_rating: parseFloat(e.target.value) || 0 })}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Product</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewSummarizer;
