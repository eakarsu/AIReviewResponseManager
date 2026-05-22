import React, { useState } from 'react';

const ResponseTemplatePDF = () => {
  const [category, setCategory] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [error, setError] = useState('');
  const [lastDownloadedAt, setLastDownloadedAt] = useState(null);

  const handleDownload = async () => {
    setDownloading(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const url = `${process.env.REACT_APP_API_URL || 'http://localhost:3001/api'}/custom-views/template-library/pdf${category ? `?category=${encodeURIComponent(category)}` : ''}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to download PDF');
      const blob = await res.blob();
      const blobUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `response-template-library${category ? `-${category}` : ''}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(blobUrl);
      setLastDownloadedAt(new Date().toLocaleTimeString());
    } catch (e) {
      setError(e.message || 'Download failed');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="card" style={{ padding: 20, background: '#ffffff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h3 style={{ margin: 0, marginBottom: 8, color: '#1e40af' }}>Response Template Library PDF</h3>
      <p style={{ margin: 0, marginBottom: 14, color: '#6b7280', fontSize: 13 }}>
        Export your saved response templates as a printable PDF playbook for the team.
      </p>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
        <div>
          <label style={{ display: 'block', fontSize: 12, color: '#374151', marginBottom: 4 }}>Filter by category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            style={{ padding: '6px 10px', borderRadius: 4, border: '1px solid #d1d5db', minWidth: 180 }}
          >
            <option value="">All categories</option>
            <option value="positive">Positive</option>
            <option value="negative">Negative</option>
            <option value="neutral">Neutral</option>
            <option value="apology">Apology</option>
            <option value="thank_you">Thank You</option>
          </select>
        </div>
        <button
          onClick={handleDownload}
          disabled={downloading}
          style={{
            padding: '10px 18px', background: '#1e40af', color: 'white', border: 'none',
            borderRadius: 6, cursor: 'pointer', fontWeight: 600, marginTop: 18,
          }}
        >
          {downloading ? 'Generating...' : 'Download PDF'}
        </button>
      </div>

      {lastDownloadedAt && (
        <div style={{ marginTop: 12, fontSize: 12, color: '#059669' }}>
          Last download: {lastDownloadedAt}
        </div>
      )}
      {error && <div style={{ marginTop: 10, color: '#dc2626', fontSize: 13 }}>{error}</div>}
    </div>
  );
};

export default ResponseTemplatePDF;
