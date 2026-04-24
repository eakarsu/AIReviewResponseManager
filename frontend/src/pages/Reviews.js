import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import SortControls from '../components/SortControls';
import BulkActions from '../components/BulkActions';
import { SkeletonTable } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import './Reviews.css';

const Reviews = () => {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [filters, setFilters] = useState({
    platform: '',
    status: '',
    rating: ''
  });
  const [showModal, setShowModal] = useState(false);
  const [newReview, setNewReview] = useState({
    business_id: '',
    platform: 'google',
    reviewer_name: '',
    rating: 5,
    review_text: '',
    review_date: new Date().toISOString().split('T')[0]
  });
  const [businesses, setBusinesses] = useState([]);
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    fetchReviews();
  }, [filters, search, sortBy, sortOrder]);

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchReviews = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (search) params.append('search', search);
      if (sortBy) { params.append('sortBy', sortBy); params.append('sortOrder', sortOrder); }
      if (filters.platform) params.append('platform', filters.platform);
      if (filters.status) params.append('status', filters.status);
      if (filters.rating) params.append('rating', filters.rating);

      const response = await api.get(`/reviews?${params.toString()}`);
      setReviews(response.data.data || response.data);
      setPagination(response.data.pagination || null);
    } catch (error) {
      console.error('Error fetching reviews:', error);
      toast.error('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const fetchBusinesses = async () => {
    try {
      const response = await api.get('/businesses');
      setBusinesses(response.data.data || response.data);
    } catch (error) {
      console.error('Error fetching businesses:', error);
    }
  };

  const handleCreateReview = async (e) => {
    e.preventDefault();
    try {
      await api.post('/reviews', newReview);
      setShowModal(false);
      setNewReview({
        business_id: '',
        platform: 'google',
        reviewer_name: '',
        rating: 5,
        review_text: '',
        review_date: new Date().toISOString().split('T')[0]
      });
      fetchReviews();
      toast.success('Review created successfully');
    } catch (error) {
      console.error('Error creating review:', error);
      toast.error('Failed to create review');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/reviews/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reviews.csv');
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
      const response = await api.get('/reviews/export/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'reviews.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} review(s)?`)) {
      try {
        await api.post('/reviews/bulk-delete', { ids: selectedIds });
        toast.success(`${selectedIds.length} review(s) deleted`);
        setSelectedIds([]);
        fetchReviews();
      } catch (error) {
        toast.error('Failed to delete reviews');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      await api.put('/reviews/bulk-update', { ids: selectedIds, updates });
      toast.success(`${selectedIds.length} review(s) updated`);
      setSelectedIds([]);
      fetchReviews();
    } catch (error) {
      toast.error('Failed to update reviews');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const renderStars = (rating) => {
    return '★'.repeat(rating) + '☆'.repeat(5 - rating);
  };

  const handleRowClick = (reviewId) => {
    navigate(`/reviews/${reviewId}`);
  };

  return (
    <div className="reviews-page">
      <div className="page-header">
        <h1>Reviews</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>Export CSV</button>
          <button className="btn btn-secondary" onClick={handleExportPDF}>Export PDF</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + New Review
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <SearchBar onSearch={setSearch} placeholder="Search reviews..." />
        <SortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
          options={[
            { value: 'review_date', label: 'Date' },
            { value: 'rating', label: 'Rating' },
            { value: 'reviewer_name', label: 'Reviewer' }
          ]}
        />
      </div>

      {/* Filters */}
      <div className="filters card">
        <div className="filter-group">
          <label>Platform</label>
          <select
            value={filters.platform}
            onChange={(e) => setFilters({ ...filters, platform: e.target.value })}
          >
            <option value="">All Platforms</option>
            <option value="google">Google</option>
            <option value="yelp">Yelp</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Status</label>
          <select
            value={filters.status}
            onChange={(e) => setFilters({ ...filters, status: e.target.value })}
          >
            <option value="">All Status</option>
            <option value="pending">Pending</option>
            <option value="draft">Draft</option>
            <option value="responded">Responded</option>
          </select>
        </div>
        <div className="filter-group">
          <label>Rating</label>
          <select
            value={filters.rating}
            onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
          >
            <option value="">All Ratings</option>
            <option value="5">5 Stars</option>
            <option value="4">4 Stars</option>
            <option value="3">3 Stars</option>
            <option value="2">2 Stars</option>
            <option value="1">1 Star</option>
          </select>
        </div>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalItems={reviews.length}
        onSelectAll={() => setSelectedIds(reviews.map(r => r.id))}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={handleBulkDelete}
        onBulkUpdate={handleBulkUpdate}
        updateOptions={[
          { value: 'status_pending', label: 'Set Pending', updates: { response_status: 'pending' } },
          { value: 'status_responded', label: 'Set Responded', updates: { response_status: 'responded' } }
        ]}
      />

      {/* Reviews List */}
      <div className="card">
        {loading ? (
          <SkeletonTable rows={5} cols={7} />
        ) : reviews.length > 0 ? (
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th style={{ width: 40 }}>
                    <input
                      type="checkbox"
                      checked={selectedIds.length === reviews.length && reviews.length > 0}
                      onChange={() => selectedIds.length === reviews.length ? setSelectedIds([]) : setSelectedIds(reviews.map(r => r.id))}
                    />
                  </th>
                  <th>Reviewer</th>
                  <th>Platform</th>
                  <th>Rating</th>
                  <th>Review</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr key={review.id} onClick={() => handleRowClick(review.id)} className="clickable-row">
                    <td onClick={(e) => e.stopPropagation()}>
                      <input
                        type="checkbox"
                        checked={selectedIds.includes(review.id)}
                        onChange={() => toggleSelect(review.id)}
                      />
                    </td>
                    <td>
                      <span className="reviewer-name">{review.reviewer_name}</span>
                    </td>
                    <td>
                      <span className={`badge badge-${review.platform}`}>{review.platform}</span>
                    </td>
                    <td>
                      <span className="stars">{renderStars(review.rating)}</span>
                    </td>
                    <td>
                      <span className="review-excerpt">
                        {review.review_text?.substring(0, 60)}...
                      </span>
                    </td>
                    <td>
                      <span className={`badge badge-${review.response_status}`}>
                        {review.response_status}
                      </span>
                    </td>
                    <td>{new Date(review.review_date).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="empty-state">
            <h3>No reviews found</h3>
            <p>Add your first review or adjust your filters</p>
          </div>
        )}
      </div>

      <Pagination pagination={pagination} onPageChange={(page) => fetchReviews(page)} />

      {/* New Review Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New Review</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateReview}>
              <div className="form-group">
                <label>Business</label>
                <select
                  value={newReview.business_id}
                  onChange={(e) => setNewReview({ ...newReview, business_id: e.target.value })}
                  required
                >
                  <option value="">Select a business</option>
                  {businesses.map((biz) => (
                    <option key={biz.id} value={biz.id}>{biz.name}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Platform</label>
                <select
                  value={newReview.platform}
                  onChange={(e) => setNewReview({ ...newReview, platform: e.target.value })}
                >
                  <option value="google">Google</option>
                  <option value="yelp">Yelp</option>
                </select>
              </div>
              <div className="form-group">
                <label>Reviewer Name</label>
                <input
                  type="text"
                  value={newReview.reviewer_name}
                  onChange={(e) => setNewReview({ ...newReview, reviewer_name: e.target.value })}
                  placeholder="Enter reviewer name"
                  required
                />
              </div>
              <div className="form-group">
                <label>Rating</label>
                <select
                  value={newReview.rating}
                  onChange={(e) => setNewReview({ ...newReview, rating: parseInt(e.target.value) })}
                >
                  <option value={5}>5 Stars</option>
                  <option value={4}>4 Stars</option>
                  <option value={3}>3 Stars</option>
                  <option value={2}>2 Stars</option>
                  <option value={1}>1 Star</option>
                </select>
              </div>
              <div className="form-group">
                <label>Review Text</label>
                <textarea
                  value={newReview.review_text}
                  onChange={(e) => setNewReview({ ...newReview, review_text: e.target.value })}
                  placeholder="Enter the review text"
                  required
                />
              </div>
              <div className="form-group">
                <label>Review Date</label>
                <input
                  type="date"
                  value={newReview.review_date}
                  onChange={(e) => setNewReview({ ...newReview, review_date: e.target.value })}
                  required
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Add Review
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reviews;
