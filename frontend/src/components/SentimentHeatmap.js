import React, { useEffect, useState } from 'react';
import api from '../services/api';

const SentimentHeatmap = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/custom-views/sentiment-heatmap');
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load heatmap');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading sentiment heatmap...</div>;
  if (error) return <div style={{ padding: 16, color: '#dc2626' }}>{error}</div>;
  if (!data) return null;

  const { platforms = [], ratings = [], matrix = {} } = data;
  let maxVal = 1;
  platforms.forEach(p => ratings.forEach(r => { maxVal = Math.max(maxVal, matrix[p]?.[r] || 0); }));

  const cellColor = (val) => {
    const intensity = val / maxVal;
    const r = Math.round(255 - intensity * 155);
    const g = Math.round(255 - intensity * 100);
    const b = Math.round(255 - intensity * 50);
    return `rgb(${r},${g},${b})`;
  };

  return (
    <div className="card" style={{ padding: 20, background: '#ffffff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h3 style={{ margin: 0, marginBottom: 12, color: '#1e40af' }}>Sentiment Heatmap (Platform x Rating)</h3>
      <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 12 }}>
        Total reviews analyzed: {data.total_reviews}
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <thead>
          <tr>
            <th style={{ padding: 8, fontSize: 12, textAlign: 'left', borderBottom: '2px solid #e5e7eb' }}>Platform</th>
            {ratings.map(r => (
              <th key={r} style={{ padding: 8, fontSize: 12, textAlign: 'center', borderBottom: '2px solid #e5e7eb' }}>{r}★</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {platforms.map(p => (
            <tr key={p}>
              <td style={{ padding: 8, fontSize: 13, fontWeight: 600, textTransform: 'capitalize' }}>{p}</td>
              {ratings.map(r => {
                const v = matrix[p]?.[r] || 0;
                return (
                  <td key={r}
                      style={{ padding: 0, textAlign: 'center', border: '1px solid #e5e7eb',
                               background: cellColor(v), fontWeight: 600, fontSize: 13, color: v / maxVal > 0.5 ? '#fff' : '#111827' }}>
                    <div style={{ padding: '14px 4px' }}>{v}</div>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>

      <div style={{ marginTop: 14, display: 'flex', gap: 16, fontSize: 12, color: '#374151' }}>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#ef4444', marginRight: 6, verticalAlign: 'middle' }} />Low rating (1-2)</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#eab308', marginRight: 6, verticalAlign: 'middle' }} />Neutral (3)</span>
        <span><span style={{ display: 'inline-block', width: 12, height: 12, background: '#22c55e', marginRight: 6, verticalAlign: 'middle' }} />High rating (4-5)</span>
      </div>
    </div>
  );
};

export default SentimentHeatmap;
