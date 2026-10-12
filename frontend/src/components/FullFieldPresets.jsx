import React from 'react';

const LABELS = ['Scenario', 'Data sample', 'Executive review'];

/**
 * Fill every field (required and optional) with a realistic example.
 * Reuse the shared `choices` map to steer select-ish fields per variant.
 */
export function fillEveryField(values, variant = 0, choices = {}) {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => {
    if (/(?:^id$|_id$|Id$|file|upload|attachment|record)/i.test(key) || (typeof File !== 'undefined' && value instanceof File) || (typeof Blob !== 'undefined' && value instanceof Blob)) return [key, value];
    if (choices[key]) return [key, choices[key][variant % choices[key].length]];
    if (Array.isArray(value)) return [key, value.length ? value : [`${LABELS[variant]} item one`, `${LABELS[variant]} item two`]];
    if (value && typeof value === 'object') return [key, value];
    if (typeof value === 'boolean') return [key, true];
    if (/date|deadline/.test(key)) return [key, new Date(Date.now() + (variant + 7) * 86400000).toISOString().slice(0, 10)];
    if (/email/.test(key)) return [key, `demo${variant + 1}@example.com`];
    if (typeof value === 'number') return [key, [10, 25, 50][variant]];
    return [key, `${LABELS[variant]} example for ${String(key).replace(/[_-]+/g, ' ')}: review and edit before generating.`];
  }));
}

export default function FullFieldPresets({ value, onChange, choices = {}, presets, disabled = false, labels }) {
  const names = labels || (presets ? presets.map((preset) => preset.label) : LABELS.map((label) => `${label} example`));
  return (
    <div className="ai-preset-bar">
      <div>
        <strong>Fill every field</strong>
        <p>Each example fills required and optional fields. Review and edit before generating.</p>
      </div>
      <div className="ai-actions">
        {names.map((label, index) => (
          <button
            type="button"
            className="btn btn-secondary"
            key={label}
            disabled={disabled}
            onClick={() => onChange(presets ? { ...value, ...presets[index].values } : fillEveryField(value, index, choices))}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
