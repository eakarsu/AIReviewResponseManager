import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import SortControls from '../components/SortControls';
import BulkActions from '../components/BulkActions';
import { SkeletonTable } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import './ReviewSolicitor.css';

const ReviewSolicitor = () => {
  const navigate = useNavigate();
  const [solicitations, setSolicitations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({ status: '', channel: '' });
  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    purchase_date: '',
    product_service: ''
  });
  const toast = useToast();

  useEffect(() => {
    fetchSolicitations();
  }, [filters, search, sortBy, sortOrder]);

  const fetchSolicitations = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (search) params.append('search', search);
      if (sortBy) { params.append('sortBy', sortBy); params.append('sortOrder', sortOrder); }
      if (filters.status) params.append('status', filters.status);
      if (filters.channel) params.append('channel', filters.channel);

      const response = await api.get(`/solicitations?${params}`);
      setSolicitations(response.data.data || response.data);
      setPagination(response.data.pagination || null);
    } catch (error) {
      console.error('Error fetching solicitations:', error);
      toast.error('Failed to load solicitations');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await api.post('/solicitations', formData);
      setShowModal(false);
      setFormData({ customer_name: '', customer_email: '', customer_phone: '', purchase_date: '', product_service: '' });
      fetchSolicitations();
      toast.success('Campaign created successfully');
    } catch (error) {
      console.error('Error creating solicitation:', error);
      toast.error('Failed to create campaign');
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this solicitation?')) {
      try {
        await api.delete(`/solicitations/${id}`);
        fetchSolicitations();
        toast.success('Solicitation deleted');
      } catch (error) {
        console.error('Error deleting solicitation:', error);
        toast.error('Failed to delete solicitation');
      }
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/solicitations/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'solicitations.csv');
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
      const response = await api.get('/solicitations/export/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'solicitations.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} solicitation(s)?`)) {
      try {
        await api.post('/solicitations/bulk-delete', { ids: selectedIds });
        toast.success(`${selectedIds.length} solicitation(s) deleted`);
        setSelectedIds([]);
        fetchSolicitations();
      } catch (error) {
        toast.error('Failed to delete solicitations');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      await api.put('/solicitations/bulk-update', { ids: selectedIds, updates });
      toast.success(`${selectedIds.length} solicitation(s) updated`);
      setSelectedIds([]);
      fetchSolicitations();
    } catch (error) {
      toast.error('Failed to update solicitations');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const getStatusStyle = (status) => {
    const styles = {
      scheduled: { bg: '#fef3c7', color: '#92400e', icon: '📅' },
      ready: { bg: '#dbeafe', color: '#1e40af', icon: '✓' },
      sent: { bg: '#dcfce7', color: '#166534', icon: '✉️' },
      pending: { bg: '#f1f5f9', color: '#475569', icon: '⏳' }
    };
    return styles[status?.toLowerCase()] || styles.pending;
  };

  const getChannelIcon = (channel) => {
    const icons = {
      email: '📧',
      sms: '📱',
      in_app: '📲'
    };
    return icons[channel?.toLowerCase()] || '📨';
  };

  return (
    <div className="review-solicitor">
      <div className="page-header">
        <div>
          <h1>AI Review Solicitor</h1>
          <p>Generate personalized review request messages with optimal timing</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>Export CSV</button>
          <button className="btn btn-secondary" onClick={handleExportPDF}>Export PDF</button>
          <button className="btn-primary" onClick={() => setShowModal(true)}>
            + New Campaign
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <SearchBar onSearch={setSearch} placeholder="Search solicitations..." />
        <SortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
          options={[
            { value: 'customer_name', label: 'Customer' },
            { value: 'created_at', label: 'Date' },
            { value: 'purchase_date', label: 'Purchase Date' }
          ]}
        />
      </div>

      <div className="filters">
        <select
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value })}
        >
          <option value="">All Statuses</option>
          <option value="scheduled">Scheduled</option>
          <option value="ready">Ready</option>
          <option value="sent">Sent</option>
        </select>
        <select
          value={filters.channel}
          onChange={(e) => setFilters({ ...filters, channel: e.target.value })}
        >
          <option value="">All Channels</option>
          <option value="email">Email</option>
          <option value="sms">SMS</option>
          <option value="in_app">In-App</option>
        </select>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalItems={solicitations.length}
        onSelectAll={() => setSelectedIds(solicitations.map(s => s.id))}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={handleBulkDelete}
        onBulkUpdate={handleBulkUpdate}
        updateOptions={[
          { value: 'status_ready', label: 'Set Ready', updates: { status: 'ready' } },
          { value: 'status_sent', label: 'Mark Sent', updates: { status: 'sent' } }
        ]}
      />

      <div className="solicitations-table">
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
                      checked={selectedIds.length === solicitations.length && solicitations.length > 0}
                      onChange={() => selectedIds.length === solicitations.length ? setSelectedIds([]) : setSelectedIds(solicitations.map(s => s.id))}
                    />
                  </th>
                  <th>Customer</th>
                  <th>Product/Service</th>
                  <th>Purchase Date</th>
                  <th>Channel</th>
                  <th>Status</th>
                  <th>Response</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {solicitations.map((sol) => (
                  <tr key={sol.id} onClick={() => navigate(`/solicitations/${sol.id}`)}>
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(sol.id)}
                        onChange={() => toggleSelect(sol.id)}
                      />
                    </td>
                    <td>
                      <div className="customer-info">
                        <strong>{sol.customer_name}</strong>
                        <span>{sol.customer_email}</span>
                      </div>
                    </td>
                    <td>{sol.product_service || 'N/A'}</td>
                    <td>{sol.purchase_date ? new Date(sol.purchase_date).toLocaleDateString() : 'N/A'}</td>
                    <td>
                      {sol.channel && (
                        <span className="channel-badge">
                          {getChannelIcon(sol.channel)} {sol.channel}
                        </span>
                      )}
                    </td>
                    <td>
                      <span
                        className="status-badge"
                        style={{
                          backgroundColor: getStatusStyle(sol.status).bg,
                          color: getStatusStyle(sol.status).color
                        }}
                      >
                        {getStatusStyle(sol.status).icon} {sol.status}
                      </span>
                    </td>
                    <td>
                      {sol.response_received ? (
                        <span className="response-yes">✓ Received</span>
                      ) : (
                        <span className="response-no">—</span>
                      )}
                    </td>
                    <td>
                      <button className="btn-delete" onClick={(e) => handleDelete(sol.id, e)}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {solicitations.length === 0 && (
              <div className="empty-state">No solicitations found. Create a campaign to get started.</div>
            )}
          </>
        )}
      </div>

      <Pagination pagination={pagination} onPageChange={(page) => fetchSolicitations(page)} />

      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h2>Create Review Request Campaign</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Customer Name *</label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder="e.g., John Smith"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    placeholder="john@example.com"
                  />
                </div>
                <div className="form-group">
                  <label>Phone</label>
                  <input
                    type="text"
                    value={formData.customer_phone}
                    onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                    placeholder="555-0123"
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Purchase Date</label>
                <input
                  type="date"
                  value={formData.purchase_date}
                  onChange={(e) => setFormData({ ...formData, purchase_date: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Product/Service</label>
                <input
                  type="text"
                  value={formData.product_service}
                  onChange={(e) => setFormData({ ...formData, product_service: e.target.value })}
                  placeholder="e.g., Dinner for 4"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn-primary">Create Campaign</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ReviewSolicitor;
