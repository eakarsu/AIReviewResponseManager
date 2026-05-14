import React, { useState, useEffect } from 'react';
import api from '../services/api';

const BulkImport = () => {
  const [businesses, setBusinesses] = useState([]);
  const [selectedBusiness, setSelectedBusiness] = useState('');
  const [csvText, setCsvText] = useState('');
  const [jsonText, setJsonText] = useState('');
  const [inputMode, setInputMode] = useState('csv');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const CSV_TEMPLATE = `platform,reviewer_name,rating,review_text,review_date,external_id
google,Jane Smith,5,"Excellent service and great food!",2024-01-15,ext_001
yelp,Bob Jones,3,"Decent but could be better",2024-01-20,ext_002`;

  useEffect(() => {
    api.get('/businesses').then(res => {
      setBusinesses(res.data?.data || res.data || []);
    }).catch(() => {});
  }, []);

  const parseCSV = (csv) => {
    const lines = csv.trim().split('\n');
    if (lines.length < 2) return [];
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    return lines.slice(1).map(line => {
      const values = line.match(/(".*?"|[^,]+)(?=,|$)/g) || [];
      const obj = {};
      headers.forEach((h, i) => {
        obj[h] = (values[i] || '').replace(/^"|"$/g, '').trim();
      });
      return obj;
    });
  };

  const handleImport = async () => {
    if (!selectedBusiness) {
      setError('Please select a business');
      return;
    }
    setLoading(true);
    setError('');
    setResult(null);

    try {
      let reviews = [];
      if (inputMode === 'csv') {
        reviews = parseCSV(csvText);
      } else {
        reviews = JSON.parse(jsonText);
      }

      if (reviews.length === 0) {
        setError('No valid reviews to import');
        setLoading(false);
        return;
      }

      // Convert rating to integer
      reviews = reviews.map(r => ({ ...r, rating: parseInt(r.rating) || 3 }));

      const res = await api.post('/reviews/bulk-import', {
        reviews,
        business_id: parseInt(selectedBusiness)
      });
      setResult(res.data);
    } catch (e) {
      setError(e.response?.data?.error || e.message || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Bulk Review Import</h1>
        <p>Import reviews from CSV or JSON. Duplicates (by external_id + platform) are automatically skipped. Sentiment analysis runs on each imported review.</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {result && (
        <div style={{ background: '#f0fdf4', border: '1px solid #22c55e', borderRadius: '8px', padding: '16px', marginBottom: '24px' }}>
          <h4 style={{ color: '#15803d', marginBottom: '8px' }}>Import Complete</h4>
          <p>{result.message}</p>
          {result.errors?.length > 0 && (
            <div style={{ marginTop: '8px' }}>
              <strong>Errors:</strong>
              <ul style={{ marginTop: '4px', paddingLeft: '20px', fontSize: '13px', color: '#dc2626' }}>
                {result.errors.slice(0, 5).map((e, i) => <li key={i}>{e.error}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="card">
        <div style={{ marginBottom: '20px' }}>
          <label className="form-label">Business</label>
          <select className="form-input" value={selectedBusiness}
            onChange={(e) => setSelectedBusiness(e.target.value)}>
            <option value="">-- Select a business --</option>
            {businesses.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <button className={`btn ${inputMode === 'csv' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setInputMode('csv')}>CSV</button>
            <button className={`btn ${inputMode === 'json' ? 'btn-primary' : 'btn-outline'}`}
              onClick={() => setInputMode('json')}>JSON</button>
          </div>

          {inputMode === 'csv' ? (
            <>
              <div style={{ marginBottom: '8px', fontSize: '13px', color: '#6b7280' }}>
                Required columns: <code>platform, reviewer_name, rating, review_text</code>. Optional: <code>review_date, external_id, reviewer_avatar</code>
              </div>
              <button className="btn btn-outline" style={{ marginBottom: '8px', fontSize: '12px' }}
                onClick={() => setCsvText(CSV_TEMPLATE)}>Load Template</button>
              <textarea
                className="form-input"
                rows={10}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder={CSV_TEMPLATE}
                style={{ fontFamily: 'monospace', fontSize: '13px' }}
              />
            </>
          ) : (
            <>
              <div style={{ marginBottom: '8px', fontSize: '13px', color: '#6b7280' }}>
                JSON array of objects with fields: platform, reviewer_name, rating, review_text, etc.
              </div>
              <textarea
                className="form-input"
                rows={10}
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder='[{"platform":"google","reviewer_name":"Jane","rating":5,"review_text":"Great!"}]'
                style={{ fontFamily: 'monospace', fontSize: '13px' }}
              />
            </>
          )}
        </div>

        <button className="btn btn-primary btn-lg" onClick={handleImport} disabled={loading || !selectedBusiness}>
          {loading ? 'Importing & Analyzing Sentiment...' : 'Import Reviews'}
        </button>
      </div>
    </div>
  );
};

export default BulkImport;
