import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import SortControls from '../components/SortControls';
import BulkActions from '../components/BulkActions';
import { SkeletonCard } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import './Businesses.css';

const Businesses = () => {
  const [businesses, setBusinesses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [platformFilter, setPlatformFilter] = useState('');
  const [newBusiness, setNewBusiness] = useState({
    name: '',
    platform: 'google',
    address: '',
    phone: '',
    category: ''
  });
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    fetchBusinesses();
  }, [platformFilter, search, sortBy, sortOrder]);

  const fetchBusinesses = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (search) params.append('search', search);
      if (sortBy) { params.append('sortBy', sortBy); params.append('sortOrder', sortOrder); }
      if (platformFilter) params.append('platform', platformFilter);

      const response = await api.get(`/businesses?${params.toString()}`);
      setBusinesses(response.data.data || response.data);
      setPagination(response.data.pagination || null);
    } catch (error) {
      console.error('Error fetching businesses:', error);
      toast.error('Failed to load businesses');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateBusiness = async (e) => {
    e.preventDefault();
    try {
      await api.post('/businesses', newBusiness);
      setShowModal(false);
      setNewBusiness({ name: '', platform: 'google', address: '', phone: '', category: '' });
      fetchBusinesses();
      toast.success('Business created successfully');
    } catch (error) {
      console.error('Error creating business:', error);
      toast.error('Failed to create business');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/businesses/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'businesses.csv');
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
      const response = await api.get('/businesses/export/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'businesses.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} business(es)?`)) {
      try {
        await api.post('/businesses/bulk-delete', { ids: selectedIds });
        toast.success(`${selectedIds.length} business(es) deleted`);
        setSelectedIds([]);
        fetchBusinesses();
      } catch (error) {
        toast.error('Failed to delete businesses');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      await api.put('/businesses/bulk-update', { ids: selectedIds, updates });
      toast.success(`${selectedIds.length} business(es) updated`);
      setSelectedIds([]);
      fetchBusinesses();
    } catch (error) {
      toast.error('Failed to update businesses');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleRowClick = (businessId) => {
    navigate(`/businesses/${businessId}`);
  };

  return (
    <div className="businesses-page">
      <div className="page-header">
        <h1>Businesses</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>Export CSV</button>
          <button className="btn btn-secondary" onClick={handleExportPDF}>Export PDF</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + Add Business
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <SearchBar onSearch={setSearch} placeholder="Search businesses..." />
        <SortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
          options={[
            { value: 'name', label: 'Name' },
            { value: 'created_at', label: 'Date Added' },
            { value: 'rating', label: 'Rating' }
          ]}
        />
      </div>

      {/* Filters */}
      <div className="filters card">
        <div className="filter-group">
          <label>Platform</label>
          <select
            value={platformFilter}
            onChange={(e) => setPlatformFilter(e.target.value)}
          >
            <option value="">All Platforms</option>
            <option value="google">Google</option>
            <option value="yelp">Yelp</option>
          </select>
        </div>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalItems={businesses.length}
        onSelectAll={() => setSelectedIds(businesses.map(b => b.id))}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={handleBulkDelete}
        onBulkUpdate={handleBulkUpdate}
        updateOptions={[
          { value: 'platform_google', label: 'Set Google', updates: { platform: 'google' } },
          { value: 'platform_yelp', label: 'Set Yelp', updates: { platform: 'yelp' } }
        ]}
      />

      {/* Businesses Grid */}
      {loading ? (
        <SkeletonCard count={6} />
      ) : businesses.length > 0 ? (
        <div className="businesses-grid">
          {businesses.map((business) => (
            <div
              key={business.id}
              className="business-card card card-clickable"
              onClick={() => handleRowClick(business.id)}
              style={{ position: 'relative' }}
            >
              <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(business.id)}
                  onChange={() => toggleSelect(business.id)}
                />
              </div>
              <div className="business-header">
                <span className="business-icon">🏪</span>
                <span className={`badge badge-${business.platform}`}>{business.platform}</span>
              </div>
              <h3 className="business-name">{business.name}</h3>
              <p className="business-category">{business.category}</p>
              <div className="business-info">
                {business.address && (
                  <p className="business-address">📍 {business.address}</p>
                )}
                {business.phone && (
                  <p className="business-phone">📞 {business.phone}</p>
                )}
              </div>
              <div className="business-footer">
                <div className="business-rating">
                  <span className="stars">{'★'.repeat(Math.round(business.rating || 0))}</span>
                  <span>{business.rating || 'N/A'}</span>
                </div>
                <span className="business-reviews">{business.review_count || 0} reviews</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card empty-state">
          <h3>No businesses found</h3>
          <p>Add your first business to get started</p>
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={(page) => fetchBusinesses(page)} />

      {/* New Business Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Business</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateBusiness}>
              <div className="form-group">
                <label>Business Name</label>
                <input
                  type="text"
                  value={newBusiness.name}
                  onChange={(e) => setNewBusiness({ ...newBusiness, name: e.target.value })}
                  placeholder="e.g., Joe's Coffee Shop"
                  required
                />
              </div>
              <div className="form-group">
                <label>Platform</label>
                <select
                  value={newBusiness.platform}
                  onChange={(e) => setNewBusiness({ ...newBusiness, platform: e.target.value })}
                >
                  <option value="google">Google</option>
                  <option value="yelp">Yelp</option>
                </select>
              </div>
              <div className="form-group">
                <label>Category</label>
                <input
                  type="text"
                  value={newBusiness.category}
                  onChange={(e) => setNewBusiness({ ...newBusiness, category: e.target.value })}
                  placeholder="e.g., Coffee Shop, Restaurant"
                />
              </div>
              <div className="form-group">
                <label>Address</label>
                <input
                  type="text"
                  value={newBusiness.address}
                  onChange={(e) => setNewBusiness({ ...newBusiness, address: e.target.value })}
                  placeholder="e.g., 123 Main St, City, State"
                />
              </div>
              <div className="form-group">
                <label>Phone</label>
                <input
                  type="text"
                  value={newBusiness.phone}
                  onChange={(e) => setNewBusiness({ ...newBusiness, phone: e.target.value })}
                  placeholder="e.g., (555) 123-4567"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Business
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Businesses;
