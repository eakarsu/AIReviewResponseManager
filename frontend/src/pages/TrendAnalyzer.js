import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import SortControls from '../components/SortControls';
import BulkActions from '../components/BulkActions';
import { SkeletonCard } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import './TrendAnalyzer.css';

const TrendAnalyzer = () => {
  const navigate = useNavigate();
  const [analyses, setAnalyses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ trend_direction: '' });
  const [formData, setFormData] = useState({
    analysis_name: '',
    business_name: '',
    date_range_start: '',
    date_range_end: ''
  });
  const toast = useToast();

  useEffect(() => {
    fetchAnalyses();
  }, [filters, search, sortBy, sortOrder]);

  const fetchAnalyses = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (search) params.append('search', search);
      if (sortBy) { params.append('sortBy', sortBy); params.append('sortOrder', sortOrder); }
      if (filters.trend_direction) params.append('trend_direction', filters.trend_direction);

      const response = await api.get(`/trends?${params}`);
      setAnalyses(response.data.data || response.data);
      setPagination(response.data.pagination || null);
    } catch (error) {
      console.error('Error fetching analyses:', error);
      toast.error('Failed to load analyses');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/trends', formData);
      setShowModal(false);
      setFormData({ analysis_name: '', business_name: '', date_range_start: '', date_range_end: '' });
      fetchAnalyses();
      toast.success('Analysis created successfully');
    } catch (error) {
      console.error('Error creating analysis:', error);
      toast.error('Failed to create analysis');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this analysis?')) {
      try {
        await api.delete(`/trends/${id}`);
        fetchAnalyses();
        toast.success('Analysis deleted');
      } catch (error) {
        console.error('Error deleting analysis:', error);
        toast.error('Failed to delete analysis');
      }
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/trends/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'trends.csv');
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
      const response = await api.get('/trends/export/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'trends.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} analysis(es)?`)) {
      try {
        await api.post('/trends/bulk-delete', { ids: selectedIds });
        toast.success(`${selectedIds.length} analysis(es) deleted`);
        setSelectedIds([]);
        fetchAnalyses();
      } catch (error) {
        toast.error('Failed to delete analyses');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      await api.put('/trends/bulk-update', { ids: selectedIds, updates });
      toast.success(`${selectedIds.length} analysis(es) updated`);
      setSelectedIds([]);
      fetchAnalyses();
    } catch (error) {
      toast.error('Failed to update analyses');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const getTrendIcon = (direction) => {
    switch (direction?.toLowerCase()) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➡️';
      default: return '📊';
    }
  };

  const getTrendColor = (direction) => {
    switch (direction?.toLowerCase()) {
      case 'improving': return { bg: '#dcfce7', color: '#166534' };
      case 'declining': return { bg: '#fee2e2', color: '#991b1b' };
      case 'stable': return { bg: '#e0e7ff', color: '#4338ca' };
      default: return { bg: '#f1f5f9', color: '#475569' };
    }
  };

  return (
    <div className="trend-analyzer">
      <div className="page-header">
        <div>
          <h1>AI Trend Analyzer</h1>
          <p>Identify trends in reviews over time and detect emerging patterns</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>Export CSV</button>
          <button className="btn btn-secondary" onClick={handleExportPDF}>Export PDF</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + New Analysis
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <SearchBar onSearch={setSearch} placeholder="Search analyses..." />
        <SortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
          options={[
            { value: 'analysis_name', label: 'Name' },
            { value: 'created_at', label: 'Date' },
            { value: 'sentiment_change', label: 'Sentiment Change' }
          ]}
        />
      </div>

      <div className="filters">
        <select
          value={filters.trend_direction}
          onChange={(e) => setFilters({ ...filters, trend_direction: e.target.value })}
        >
          <option value="">All Trends</option>
          <option value="improving">Improving</option>
          <option value="stable">Stable</option>
          <option value="declining">Declining</option>
        </select>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalItems={analyses.length}
        onSelectAll={() => setSelectedIds(analyses.map(a => a.id))}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={handleBulkDelete}
        onBulkUpdate={handleBulkUpdate}
        updateOptions={[]}
      />

      {loading ? (
        <SkeletonCard count={6} />
      ) : analyses.length > 0 ? (
        <div className="analyses-grid">
          {analyses.map((analysis) => (
            <div
              key={analysis.id}
              className="analysis-card"
              onClick={() => navigate(`/trends/${analysis.id}`)}
              style={{ position: 'relative' }}
            >
              <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(analysis.id)}
                  onChange={() => toggleSelect(analysis.id)}
                />
              </div>
              <div className="card-header">
                <h3>{analysis.analysis_name}</h3>
                {analysis.trend_direction && (
                  <span
                    className="trend-badge"
                    style={{
                      backgroundColor: getTrendColor(analysis.trend_direction).bg,
                      color: getTrendColor(analysis.trend_direction).color
                    }}
                  >
                    {getTrendIcon(analysis.trend_direction)} {analysis.trend_direction}
                  </span>
                )}
              </div>

              <p className="business-name">{analysis.business_name}</p>

              <div className="date-range">
                <span>📅 {analysis.date_range_start} to {analysis.date_range_end}</span>
              </div>

              {analysis.sentiment_change !== null && (
                <div className="sentiment-change">
                  <span className={analysis.sentiment_change >= 0 ? 'positive' : 'negative'}>
                    {analysis.sentiment_change >= 0 ? '▲' : '▼'} {Math.abs(analysis.sentiment_change)}% sentiment change
                  </span>
                </div>
              )}

              {analysis.emerging_topics && analysis.emerging_topics.length > 0 && (
                <div className="topics-preview">
                  <span className="label">Emerging:</span>
                  {analysis.emerging_topics.slice(0, 3).map((topic, idx) => (
                    <span key={idx} className="topic-tag emerging">{topic}</span>
                  ))}
                </div>
              )}

              <div className="card-footer">
                <span className="created-date">
                  Created: {new Date(analysis.created_at).toLocaleDateString()}
                </span>
                <button className="btn-delete" onClick={(e) => handleDelete(analysis.id, e)}>
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="empty-state">No analyses found. Create a new trend analysis.</div>
      )}

      <Pagination pagination={pagination} onPageChange={(page) => fetchAnalyses(page)} />

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Trend Analysis</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Analysis Name *</label>
                <input
                  type="text"
                  value={formData.analysis_name}
                  onChange={(e) => setFormData({ ...formData, analysis_name: e.target.value })}
                  placeholder="e.g., Q4 2024 Performance Review"
                  required
                />
              </div>
              <div className="form-group">
                <label>Business Name *</label>
                <input
                  type="text"
                  value={formData.business_name}
                  onChange={(e) => setFormData({ ...formData, business_name: e.target.value })}
                  placeholder="e.g., Bella Italia Restaurant"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Start Date</label>
                  <input
                    type="date"
                    value={formData.date_range_start}
                    onChange={(e) => setFormData({ ...formData, date_range_start: e.target.value })}
                  />
                </div>
                <div className="form-group">
                  <label>End Date</label>
                  <input
                    type="date"
                    value={formData.date_range_end}
                    onChange={(e) => setFormData({ ...formData, date_range_end: e.target.value })}
                  />
                </div>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Analysis</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TrendAnalyzer;
