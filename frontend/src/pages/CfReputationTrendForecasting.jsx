import FormattedAIReport from "../components/FormattedAIReport";
// // === Batch 07 Gaps & Frontend Mounts ===
import React, { useState } from 'react';

export default function CfReputationTrendForecasting() {
  const [input, setInput] = useState('');
  const [output, setOutput] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const sampleRequests = [
    { label: "Late delivery", value: "Use Reputation trend forecasting for a neighborhood cafe with two recent Google reviews: 2 stars on Oct 3: \"My pickup order was 35 minutes late and nobody explained the delay.\" 4 stars on Oct 5: \"The staff apologized and fixed my order quickly.\" Identify customer impact, a practical response, and follow-up actions. State any missing data." },
    { label: "Billing concern", value: "Use Reputation trend forecasting for a local service business. A Yelp customer rated 1 star after seeing two charges for one appointment; staff say one may be a pending authorization. Draft or analyze a careful reply that acknowledges the concern without claiming a refund was issued. Include what to verify privately and the next owner action." },
    { label: "Weekly trend", value: "Use Reputation trend forecasting for a small retail shop. This week, three reviews mention long checkout lines (2, 3, and 2 stars), while two praise staff advice (5 stars each). Summarize the pattern, prioritize a realistic operational response, and distinguish observed facts from assumptions." }
  ];

  const applySampleRequest = (value) => {
    setInput(value);
    setError(null);
  };

  async function run() {
    setLoading(true); setError(null); setOutput(null);
    try {
      const token = (typeof localStorage !== 'undefined' && localStorage.getItem('token')) || '';
      const res = await fetch('/api/cf-reputation-trend-forecasting', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ input }),
      });
      const ct = res.headers.get('content-type') || '';
      const data = ct.includes('json') ? await res.json() : { text: await res.text() };
      if (!res.ok) throw new Error((data && data.error) || res.statusText);
      setOutput(data);
    } catch (e) {
      setError(e && e.message ? e.message : 'Request failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ padding: 24, maxWidth: 900, margin: '0 auto', fontFamily: 'system-ui, sans-serif' }}>
      <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>Reputation trend forecasting</h1>
      <p style={{ color: '#666', marginBottom: 16 }}>AIReviewResponseManager - Custom feature</p>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 10 }}>
          {sampleRequests.map((sample) => (
            <button
              key={sample.label}
              type="button"
              onClick={() => applySampleRequest(sample.value)}
              style={{ padding: '6px 10px', background: '#eef2ff', color: '#1e3a8a', border: '1px solid #c7d2fe', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontWeight: 600 }}
            >
              {sample.label}
            </button>
          ))}
        </div>

      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Describe inputs or paste context..."
        style={{ width: '100%', minHeight: 160, padding: 10, border: '1px solid #ddd', borderRadius: 6, fontFamily: 'inherit' }}
      />
      <div style={{ marginTop: 12 }}>
        <button onClick={run} disabled={loading}
          style={{ padding: '8px 16px', background: '#111', color: '#fff', border: 0, borderRadius: 6, cursor: 'pointer' }}>
          {loading ? 'Running...' : 'Run'}
        </button>
      </div>
      {error && (
        <div style={{ marginTop: 16, padding: 12, background: '#fee', color: '#900', borderRadius: 6 }}>{error}</div>
      )}
      {output && (
        <FormattedAIReport response={output} />
      )}
    </div>
  );
}
