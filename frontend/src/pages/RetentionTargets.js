import React, { useState } from 'react';
import api from '../services/api';

const RetentionTargets = () => {
  const [businessId, setBusinessId] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [retentionPlaybook, setRetentionPlaybook] = useState('Apologize, offer 20% credit, schedule manager follow-up within 48h');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [sampleSize, setSampleSize] = useState(0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!businessId && !businessName) {
      setError('Provide either Business ID or Business Name.');
      return;
    }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/quality/retention-targets-from-reviews', {
        businessId: businessId ? Number(businessId) : undefined,
        businessName: businessName || undefined,
        retentionPlaybook,
      });
      setResult(res.data?.result || res.data);
      setSampleSize(res.data?.sample_size || 0);
    } catch (err) {
      const status = err.response?.status;
      const msg = err.response?.data?.error || 'Retention target analysis failed';
      setError(status === 503 ? 'AI provider is not configured (503): ' + msg : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Retention Targets from Reviews</h1>
        <p>Identify high-priority retention outreach targets from recent negative reviews.</p>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div className="form-group">
            <label className="form-label">Business ID</label>
            <input type="number" className="form-input" value={businessId} onChange={e => setBusinessId(e.target.value)} />
          </div>
          <div className="form-group">
            <label className="form-label">Business Name</label>
            <input type="text" className="form-input" value={businessName} onChange={e => setBusinessName(e.target.value)} />
          </div>
        </div>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Retention Playbook Hints</label>
          <textarea className="form-input" rows={3} value={retentionPlaybook} onChange={e => setRetentionPlaybook(e.target.value)} />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Analyzing…' : 'Find Retention Targets'}
        </button>
      </form>
      {result && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Retention Plan{sampleSize ? ` (sampled ${sampleSize} reviews)` : ''}</h2>
          <pre style={{ background: '#f9fafb', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap' }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default RetentionTargets;
