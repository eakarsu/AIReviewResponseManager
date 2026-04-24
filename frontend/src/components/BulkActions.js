import React from 'react';
import './BulkActions.css';

const BulkActions = ({ selectedIds, totalItems, onSelectAll, onClearSelection, onBulkDelete, onBulkUpdate, updateOptions }) => {
  if (selectedIds.length === 0) return null;

  return (
    <div className="bulk-actions-bar">
      <div className="bulk-actions-info">
        <span>{selectedIds.length} item{selectedIds.length > 1 ? 's' : ''} selected</span>
        {selectedIds.length < totalItems ? (
          <button className="bulk-link" onClick={onSelectAll}>Select all {totalItems}</button>
        ) : (
          <button className="bulk-link" onClick={onClearSelection}>Clear selection</button>
        )}
      </div>
      <div className="bulk-actions-buttons">
        {updateOptions && updateOptions.length > 0 && (
          <select
            onChange={(e) => {
              if (e.target.value) {
                const opt = updateOptions.find(o => o.value === e.target.value);
                if (opt) onBulkUpdate(opt.updates);
                e.target.value = '';
              }
            }}
            defaultValue=""
            className="bulk-update-select"
          >
            <option value="" disabled>Bulk Update...</option>
            {updateOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        )}
        <button className="bulk-delete-btn" onClick={onBulkDelete}>
          Delete Selected
        </button>
      </div>
    </div>
  );
};

export default BulkActions;
