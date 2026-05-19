import React, { useState, useEffect } from 'react';
import api from '../services/api';

const ReputationScore = () => {
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [scoreData, setScoreData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savingConfig, setSavingConfig] = useState(false);
  const [configForm, setConfigForm] = useState({
    enabled: false,
    min_rating: 1,
    max_rating: 5,
    tone: 'professional',
    signature: '- The Management Team',
  });

  useEffect(() => {
    fetchBusinesses();
  }, []);

  const fetchBusinesses = async () => {
    try {
      const res = await api.get('/businesses');
      const list = res.data?.data || res.data || [];
      setBusinesses(list);
    } catch (e) {
      setError('Failed to load businesses');
    }
  };

  const fetchReputationScore = async () => {
    if (!selectedBusiness) return;
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/businesses/${selectedBusiness}/reputation-score`);
      setScoreData(res.data);
      const configRes = await api.get(`/businesses/${selectedBusiness}/auto-respond-config`);
      setConfigForm({
        enabled: configRes.data.enabled || false,
        min_rating: configRes.data.min_rating || 1,
        max_rating: configRes.data.max_rating || 5,
        tone: configRes.data.tone || 'professional',
        signature: configRes.data.signature || '- The Management Team',
      });
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load reputation score');
    } finally {
      setLoading(false);
    }
  };

  const saveAutoConfig = async () => {
    if (!selectedBusiness) return;
    setSavingConfig(true);
    try {
      await api.post(`/businesses/${selectedBusiness}/auto-respond-config`, configForm);
      alert('Auto-respond configuration saved!');
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save configuration');
    } finally {
      setSavingConfig(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return '#22c55e';
    if (score >= 60) return '#eab308';
    if (score >= 40) return '#f97316';
    return '#ef4444';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Reputation Score</h1>
        <p>AI-powered composite reputation analysis (0-100) with auto-respond config</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <div className="card" style={{ marginBottom: '24px' }}>
        <h3>Select Business</h3>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginTop: '12px' }}>
          <select
            value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}
            className="form-input"
            style={{ flex: 1 }}
          >
            <option value="">-- Select a business --</option>
            {businesses.map(b => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button className="btn btn-primary" onClick={fetchReputationScore} disabled={!selectedBusiness || loading}>
            {loading ? 'Analyzing...' : 'Compute Score'}
          </button>
        </div>
      </div>

      {scoreData && (
        <>
          <div className="card" style={{ marginBottom: '24px' }}>
            <h2>{scoreData.business_name}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: '40px', margin: '24px 0' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{
                  width: '120px', height: '120px', borderRadius: '50%',
                  background: `conic-gradient(${getScoreColor(scoreData.composite_score)} ${scoreData.composite_score * 3.6}deg, #e5e7eb 0deg)`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative'
                }}>
                  <div style={{
                    width: '88px', height: '88px', borderRadius: '50%', background: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column'
                  }}>
                    <span style={{ fontSize: '32px', fontWeight: 800, color: getScoreColor(scoreData.composite_score) }}>
                      {scoreData.composite_score}
                    </span>
                    <span style={{ fontSize: '10px', color: '#6b7280' }}>/ 100</span>
                  </div>
                </div>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                  {Object.entries(scoreData.metrics || {}).map(([k, v]) => (
                    <div key={k} style={{ background: '#f9fafb', borderRadius: '8px', padding: '10px', textAlign: 'center' }}>
                      <div style={{ fontSize: '20px', fontWeight: 700 }}>{v}</div>
                      <div style={{ fontSize: '11px', color: '#6b7280' }}>{k.replace(/_/g, ' ')}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {scoreData.ai_narrative && (
              <div style={{ background: '#eff6ff', borderRadius: '8px', padding: '16px' }}>
                <h4 style={{ color: '#1e40af', marginBottom: '8px' }}>AI Narrative</h4>
                <p style={{ color: '#1e3a8a', lineHeight: '1.6' }}>{scoreData.ai_narrative.narrative}</p>
                {scoreData.ai_narrative.priority_action && (
                  <div style={{ marginTop: '10px', padding: '8px', background: '#fefce8', borderRadius: '6px' }}>
                    <strong>Priority Action: </strong>
                    <span style={{ fontSize: '13px' }}>{scoreData.ai_narrative.priority_action}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="card">
            <h3 style={{ marginBottom: '16px' }}>Auto-Respond Configuration</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <label className="form-label" style={{ gridColumn: '1/-1' }}>
                <input type="checkbox" checked={configForm.enabled}
                  onChange={(e) => setConfigForm({ ...configForm, enabled: e.target.checked })}
                  style={{ marginRight: '8px' }} />
                Enable Auto-Respond for new reviews
              </label>
              <div className="form-group">
                <label className="form-label">Tone</label>
                <select className="form-input" value={configForm.tone}
                  onChange={(e) => setConfigForm({ ...configForm, tone: e.target.value })}>
                  <option value="professional">Professional</option>
                  <option value="friendly">Friendly</option>
                  <option value="apologetic">Apologetic</option>
                  <option value="grateful">Grateful</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Respond to ratings</label>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <select className="form-input" value={configForm.min_rating}
                    onChange={(e) => setConfigForm({ ...configForm, min_rating: parseInt(e.target.value) })}>
                    {[1,2,3,4,5].map(r => <option key={r} value={r}>{r}★</option>)}
                  </select>
                  <span>to</span>
                  <select className="form-input" value={configForm.max_rating}
                    onChange={(e) => setConfigForm({ ...configForm, max_rating: parseInt(e.target.value) })}>
                    {[1,2,3,4,5].map(r => <option key={r} value={r}>{r}★</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group" style={{ gridColumn: '1/-1' }}>
                <label className="form-label">Signature</label>
                <input type="text" className="form-input" value={configForm.signature}
                  onChange={(e) => setConfigForm({ ...configForm, signature: e.target.value })} />
              </div>
            </div>
            <button className="btn btn-primary" onClick={saveAutoConfig} disabled={savingConfig} style={{ marginTop: '16px' }}>
              {savingConfig ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default ReputationScore;
