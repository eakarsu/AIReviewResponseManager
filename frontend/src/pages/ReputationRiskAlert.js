import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ReputationRiskAlert = () => {
  const [businesses, setBusinesses] = useState([]);
  const [businessId, setBusinessId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

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

      {result && (
        <div className="card">
          {(result.riskLevel || result.risk_level) && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <span style={{
                background: levelColor(result.riskLevel || result.risk_level) + '22',
                color: levelColor(result.riskLevel || result.risk_level),
                padding: '6px 12px',
                borderRadius: 16,
                fontWeight: 600,
                fontSize: 14
              }}>
                {String(result.riskLevel || result.risk_level).toUpperCase()}
              </span>
              {result.score != null && <span style={{ color: '#6b7280' }}>Score: <strong>{result.score}</strong></span>}
            </div>
          )}

          {result.summary && <p style={{ color: '#374151', lineHeight: 1.6 }}>{result.summary}</p>}

          {result.trajectory && (
            <div style={{ marginTop: 12 }}>
              <h3>Trajectory</h3>
              <p style={{ color: '#374151' }}>{typeof result.trajectory === 'string' ? result.trajectory : JSON.stringify(result.trajectory)}</p>
            </div>
          )}

          {Array.isArray(result.warning_signs) && result.warning_signs.length > 0 && (
            <Section title="Warning Signs" items={result.warning_signs} color="#dc2626" />
          )}
          {Array.isArray(result.warningSigns) && result.warningSigns.length > 0 && (
            <Section title="Warning Signs" items={result.warningSigns} color="#dc2626" />
          )}
          {Array.isArray(result.themes) && result.themes.length > 0 && (
            <Section title="Recurring Themes" items={result.themes} color="#374151" />
          )}
          {Array.isArray(result.actions) && result.actions.length > 0 && (
            <Section title="Recommended Actions" items={result.actions} color="#1d4ed8" />
          )}
          {Array.isArray(result.recommendations) && result.recommendations.length > 0 && (
            <Section title="Recommendations" items={result.recommendations} color="#1d4ed8" />
          )}
        </div>
      )}
    </div>
  );
};

const Section = ({ title, items, color }) => (
  <div style={{ marginTop: 12 }}>
    <h3>{title}</h3>
    <ul style={{ paddingLeft: 20, color }}>
      {items.map((it, i) => <li key={i}>{typeof it === 'string' ? it : JSON.stringify(it)}</li>)}
    </ul>
  </div>
);

export default ReputationRiskAlert;
