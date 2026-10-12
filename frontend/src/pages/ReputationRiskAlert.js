import FormattedAIReport from '../components/FormattedAIReport';
import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ReputationRiskAlert = () => {
  const [businesses, setBusinesses] = useState([]);
  const [businessId, setBusinessId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const selectSampleBusiness = (index) => { if (businesses[index]) { setBusinessId(String(businesses[index].id)); setError(''); } };

  useEffect(() => {
    api.get('/businesses')
      .then(res => setBusinesses(res.data?.data || res.data || []))
      .catch(() => {});
  }, []);

  const handleAnalyze = async () => {
    if (!businessId) {
      setError('Please select a business.');
      return;
    }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/quality/reputation-risk-alert', {
        business_id: parseInt(businessId),
      });
      setResult(res.data?.alert || res.data?.data || res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Analysis failed');
    } finally {
      setLoading(false);
    }
  };

  const levelColor = (level) => {
    const s = String(level || '').toLowerCase();
    if (s.includes('critical') || s.includes('crisis') || s.includes('high')) return '#dc2626';
    if (s.includes('medium') || s.includes('moderate') || s.includes('warning')) return '#d97706';
    return '#16a34a';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Reputation Risk Alert</h1>
        <p>Pulls last 50 reviews and flags reputation crisis trajectory + actions</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: 24 }}>
        <div className="ai-preset-bar"><span>{businesses.length ? 'Choose an existing business to review' : 'Add or load a real business before analyzing risk'}</span><div>{businesses.slice(0, 3).map((business, index) => <button key={business.id} type="button" className="btn btn-secondary" onClick={() => selectSampleBusiness(index)}>{business.name}</button>)}</div></div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end' }}>
          <div style={{ flex: 1 }}>
            <label className="form-label">Business</label>
            <select
              className="form-input"
              value={businessId}
              onChange={e => setBusinessId(e.target.value)}
            >
              <option value="">Select a business...</option>
              {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" onClick={handleAnalyze} disabled={loading || !businessId}>
            {loading ? 'Analyzing…' : 'Analyze Risk'}
          </button>
        </div>
      </div>

      {result !== null && <FormattedAIReport response={result} title='Reputation risk alert' />}

    </div>
  );
};

export default ReputationRiskAlert;
