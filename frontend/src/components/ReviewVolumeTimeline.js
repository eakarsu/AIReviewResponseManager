import React, { useEffect, useState } from 'react';
import api from '../services/api';

const ReviewVolumeTimeline = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [days, setDays] = useState(30);

  const load = async (d = days) => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get(`/custom-views/volume-timeline?days=${d}`);
      setData(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load timeline');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(days); /* eslint-disable-next-line */ }, []);

  if (loading) return <div style={{ padding: 16 }}>Loading volume timeline...</div>;
  if (error) return <div style={{ padding: 16, color: '#dc2626' }}>{error}</div>;
  if (!data) return null;

  const timeline = data.timeline || [];
  const maxCount = Math.max(1, ...timeline.map(t => t.count));

  return (
    <div className="card" style={{ padding: 20, background: '#ffffff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <h3 style={{ margin: 0, color: '#1e40af' }}>Review Volume Timeline</h3>
        <div>
          <label style={{ marginRight: 8, fontSize: 13 }}>Days:</label>
          <select
            value={days}
            onChange={(e) => { const d = parseInt(e.target.value, 10); setDays(d); load(d); }}
            style={{ padding: '4px 8px', borderRadius: 4, border: '1px solid #d1d5db' }}
          >
            <option value={7}>7</option>
            <option value={14}>14</option>
            <option value={30}>30</option>
            <option value={60}>60</option>
            <option value={90}>90</option>
          </select>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13, color: '#374151' }}>
        <div><strong>Total:</strong> {data.summary?.total_reviews ?? 0}</div>
        <div><strong>Avg Rating:</strong> {data.summary?.average_rating ?? 0} stars</div>
        <div><strong>Peak Day:</strong> {data.summary?.peak_day || '-'} ({data.summary?.peak_count || 0})</div>
      </div>

      <div style={{ display: 'flex', alignItems: 'flex-end', height: 160, gap: 2, padding: '0 4px', borderBottom: '1px solid #e5e7eb' }}>
        {timeline.map((t, i) => {
          const h = Math.round((t.count / maxCount) * 150);
          const color = t.avg_rating >= 4 ? '#22c55e' : t.avg_rating >= 3 ? '#eab308' : '#ef4444';
          return (
            <div key={i} title={`${t.day}: ${t.count} reviews, ${t.avg_rating}★`}
                 style={{ flex: 1, height: h, background: color, borderRadius: '2px 2px 0 0', minHeight: 2 }} />
          );
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 10, color: '#6b7280', marginTop: 6 }}>
        <span>{timeline[0]?.day || ''}</span>
        <span>{timeline[timeline.length - 1]?.day || ''}</span>
      </div>
    </div>
  );
};

export default ReviewVolumeTimeline;
