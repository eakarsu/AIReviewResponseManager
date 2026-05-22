import React, { useEffect, useState } from 'react';
import api from '../services/api';

const emptyForm = {
  trigger_phrase: '',
  sentiment_target: 'any',
  response_template: '',
  tone: 'professional',
  priority: 3,
  enabled: true,
};

const AutoReplyRulesEditor = () => {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await api.get('/custom-views/auto-reply-rules');
      setRules(res.data.rules || []);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to load rules');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const startEdit = (rule) => {
    setEditingId(rule.id);
    setForm({
      trigger_phrase: rule.trigger_phrase,
      sentiment_target: rule.sentiment_target,
      response_template: rule.response_template,
      tone: rule.tone,
      priority: rule.priority,
      enabled: rule.enabled,
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm(emptyForm);
  };

  const submit = async () => {
    if (!form.trigger_phrase.trim() || !form.response_template.trim()) {
      setError('Trigger phrase and response template are required');
      return;
    }
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await api.put(`/custom-views/auto-reply-rules/${editingId}`, form);
      } else {
        await api.post('/custom-views/auto-reply-rules', form);
      }
      cancelEdit();
      await load();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to save rule');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id) => {
    if (!window.confirm('Delete this auto-reply rule?')) return;
    try {
      await api.delete(`/custom-views/auto-reply-rules/${id}`);
      await load();
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to delete');
    }
  };

  return (
    <div className="card" style={{ padding: 20, background: '#ffffff', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h3 style={{ margin: 0, marginBottom: 8, color: '#1e40af' }}>Auto-Reply Rules</h3>
      <p style={{ margin: 0, marginBottom: 14, color: '#6b7280', fontSize: 13 }}>
        Define trigger phrases that match incoming reviews and the canned response they should auto-fill.
      </p>

      {error && <div style={{ color: '#dc2626', marginBottom: 10, fontSize: 13 }}>{error}</div>}

      <div style={{ border: '1px solid #e5e7eb', borderRadius: 6, padding: 14, marginBottom: 16, background: '#f9fafb' }}>
        <h4 style={{ margin: '0 0 10px 0', fontSize: 14 }}>{editingId ? `Edit Rule #${editingId}` : 'Add New Rule'}</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 10 }}>
          <input
            placeholder="Trigger phrase (e.g. 'great service')"
            value={form.trigger_phrase}
            onChange={(e) => setForm({ ...form, trigger_phrase: e.target.value })}
            style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
          <select
            value={form.sentiment_target}
            onChange={(e) => setForm({ ...form, sentiment_target: e.target.value })}
            style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          >
            <option value="any">Any sentiment</option>
            <option value="positive">Positive</option>
            <option value="neutral">Neutral</option>
            <option value="negative">Negative</option>
          </select>
          <select
            value={form.tone}
            onChange={(e) => setForm({ ...form, tone: e.target.value })}
            style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          >
            <option value="professional">Professional</option>
            <option value="friendly">Friendly</option>
            <option value="apologetic">Apologetic</option>
            <option value="grateful">Grateful</option>
          </select>
          <input
            type="number" min="1" max="10"
            placeholder="Priority"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: parseInt(e.target.value, 10) || 1 })}
            style={{ padding: 8, border: '1px solid #d1d5db', borderRadius: 4 }}
          />
        </div>
        <textarea
          placeholder="Response template"
          value={form.response_template}
          onChange={(e) => setForm({ ...form, response_template: e.target.value })}
          rows={3}
          style={{ width: '100%', padding: 8, border: '1px solid #d1d5db', borderRadius: 4, boxSizing: 'border-box' }}
        />
        <label style={{ display: 'inline-flex', alignItems: 'center', marginTop: 8, fontSize: 13 }}>
          <input
            type="checkbox"
            checked={form.enabled}
            onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
            style={{ marginRight: 6 }}
          />
          Enabled
        </label>
        <div style={{ marginTop: 12 }}>
          <button onClick={submit} disabled={saving}
                  style={{ padding: '8px 16px', background: '#1e40af', color: 'white', border: 'none', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>
            {saving ? 'Saving...' : editingId ? 'Update Rule' : 'Add Rule'}
          </button>
          {editingId && (
            <button onClick={cancelEdit}
                    style={{ marginLeft: 8, padding: '8px 16px', background: '#e5e7eb', color: '#111827', border: 'none', borderRadius: 4, cursor: 'pointer' }}>
              Cancel
            </button>
          )}
        </div>
      </div>

      <h4 style={{ margin: '0 0 10px 0', fontSize: 14 }}>Active Rules ({rules.length})</h4>
      {loading ? (
        <div>Loading...</div>
      ) : rules.length === 0 ? (
        <div style={{ color: '#6b7280', fontSize: 13 }}>No rules yet. Add one above.</div>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: 8 }}>Trigger</th>
              <th style={{ padding: 8 }}>Sentiment</th>
              <th style={{ padding: 8 }}>Tone</th>
              <th style={{ padding: 8 }}>Priority</th>
              <th style={{ padding: 8 }}>Enabled</th>
              <th style={{ padding: 8 }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map(r => (
              <tr key={r.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: 8, fontWeight: 600 }}>{r.trigger_phrase}</td>
                <td style={{ padding: 8 }}>{r.sentiment_target}</td>
                <td style={{ padding: 8 }}>{r.tone}</td>
                <td style={{ padding: 8 }}>{r.priority}</td>
                <td style={{ padding: 8 }}>{r.enabled ? 'Yes' : 'No'}</td>
                <td style={{ padding: 8 }}>
                  <button onClick={() => startEdit(r)} style={{ marginRight: 6, padding: '4px 10px', background: '#e0e7ff', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Edit</button>
                  <button onClick={() => remove(r.id)} style={{ padding: '4px 10px', background: '#fee2e2', color: '#991b1b', border: 'none', borderRadius: 4, cursor: 'pointer' }}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default AutoReplyRulesEditor;
