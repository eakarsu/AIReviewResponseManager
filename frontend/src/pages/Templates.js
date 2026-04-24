import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Pagination from '../components/Pagination';
import SearchBar from '../components/SearchBar';
import SortControls from '../components/SortControls';
import BulkActions from '../components/BulkActions';
import { SkeletonCard } from '../components/Skeleton';
import { useToast } from '../context/ToastContext';
import './Templates.css';

const Templates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState(null);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedIds, setSelectedIds] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    category: 'positive',
    tone: 'professional',
    content: ''
  });
  const navigate = useNavigate();
  const toast = useToast();

  useEffect(() => {
    fetchTemplates();
  }, [categoryFilter, search, sortBy, sortOrder]);

  const fetchTemplates = async (page = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append('page', page);
      params.append('limit', 10);
      if (search) params.append('search', search);
      if (sortBy) { params.append('sortBy', sortBy); params.append('sortOrder', sortOrder); }
      if (categoryFilter) params.append('category', categoryFilter);

      const response = await api.get(`/templates?${params.toString()}`);
      setTemplates(response.data.data || response.data);
      setPagination(response.data.pagination || null);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async (e) => {
    e.preventDefault();
    try {
      await api.post('/templates', newTemplate);
      setShowModal(false);
      setNewTemplate({ name: '', category: 'positive', tone: 'professional', content: '' });
      fetchTemplates();
      toast.success('Template created successfully');
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const handleExportCSV = async () => {
    try {
      const response = await api.get('/templates/export/csv', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'templates.csv');
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
      const response = await api.get('/templates/export/pdf', { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'templates.pdf');
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('PDF exported successfully');
    } catch (error) {
      toast.error('Failed to export PDF');
    }
  };

  const handleBulkDelete = async () => {
    if (window.confirm(`Delete ${selectedIds.length} template(s)?`)) {
      try {
        await api.post('/templates/bulk-delete', { ids: selectedIds });
        toast.success(`${selectedIds.length} template(s) deleted`);
        setSelectedIds([]);
        fetchTemplates();
      } catch (error) {
        toast.error('Failed to delete templates');
      }
    }
  };

  const handleBulkUpdate = async (updates) => {
    try {
      await api.put('/templates/bulk-update', { ids: selectedIds, updates });
      toast.success(`${selectedIds.length} template(s) updated`);
      setSelectedIds([]);
      fetchTemplates();
    } catch (error) {
      toast.error('Failed to update templates');
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const handleRowClick = (templateId) => {
    navigate(`/templates/${templateId}`);
  };

  const getCategoryIcon = (category) => {
    const icons = {
      positive: '😊',
      negative: '😔',
      neutral: '😐',
      apology: '🙏',
      thank_you: '🙌'
    };
    return icons[category] || '📝';
  };

  return (
    <div className="templates-page">
      <div className="page-header">
        <h1>Response Templates</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <button className="btn btn-secondary" onClick={handleExportCSV}>Export CSV</button>
          <button className="btn btn-secondary" onClick={handleExportPDF}>Export PDF</button>
          <button className="btn btn-primary" onClick={() => setShowModal(true)}>
            + New Template
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
        <SearchBar onSearch={setSearch} placeholder="Search templates..." />
        <SortControls
          sortBy={sortBy}
          sortOrder={sortOrder}
          onSortChange={(by, order) => { setSortBy(by); setSortOrder(order); }}
          options={[
            { value: 'name', label: 'Name' },
            { value: 'created_at', label: 'Date Created' },
            { value: 'category', label: 'Category' }
          ]}
        />
      </div>

      {/* Filters */}
      <div className="filters card">
        <div className="filter-group">
          <label>Category</label>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="">All Categories</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
            <option value="apology">Apology</option>
            <option value="thank_you">Thank You</option>
          </select>
        </div>
      </div>

      <BulkActions
        selectedIds={selectedIds}
        totalItems={templates.length}
        onSelectAll={() => setSelectedIds(templates.map(t => t.id))}
        onClearSelection={() => setSelectedIds([])}
        onBulkDelete={handleBulkDelete}
        onBulkUpdate={handleBulkUpdate}
        updateOptions={[
          { value: 'tone_professional', label: 'Set Professional', updates: { tone: 'professional' } },
          { value: 'tone_friendly', label: 'Set Friendly', updates: { tone: 'friendly' } }
        ]}
      />

      {/* Templates Grid */}
      {loading ? (
        <SkeletonCard count={6} />
      ) : templates.length > 0 ? (
        <div className="templates-grid">
          {templates.map((template) => (
            <div
              key={template.id}
              className="template-card card card-clickable"
              onClick={() => handleRowClick(template.id)}
              style={{ position: 'relative' }}
            >
              <div style={{ position: 'absolute', top: 8, left: 8, zIndex: 1 }} onClick={(e) => e.stopPropagation()}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(template.id)}
                  onChange={() => toggleSelect(template.id)}
                />
              </div>
              <div className="template-header">
                <span className="template-icon">{getCategoryIcon(template.category)}</span>
                <span className={`badge badge-${template.category}`}>{template.category}</span>
              </div>
              <h3 className="template-name">{template.name}</h3>
              <p className="template-preview">{template.content?.substring(0, 100)}...</p>
              <div className="template-footer">
                <span className="template-tone">{template.tone}</span>
                <span className="template-uses">{template.use_count} uses</span>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="card empty-state">
          <h3>No templates found</h3>
          <p>Create your first template to get started</p>
        </div>
      )}

      <Pagination pagination={pagination} onPageChange={(page) => fetchTemplates(page)} />

      {/* New Template Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Template</h2>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleCreateTemplate}>
              <div className="form-group">
                <label>Template Name</label>
                <input
                  type="text"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="e.g., 5-Star Thank You"
                  required
                />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Category</label>
                  <select
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate({ ...newTemplate, category: e.target.value })}
                  >
                    <option value="positive">Positive</option>
                    <option value="negative">Negative</option>
                    <option value="neutral">Neutral</option>
                    <option value="apology">Apology</option>
                    <option value="thank_you">Thank You</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Tone</label>
                  <select
                    value={newTemplate.tone}
                    onChange={(e) => setNewTemplate({ ...newTemplate, tone: e.target.value })}
                  >
                    <option value="professional">Professional</option>
                    <option value="friendly">Friendly</option>
                    <option value="apologetic">Apologetic</option>
                    <option value="grateful">Grateful</option>
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label>Template Content</label>
                <textarea
                  value={newTemplate.content}
                  onChange={(e) => setNewTemplate({ ...newTemplate, content: e.target.value })}
                  placeholder="Write your template here. Use {reviewer_name} for dynamic name insertion."
                  rows={6}
                  required
                />
                <small className="form-hint">
                  Available placeholders: {'{reviewer_name}'}, {'{rating}'}, {'{business_name}'}
                </small>
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Template
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Templates;
