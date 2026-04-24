import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import SortControls from '../components/SortControls';
import BulkActions from '../components/BulkActions';
import { SkeletonTable } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import './CounterfeitDetector.css';

const CounterfeitDetector = () => {
  const navigate = useNavigate();
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ risk_level: '', status: '' });
  const [formData, setFormData] = useState({
    product_name: '',
    seller_name: '',
    platform: 'amazon'
  });
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
      if (filters.risk_level) params.append('risk_level', filters.risk_level);
      if (filters.status) params.append('status', filters.status);

      const response = await api.get(`/counterfeit?${params}`);
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
      await api.post('/counterfeit', formData);
      setShowModal(false);
      setFormData({ product_name: '', seller_name: '', platform: 'amazon' });
      fetchDetections();
      toast.success('Detection created successfully');
    } catch (error) {
      console.error('Error creating detection:', error);
      toast.error('Failed to create detection');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this detection?')) {
      try {
        await api.delete(`/counterfeit/${id}`);
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
      const response = await api.get('/counterfeit/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'counterfeit.csv');
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
      const response = await api.get('/counterfeit/export/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'counterfeit.pdf');
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
        await api.post('/counterfeit/bulk-delete', { ids: selectedIds });
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
      await api.put('/counterfeit/bulk-update', { ids: selectedIds, updates });
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

  const getRiskStyle = (level) => {
    const styles = {
      low: { bg: '#dcfce7', color: '#166534', icon: '✓' },
      medium: { bg: '#fef3c7', color: '#92400e', icon: '⚠' },
      high: { bg: '#fee2e2', color: '#991b1b', icon: '⚠' },
      critical: { bg: '#7c2d12', color: '#fff', icon: '🚨' }
    };
    return styles[level?.toLowerCase()] || styles.low;
  };

  const getStatusStyle = (status) => {
    const styles = {
      monitoring: { bg: '#dbeafe', color: '#1e40af' },
      analyzed: { bg: '#e0e7ff', color: '#4338ca' },
      flagged: { bg: '#fee2e2', color: '#991b1b' },
      escalated: { bg: '#7c2d12', color: '#fff' },
      verified: { bg: '#dcfce7', color: '#166534' }
    };
    return styles[status?.toLowerCase()] || styles.monitoring;
  };

  return (
    <div className="counterfeit-detector">
      <div className="page-header">
        <div>
          <h1>AI Counterfeit Detector</h1>
          <p>Detect mentions of counterfeit or fake products in reviews</p>
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
            { value: 'product_name', label: 'Product' },
            { value: 'created_at', label: 'Date' },
            { value: 'risk_score', label: 'Risk Score' }
          ]}
        />
      </div>

      <div className="filters">
        <select
          value={filters.risk_level}
          onChange={(e) => setFilters({ ...filters, risk_level: e.target.value })}
        >
          <option value="">All Risk Levels</option>
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="monitoring">Monitoring</option>
          <option value="analyzed">Analyzed</option>
          <option value="flagged">Flagged</option>
          <option value="escalated">Escalated</option>
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
          { value: 'status_flagged', label: 'Flag All', updates: { status: 'flagged' } },
          { value: 'status_verified', label: 'Verify All', updates: { status: 'verified' } }
        ]}
      />

      <div className="detections-table">
        {loading ? (
          <SkeletonTable rows={5} cols={8} />
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
                  <th>Product</th>
                  <th>Seller</th>
                  <th>Platform</th>
                  <th>Risk Level</th>
                  <th>Risk Score</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {detections.map((detection) => (
                  <tr key={detection.id} onClick={() => navigate(`/counterfeit/${detection.id}`)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(detection.id)}
                        onChange={() => toggleSelect(detection.id)}
                      />
                    </td>
                    <td className="product-name">{detection.product_name}</td>
                    <td>{detection.seller_name || 'Unknown'}</td>
                    <td>
                      <span className="platform-badge">{detection.platform}</span>
                    </td>
                    <td>
                      {detection.risk_level && (
                        <span
                          className="risk-badge"
                          style={{
                            backgroundColor: getRiskStyle(detection.risk_level).bg,
                            color: getRiskStyle(detection.risk_level).color
                          }}
                        >
                          {getRiskStyle(detection.risk_level).icon} {detection.risk_level}
                        </span>
                      )}
                    </td>
                    <td>
                      {detection.risk_score !== null ? (
                        <div className="risk-score">
                          <div
                            className="score-bar"
                            style={{
                              width: `${detection.risk_score}%`,
                              backgroundColor: getRiskStyle(detection.risk_level).color
                            }}
                          ></div>
                          <span>{detection.risk_score}%</span>
                        </div>
                      ) : (
                        <span className="na">N/A</span>
                      )}
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getStatusStyle(detection.status).bg,
                          color: getStatusStyle(detection.status).color
                        }}
                      >
                        {detection.status}
                      </span>
                    </td>
                    <td>
                      <button className="btn-delete" onClick={(e) => handleDelete(detection.id, e)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {detections.length === 0 && (
              <div className="empty-state">No detections found. Add a product to monitor.</div>
            )}
          </>
        )}
      </div>

      <Pagination pagination={pagination} onPageChange={(page) => fetchDetections(page)} />

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Add Product for Monitoring</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Product Name *</label>
                <input
                  type="text"
                  value={formData.product_name}
                  onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                  placeholder="e.g., Designer Handbag Model XL"
                  required
                />
              </div>
              <div className="form-group">
                <label>Seller Name</label>
                <input
                  type="text"
                  value={formData.seller_name}
                  onChange={(e) => setFormData({ ...formData, seller_name: e.target.value })}
                  placeholder="e.g., LuxuryDeals2024"
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
                  <option value="alibaba">Alibaba</option>
                  <option value="wish">Wish</option>
                </select>
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

export default CounterfeitDetector;
