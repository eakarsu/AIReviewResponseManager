import React, { useState, useEffect } from 'react';
import api from '../services/api';

const SemanticSearch = () => {
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    api.get('/businesses').then(res => {
      setBusinesses(res.data?.data || res.data || []);
    }).catch(() => {});
  }, []);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setError('');
    setResults([]);
    try {
      const payload = { query, limit: 30 };
      if (selectedBusiness) payload.business_id = parseInt(selectedBusiness);
      const res = await api.post('/reviews/semantic-search', payload);
      setResults(res.data?.data || []);
      setSearched(true);
    } catch (e) {
      setError(e.response?.data?.error || 'Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  const getSentimentColor = (sentiment) => {
    if (sentiment === 'positive') return '#22c55e';
    if (sentiment === 'negative') return '#ef4444';
    return '#eab308';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Semantic Review Search</h1>
        <p>AI-ranked search — find reviews by meaning, not just keywords</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
          <div style={{ flex: 2 }}>
            <label className="form-label">Search Query</label>
            <input
              type="text"
              className="form-input"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="e.g., 'slow service but great food', 'staff was unfriendly', 'best pasta I have had'"
            />
          </div>
          <div style={{ flex: 1 }}>
            <label className="form-label">Filter by Business (optional)</label>
            <select className="form-input" value={selectedBusiness}
              onChange={(e) => setSelectedBusiness(e.target.value)}>
              <option value="">All Businesses</option>
              {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleSearch} disabled={loading || !query.trim()}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        <div style={{ marginTop: '12px', fontSize: '13px', color: '#9ca3af' }}>
          Example queries: "delivery problems", "excellent staff hospitality", "food quality declined", "overpriced for what you get"
        </div>
      </div>

      {searched && !loading && (
        <div style={{ marginBottom: '16px', color: '#6b7280', fontSize: '14px' }}>
          Found {results.length} semantically relevant reviews
        </div>
      )}

      {results.map((review, idx) => (
        <div key={review.id} className="card" style={{ marginBottom: '12px', position: 'relative' }}>
          <div style={{ position: 'absolute', top: '16px', right: '16px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <span style={{
              background: '#6366f1', color: 'white', borderRadius: '20px',
              padding: '2px 10px', fontSize: '12px', fontWeight: 700
            }}>
              #{idx + 1} Match {review.relevance_score}%
            </span>
            <span style={{
              background: getSentimentColor(review.sentiment) + '20',
              color: getSentimentColor(review.sentiment),
              borderRadius: '20px', padding: '2px 10px', fontSize: '12px', fontWeight: 600
            }}>
              {review.sentiment}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start', paddingRight: '200px' }}>
            <div>
              <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
                {[1,2,3,4,5].map(s => (
                  <span key={s} style={{ color: s <= review.rating ? '#f59e0b' : '#d1d5db', fontSize: '16px' }}>★</span>
                ))}
              </div>
              <div style={{ fontWeight: 600, fontSize: '14px' }}>{review.reviewer_name}</div>
              <div style={{ fontSize: '12px', color: '#9ca3af' }}>{review.platform} · {review.review_date ? new Date(review.review_date).toLocaleDateString() : ''}</div>
            </div>
          </div>

          <p style={{ marginTop: '10px', color: '#374151', lineHeight: '1.6', fontSize: '14px' }}>
            {review.review_text}
          </p>

          {review.match_reason && (
            <div style={{ marginTop: '10px', padding: '8px', background: '#f0f9ff', borderRadius: '6px', fontSize: '12px', color: '#0369a1' }}>
              <strong>Why this matched:</strong> {review.match_reason}
            </div>
          )}
        </div>
      ))}

      {searched && results.length === 0 && !loading && (
        <div className="card" style={{ textAlign: 'center', padding: '48px', color: '#9ca3af' }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>🔍</div>
          <div>No semantically relevant reviews found for your query.</div>
          <div style={{ marginTop: '8px', fontSize: '13px' }}>Try a different search term or broaden your query.</div>
        </div>
      )}
    </div>
  );
};

export default SemanticSearch;
