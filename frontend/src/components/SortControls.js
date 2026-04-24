import React from 'react';

const SortControls = ({ sortBy, sortOrder, onSortChange, options }) => {
  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
      <select
        value={sortBy}
        onChange={(e) => onSortChange(e.target.value, sortOrder)}
        style={{
          padding: '8px 12px',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          fontSize: 14,
          outline: 'none',
          background: 'white'
        }}
      >
        <option value="">Sort by...</option>
        {options.map(opt => (
          <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
      </select>
      <button
        onClick={() => onSortChange(sortBy, sortOrder === 'asc' ? 'desc' : 'asc')}
        style={{
          padding: '8px 12px',
          border: '1px solid #e2e8f0',
          borderRadius: 8,
          fontSize: 14,
          cursor: 'pointer',
          background: 'white',
          minWidth: 36
        }}
        title={sortOrder === 'asc' ? 'Ascending' : 'Descending'}
      >
        {sortOrder === 'asc' ? '\u2191' : '\u2193'}
      </button>
    </div>
  );
};

export default SortControls;
