import React, { useState } from 'react';
import api from '../services/api';

const TeamAssignmentSuggester = () => {
  const [reviewText, setReviewText] = useState('');
  const [rating, setRating] = useState(3);
  const [platform, setPlatform] = useState('Google');
  const [teamJson, setTeamJson] = useState('');
  const [workloadHints, setWorkloadHints] = useState('balance current load, prefer same-language match');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reviewText.trim()) {
      setError('Please provide the review text.');
      return;
    }
    let teamMembers;
    if (teamJson.trim()) {
      try {
        teamMembers = JSON.parse(teamJson);
        if (!Array.isArray(teamMembers)) throw new Error('Must be a JSON array');
      } catch (err) {
        setError('Invalid team JSON: ' + err.message);
        return;
      }
    }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/quality/team-assignment-suggester', {
        review: { review_text: reviewText, rating, platform },
        teamMembers,
        workloadHints,
      });
      setResult(res.data?.result || res.data);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || 'Suggestion failed';
      setError(status === 503 ? 'AI provider is not configured (503): ' + msg : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Team Assignment Suggester</h1>
        <p>Suggest the best team member to own a review response.</p>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Review Text</label>
          <textarea className="form-input" rows={5} value={reviewText} onChange={e => setReviewText(e.target.value)} placeholder="Paste the review here..." />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div className="form-group">
            <label className="form-label">Rating</label>
            <input type="number" min={1} max={5} className="form-input" value={rating} onChange={e => setRating(Number(e.target.value))} />
          </div>
          <div className="form-group">
            <label className="form-label">Platform</label>
            <input type="text" className="form-input" value={platform} onChange={e => setPlatform(e.target.value)} />
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Team JSON (optional, falls back to users table)</label>
          <textarea className="form-input" rows={4} value={teamJson} onChange={e => setTeamJson(e.target.value)} placeholder='[{"id":1,"name":"Alex","role":"agent","languages":["en"],"expertise":["food"],"current_open":3}]' style={{ fontFamily: 'monospace', fontSize: 12 }} />
        </div>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Workload Hints</label>
          <input type="text" className="form-input" value={workloadHints} onChange={e => setWorkloadHints(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Suggesting…' : 'Suggest Owner'}
        </button>
      </form>
      {result && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Suggestion</h2>
          <pre style={{ background: '#f9fafb', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap' }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default TeamAssignmentSuggester;
