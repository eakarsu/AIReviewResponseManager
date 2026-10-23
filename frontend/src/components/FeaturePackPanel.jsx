import React from 'react';
// Feature pack (wave 44A): labelled detail sections. false/0/'' are shown, never hidden.
export function formatDetailValue(value) {
  if (value === false) return 'false';
  if (value === 0) return '0';
  if (value === '') return '(empty)';
  if (value == null) return '(not set)';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}
export default function FeaturePackPanel({ sections = [], aiResult = null, tasks = [] }) {
  return (
    <section aria-label="Feature pack">
      <h2>Details</h2>
      <dl>
        {sections.map((s) => (
          <div key={s.key || s.label}>
            <dt>{s.label}</dt>
            <dd>{formatDetailValue('value' in s ? s.value : s.display)}</dd>
          </div>
        ))}
      </dl>
      <h2>Tasks</h2>
      {tasks.length === 0 ? <p>No tasks yet.</p> : (
        <ul>{tasks.map((t) => <li key={t.id}>{t.title} — {t.status} — completed: {formatDetailValue(t.completed)} — estimateHours: {formatDetailValue(t.estimateHours)}</li>)}</ul>
      )}
      {aiResult ? (
        <div>
          <h2>AI insight (deterministic fallback)</h2>
          <p>aiGenerated: {formatDetailValue(aiResult.aiGenerated)}</p>
          <p>{aiResult.label}</p>
          <pre>{JSON.stringify(aiResult, null, 2)}</pre>
        </div>
      ) : null}
      <p>
        <a href="/api/feature-pack/export?format=csv">Export CSV</a>{' | '}
        <a href="/api/feature-pack/export?format=json">Export JSON</a>
      </p>
    </section>
  );
}
