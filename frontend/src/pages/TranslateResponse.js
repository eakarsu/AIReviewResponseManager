import React, { useState } from 'react';
import api from '../services/api';

const COMMON_LANGS = ['Spanish', 'French', 'German', 'Italian', 'Portuguese', 'Dutch', 'Polish', 'Turkish', 'Arabic', 'Hindi', 'Chinese (Simplified)', 'Chinese (Traditional)', 'Japanese', 'Korean'];

const TranslateResponse = () => {
  const [responseText, setResponseText] = useState('');
  const [languages, setLanguages] = useState([]);
  const [customLang, setCustomLang] = useState('');
  const [tone, setTone] = useState('match original');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);

  const toggleLang = (l) => {
    setLanguages(prev => prev.includes(l) ? prev.filter(x => x !== l) : [...prev, l]);
  };

  const addCustomLang = () => {
    const l = customLang.trim();
    if (l && !languages.includes(l)) {
      setLanguages(prev => [...prev, l]);
      setCustomLang('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!responseText.trim() || languages.length === 0) {
      setError('Please provide a response and select at least one target language.');
      return;
    }
    setLoading(true); setError(''); setResult(null);
    try {
      const res = await api.post('/quality/translate-response', {
        response: responseText,
        languages,
        tone,
      });
      setResult(res.data?.translations || res.data?.data || res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Translation failed');
    } finally {
      setLoading(false);
    }
  };

  const translationsList = Array.isArray(result?.translations)
    ? result.translations
    : (Array.isArray(result) ? result : null);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Translate Response</h1>
        <p>Multi-language translation with back-translation QA</p>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      <form className="card" onSubmit={handleSubmit} style={{ marginBottom: 24 }}>
        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Response Text</label>
          <textarea
            className="form-input"
            rows={6}
            value={responseText}
            onChange={e => setResponseText(e.target.value)}
            placeholder="Paste the response you want translated..."
          />
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Target Languages</label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 6 }}>
            {COMMON_LANGS.map(l => (
              <button
                type="button"
                key={l}
                onClick={() => toggleLang(l)}
                style={{
                  padding: '4px 10px',
                  borderRadius: 999,
                  border: '1px solid ' + (languages.includes(l) ? '#6366f1' : '#d1d5db'),
                  background: languages.includes(l) ? '#6366f1' : '#fff',
                  color: languages.includes(l) ? '#fff' : '#374151',
                  cursor: 'pointer',
                  fontSize: 13
                }}
              >
                {l}
              </button>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
            <input
              type="text"
              className="form-input"
              value={customLang}
              onChange={e => setCustomLang(e.target.value)}
              placeholder="Add custom language"
            />
            <button type="button" className="btn btn-secondary" onClick={addCustomLang}>Add</button>
          </div>
        </div>

        <div className="form-group" style={{ marginBottom: 12 }}>
          <label className="form-label">Tone</label>
          <input
            type="text"
            className="form-input"
            value={tone}
            onChange={e => setTone(e.target.value)}
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading}>
          {loading ? 'Translating…' : 'Translate'}
        </button>
      </form>

      {translationsList && translationsList.length > 0 && (
        <div>
          {translationsList.map((t, i) => (
            <div key={i} className="card" style={{ marginBottom: 12 }}>
              <h3 style={{ marginTop: 0 }}>{t.language || t.target_language || `Translation ${i + 1}`}</h3>
              <pre style={{ background: '#f9fafb', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap' }}>{t.translation || t.text || ''}</pre>
              {t.back_translation && (
                <div style={{ marginTop: 8 }}>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>Back-translation (QA):</div>
                  <pre style={{ background: '#fef9c3', padding: 12, borderRadius: 8, whiteSpace: 'pre-wrap' }}>{t.back_translation}</pre>
                </div>
              )}
              {t.qa_notes && <div style={{ marginTop: 8, color: '#6b7280', fontSize: 13 }}>QA: {t.qa_notes}</div>}
              {t.confidence != null && <div style={{ marginTop: 4, color: '#6b7280', fontSize: 13 }}>Confidence: {t.confidence}</div>}
            </div>
          ))}
        </div>
      )}

      {result && !translationsList && (
        <div className="card">
          <pre style={{ whiteSpace: 'pre-wrap' }}>{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
};

export default TranslateResponse;
