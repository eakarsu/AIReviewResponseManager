import React, { useState } from 'react';
import api from '../services/api';

const ResponseQualityScorer = () => {
  const [reviewText, setReviewText] = useState('');
  const [responseText, setResponseText] = useState('');
  const [brandVoice, setBrandVoice] = useState('professional, warm, concise');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reviewText.trim() || !responseText.trim()) {
      setError('Please provide both the review and your response.');
      return;
    }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/quality/score-response', {
        review: reviewText,
        response: responseText,
        brandVoice,
      });
      setResult(res.data?.score || res.data?.data || res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Scoring failed');
    } finally {
      setLoading(false);
    }
  };

  const dimColor = (s) => {
    if (s >= 8) return '#22c55e';
    if (s >= 5) return '#eab308';
    return '#ef4444';
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Response Quality Scorer</h1>
        <p>Score response quality across 6 dimensions vs. the original review and brand voice</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Original Review</label>
          <textarea
            className="form-input"
            rows={5}
            value={reviewText}
            onChange={e => setReviewText(e.target.value)}
            placeholder="Paste the customer review here..."
          />
        </div>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Drafted Response</label>
          <textarea
            className="form-input"
            rows={5}
            value={responseText}
            onChange={e => setResponseText(e.target.value)}
            placeholder="Paste the response you want scored..."
          />
        </div>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Brand Voice</label>
          <input
            type="text"
            className="form-input"
            value={brandVoice}
            onChange={e => setBrandVoice(e.target.value)}
          />
        </div>
        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Scoring…' : 'Score Response'}
        </button>
      </form>

      {result && (
        <div className="card">
          <h2 style={{ marginTop: 0 }}>Quality Score</h2>
          {result.overallScore != null && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 12 }}>
              <div style={{ width: 80, height: 80, borderRadius: '50%', background: dimColor(result.overallScore) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', border: `4px solid ${dimColor(result.overallScore)}` }}>
                <span style={{ fontSize: 22, fontWeight: 700, color: dimColor(result.overallScore) }}>{result.overallScore}</span>
              </div>
              <div>
                <div style={{ fontSize: 14, color: '#6b7280' }}>Overall Quality</div>
                {result.verdict && <div style={{ fontSize: 18, fontWeight: 600 }}>{result.verdict}</div>}
              </div>
            </div>
          )}
          {result.summary && <p style={{ color: '#374151', lineHeight: 1.6 }}>{result.summary}</p>}

          {result.dimensions && typeof result.dimensions === 'object' && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12, marginTop: 12 }}>
              {Object.entries(result.dimensions).map(([k, v]) => {
                const score = typeof v === 'object' ? v.score : v;
                const note = typeof v === 'object' ? (v.notes || v.feedback) : null;
                return (
                  <div key={k} style={{ padding: 12, border: '1px solid #e5e7eb', borderRadius: 8 }}>
                    <div style={{ fontSize: 12, color: '#6b7280', textTransform: 'capitalize' }}>{k.replace(/_/g, ' ')}</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: dimColor(Number(score) || 0) }}>{score}</div>
                    {note && <div style={{ fontSize: 12, color: '#374151', marginTop: 4 }}>{note}</div>}
                  </div>
                );
              })}
            </div>
          )}

          {Array.isArray(result.improvements) && result.improvements.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <h3>Improvements</h3>
              <ul style={{ paddingLeft: 20 }}>
                {result.improvements.map((s, i) => <li key={i}>{typeof s === 'string' ? s : JSON.stringify(s)}</li>)}
              </ul>
            </div>
          )}

          {result.improved_response && (
            <div style={{ marginTop: 16 }}>
              <h3>Suggested Improved Response</h3>
              <pre style={{ background: '#f9fafb', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap' }}>{result.improved_response}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ResponseQualityScorer;
