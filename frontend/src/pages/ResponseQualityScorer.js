import FormattedAIReport from '../components/FormattedAIReport';
import FullFieldPresets from '../components/FullFieldPresets';
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

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Response Quality Scorer</h1>
        <p>Score response quality across 6 dimensions vs. the original review and brand voice</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <FullFieldPresets
          value={{ reviewText, responseText, brandVoice }}
          presets={[
            { label: 'Scenario', values: { reviewText: 'My package arrived late and I could not reach support.', responseText: 'I am sorry about the delay. Please contact us with your order details so we can investigate and follow up.', brandVoice: 'empathetic, clear, concise' } },
            { label: 'Data sample', values: { reviewText: 'The staff were friendly and helped me find exactly what I needed.', responseText: 'Thank you for your kind words. We are glad the team could help and look forward to welcoming you again.', brandVoice: 'warm, appreciative, personal' } },
            { label: 'Executive review', values: { reviewText: 'I was billed twice and still have no refund.', responseText: 'We are sorry for the billing issue. Please reach us privately with your receipt so our billing team can review it promptly.', brandVoice: 'accountable, professional, reassuring' } },
          ]}
          disabled={loading}
          onChange={(next) => { setReviewText(next.reviewText); setResponseText(next.responseText); setBrandVoice(next.brandVoice); setError(''); }}
        />
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

      {result !== null && <FormattedAIReport response={result} title='Quality score' />}

    </div>
  );
};

export default ResponseQualityScorer;
