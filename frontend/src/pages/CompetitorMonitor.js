import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import SortControls from '../components/SortControls';
import BulkActions from '../components/BulkActions';
import { SkeletonCard } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import './CompetitorMonitor.css';

const CompetitorMonitor = () => {
  const navigate = useNavigate();
  const [monitors, setMonitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ monitoring_status: '', business_category: '' });
  const [formData, setFormData] = useState({
    competitor_name: '',
    competitor_platform: 'google',
    business_category: ''
  });
  const toast = useToast();

  useEffect(() => {
    fetchMonitors();
  }, [filters, search, sortBy, sortOrder]);

  const fetchMonitors = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (search) params.append('search', search);
      if (sortBy) { params.append('sortBy', sortBy); params.append('sortOrder', sortOrder); }
      if (filters.monitoring_status) params.append('monitoring_status', filters.monitoring_status);
      if (filters.business_category) params.append('business_category', filters.business_category);

      const response = await api.get(`/competitors?${params}`);
      setMonitors(response.data.data || response.data);
      setPagination(response.data.pagination || null);
    } catch (error) {
      console.error('Error fetching monitors:', error);
      toast.error('Failed to load monitors');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/competitors', formData);
      setShowModal(false);
      setFormData({ competitor_name: '', competitor_platform: 'google', business_category: '' });
      fetchMonitors();
      toast.success('Competitor added successfully');
    } catch (error) {
      console.error('Error creating monitor:', error);
      toast.error('Failed to add competitor');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this monitor?')) {
      try {
        await api.delete(`/competitors/${id}`);
        fetchMonitors();
        toast.success('Monitor deleted');
      } catch (error) {
        console.error('Error deleting monitor:', error);
        toast.error('Failed to delete monitor');
      }
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/competitors/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'competitors.csv');
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
      const response = await api.get('/competitors/export/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'competitors.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} monitor(s)?`)) {
      try {
        await api.post('/competitors/bulk-delete', { ids: selectedIds });
        toast.success(`${selectedIds.length} monitor(s) deleted`);
        setSelectedIds([]);
        fetchMonitors();
      } catch (error) {
        toast.error('Failed to delete monitors');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      await api.put('/competitors/bulk-update', { ids: selectedIds, updates });
      toast.success(`${selectedIds.length} monitor(s) updated`);
      setSelectedIds([]);
      fetchMonitors();
    } catch (error) {
      toast.error('Failed to update monitors');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        <span key={i} className={`star ${i <= Math.round(rating || 0) ? 'filled' : ''}`}>★</span>
      );
    }
    return stars;
  };

  const categories = [...new Set(monitors.map(m => m.business_category).filter(Boolean))];

  return (
    <div className="competitor-monitor">
      <div className="page-header">
        <div>
          <h1>AI Competitor Monitor</h1>
          <p>Track and analyze competitor reviews for competitive insights</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>Export CSV</button>
          <button className="btn btn-secondary" onClick={handleExportPDF}>Export PDF</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + Add Competitor
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <SearchBar onSearch={setSearch} placeholder="Search competitors..." />
        <SortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
          options={[
            { value: 'competitor_name', label: 'Name' },
            { value: 'created_at', label: 'Date' },
            { value: 'average_rating', label: 'Rating' }
          ]}
        />
      </div>

      <div className="filters">
        <select
          value={filters.monitoring_status}
          onChange={(e) => setFilters({ ...filters, monitoring_status: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="active">Active</option>
          <option value="paused">Paused</option>
        </select>
        <select
          value={filters.business_category}
          onChange={(e) => setFilters({ ...filters, business_category: e.target.value })}
        >
          <option value="">All Categories</option>
          {categories.map(cat => (
            <option key={cat} value={cat}>{cat}</option>
          ))}
        </select>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalItems={monitors.length}
        onSelectAll={() => setSelectedIds(monitors.map(m => m.id))}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={handleBulkDelete}
        onBulkUpdate={handleBulkUpdate}
        updateOptions={[
          { value: 'status_active', label: 'Set Active', updates: { monitoring_status: 'active' } },
          { value: 'status_paused', label: 'Set Paused', updates: { monitoring_status: 'paused' } }
        ]}
      />

      {loading ? (
        <SkeletonCard count={6} />
      ) : monitors.length > 0 ? (
        <div className="monitors-grid">
          {monitors.map((monitor) => (
            <div
              key={monitor.id}
              className="monitor-card"
              onClick={() => navigate(`/competitors/${monitor.id}`)}
              style={{ position: 'relative' }}
            >
              <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(monitor.id)}
                  onChange={() => toggleSelect(monitor.id)}
                />
              </div>
              <div className="card-header">
                <h3>{monitor.competitor_name}</h3>
                <span className={`status-badge ${monitor.monitoring_status}`}>
                  {monitor.monitoring_status}
                </span>
              </div>

              <div className="card-meta">
                <span className="platform">{monitor.competitor_platform}</span>
                {monitor.business_category && (
                  <span className="category">{monitor.business_category}</span>
                )}
              </div>

              <div className="card-stats">
                <div className="stat">
                  <div className="rating">
                    {renderStars(monitor.average_rating)}
                  </div>
                  <span className="stat-value">{monitor.average_rating ? Number(monitor.average_rating).toFixed(1) : 'N/A'}</span>
                </div>
                <div className="stat">
                  <span className="stat-value">{monitor.total_reviews || 0}</span>
                  <span className="stat-label">Reviews</span>
                </div>
                {monitor.sentiment_score && (
                  <div className="stat">
                    <span className="stat-value">{monitor.sentiment_score}%</span>
                    <span className="stat-label">Sentiment</span>
                  </div>
                )}
              </div>

              {monitor.strengths && monitor.strengths.length > 0 && (
                <div className="strengths-preview">
                  <span className="label">💪 Strengths:</span>
                  <span>{monitor.strengths.slice(0, 2).join(', ')}</span>
                </div>
              )}

              {monitor.weaknesses && monitor.weaknesses.length > 0 && (
                <div className="weaknesses-preview">
                  <span className="label">🎯 Weaknesses:</span>
                  <span>{monitor.weaknesses.slice(0, 2).join(', ')}</span>
                </div>
              )}

              <div className="card-footer">
                <span className="last-scraped">
                  {monitor.last_scraped
                    ? `Last analyzed: ${new Date(monitor.last_scraped).toLocaleDateString()}`
                    : 'Not yet analyzed'}
                </span>
                <button className="btn-delete" onClick={(e) => handleDelete(monitor.id, e)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">No competitors being monitored. Add a competitor to track.</div>
      )}

      <Pagination pagination={pagination} onPageChange={(page) => fetchMonitors(page)} />

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Competitor to Monitor</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Competitor Name *</label>
                <input
                  type="text"
                  value={formData.competitor_name}
                  onChange={(e) => setFormData({ ...formData, competitor_name: e.target.value })}
                  placeholder="e.g., Pizza Palace"
                  required
                />
              </div>
              <div className="form-group">
                <label>Platform</label>
                <select
                  value={formData.competitor_platform}
                  onChange={(e) => setFormData({ ...formData, competitor_platform: e.target.value })}
                >
                  <option value="google">Google</option>
                  <option value="yelp">Yelp</option>
                  <option value="tripadvisor">TripAdvisor</option>
                  <option value="facebook">Facebook</option>
                </select>
              </div>
              <div className="form-group">
                <label>Business Category</label>
                <input
                  type="text"
                  value={formData.business_category}
                  onChange={(e) => setFormData({ ...formData, business_category: e.target.value })}
                  placeholder="e.g., Italian Restaurant"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Add Competitor</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CompetitorMonitor;
