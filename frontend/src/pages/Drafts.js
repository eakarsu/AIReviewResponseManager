import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import SortControls from '../components/SortControls';
import BulkActions from '../components/BulkActions';
import { SkeletonCard } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import './Drafts.css';

const Drafts = () => {
  const [drafts, setDrafts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [filters, setFilters] = useState({
    is_approved: '',
    is_sent: ''
  });
  const [newDraft, setNewDraft] = useState({
    review_id: '',
    draft_text: '',
    tone: 'professional'
  });
  const [reviews, setReviews] = useState([]);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    fetchDrafts();
  }, [filters, search, sortBy, sortOrder]);

  useEffect(() => {
    fetchPendingReviews();
  }, []);

  const fetchDrafts = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (search) params.append('search', search);
      if (sortBy) { params.append('sortBy', sortBy); params.append('sortOrder', sortOrder); }
      if (filters.is_approved) params.append('is_approved', filters.is_approved);
      if (filters.is_sent) params.append('is_sent', filters.is_sent);

      const response = await api.get(`/drafts?${params.toString()}`);
      setDrafts(response.data.data || response.data);
      setPagination(response.data.pagination || null);
    } catch (error) {
      console.error('Error fetching drafts:', error);
      toast.error('Failed to load drafts');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingReviews = async () => {
    try {
      const response = await api.get('/reviews?status=pending');
      setReviews(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const handleCreateDraft = async (e) => {
    e.preventDefault();
    try {
      await api.post('/drafts', newDraft);
      setShowModal(false);
      setNewDraft({ review_id: '', draft_text: '', tone: 'professional' });
      fetchDrafts();
      toast.success('Draft created successfully');
    } catch (error) {
      console.error('Error creating draft:', error);
      toast.error('Failed to create draft');
    }
  };

  const handleApproveDraft = async (draftId) => {
    try {
      await api.post(`/drafts/${draftId}/approve`);
      fetchDrafts();
      toast.success('Draft approved');
    } catch (error) {
      console.error('Error approving draft:', error);
      toast.error('Failed to approve draft');
    }
  };

  const handleSendDraft = async (draftId) => {
    try {
      await api.post(`/drafts/${draftId}/send`);
      fetchDrafts();
      toast.success('Draft sent successfully');
    } catch (error) {
      console.error('Error sending draft:', error);
      toast.error('Failed to send draft');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/drafts/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'drafts.csv');
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
      const response = await api.get('/drafts/export/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'drafts.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} draft(s)?`)) {
      try {
        await api.post('/drafts/bulk-delete', { ids: selectedIds });
        toast.success(`${selectedIds.length} draft(s) deleted`);
        setSelectedIds([]);
        fetchDrafts();
      } catch (error) {
        toast.error('Failed to delete drafts');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      await api.put('/drafts/bulk-update', { ids: selectedIds, updates });
      toast.success(`${selectedIds.length} draft(s) updated`);
      setSelectedIds([]);
      fetchDrafts();
    } catch (error) {
      toast.error('Failed to update drafts');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleRowClick = (draftId) => {
    navigate(`/drafts/${draftId}`);
  };

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  return (
    <div className="drafts-page">
      <div className="page-header">
        <h1>Response Drafts</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>Export CSV</button>
          <button className="btn btn-secondary" onClick={handleExportPDF}>Export PDF</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + New Draft
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <SearchBar onSearch={setSearch} placeholder="Search drafts..." />
        <SortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
          options={[
            { value: 'created_at', label: 'Date Created' },
            { value: 'tone', label: 'Tone' }
          ]}
        />
      </div>

      {/* Filters */}
      <div className="filters card">
        <div className="filter-group">
          <label>Status</label>
          <select
            value={filters.is_approved}
            onChange={(e) => setFilters({ ...filters, is_approved: e.target.value })}
          >
            <option value="">All Drafts</option>
            <option value="true">Approved</option>
            <option value="false">Pending Approval</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Sent Status</label>
          <select
            value={filters.is_sent}
            onChange={(e) => setFilters({ ...filters, is_sent: e.target.value })}
          >
            <option value="">All</option>
            <option value="true">Sent</option>
            <option value="false">Not Sent</option>
          </select>
        </div>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalItems={drafts.length}
        onSelectAll={() => setSelectedIds(drafts.map(d => d.id))}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={handleBulkDelete}
        onBulkUpdate={handleBulkUpdate}
        updateOptions={[
          { value: 'approve', label: 'Approve All', updates: { is_approved: true } }
        ]}
      />

      {/* Drafts List */}
      {loading ? (
        <SkeletonCard count={4} />
      ) : drafts.length > 0 ? (
        <div className="drafts-list">
          {drafts.map((draft) => (
            <div key={draft.id} className="draft-card card" style={{ position: 'relative' }}>
              <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(draft.id)}
                  onChange={() => toggleSelect(draft.id)}
                />
              </div>
              <div className="draft-header" onClick={() => handleRowClick(draft.id)}>
                <div className="draft-review-info">
                  <span className="reviewer-name">{draft.reviewer_name}</span>
                  <span className={`badge badge-${draft.platform}`}>{draft.platform}</span>
                  <span className="stars">{renderStars(draft.rating)}</span>
                </div>
                <div className="draft-status-badges">
                  <span className={`badge ${draft.is_approved ? 'badge-positive' : 'badge-pending'}`}>
                    {draft.is_approved ? 'Approved' : 'Pending'}
                  </span>
                  {draft.is_sent && <span className="badge badge-responded">Sent</span>}
                </div>
              </div>

              <div className="draft-original" onClick={() => handleRowClick(draft.id)}>
                <strong>Original Review:</strong>
                <p>{draft.review_text?.substring(0, 100)}...</p>
              </div>

              <div className="draft-response" onClick={() => handleRowClick(draft.id)}>
                <strong>Draft Response ({draft.tone}):</strong>
                <p>{draft.draft_text}</p>
              </div>

              <div className="draft-actions">
                {!draft.is_approved && (
                  <button
                    className="btn btn-success btn-small"
                    onClick={(e) => { e.stopPropagation(); handleApproveDraft(draft.id); }}
                  >
                    Approve
                  </button>
                )}
                {draft.is_approved && !draft.is_sent && (
                  <button
                    className="btn btn-primary btn-small"
                    onClick={(e) => { e.stopPropagation(); handleSendDraft(draft.id); }}
                  >
                    Send Response
                  </button>
                )}
                <button
                  className="btn btn-secondary btn-small"
                  onClick={() => handleRowClick(draft.id)}
                >
                  View Details
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card empty-state">
          <h3>No drafts found</h3>
          <p>Create a new draft or generate AI responses from reviews</p>
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={(page) => fetchDrafts(page)} />

      {/* New Draft Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Draft</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateDraft}>
              <div className="form-group">
                <label>Select Review</label>
                <select
                  value={newDraft.review_id}
                  onChange={(e) => setNewDraft({ ...newDraft, review_id: e.target.value })}
                  required
                >
                  <option value="">Select a pending review</option>
                  {reviews.map((review) => (
                    <option key={review.id} value={review.id}>
                      {review.reviewer_name} - {review.rating}★ - {review.review_text?.substring(0, 40)}...
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Tone</label>
                <select
                  value={newDraft.tone}
                  onChange={(e) => setNewDraft({ ...newDraft, tone: e.target.value })}
                >
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="apologetic">Apologetic</option>
                  <option value="grateful">Grateful</option>
                </select>
              </div>
              <div className="form-group">
                <label>Response Draft</label>
                <textarea
                  value={newDraft.draft_text}
                  onChange={(e) => setNewDraft({ ...newDraft, draft_text: e.target.value })}
                  placeholder="Write your response here..."
                  rows={6}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Draft
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Drafts;
