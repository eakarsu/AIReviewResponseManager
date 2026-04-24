import React from 'react';
import './AIOutputDisplay.css';

const AIOutputDisplay = ({ title, data, type = 'default' }) => {
  if (!data) return null;

  const renderValue = (value, key) => {
    if (value === null || value === undefined) {
      return <span className="ai-value ai-null">N/A</span>;
    }

    if (typeof value === 'boolean') {
      return (
        <span className={`ai-value ai-boolean ${value ? 'ai-true' : 'ai-false'}`}>
          {value ? 'Yes' : 'No'}
        </span>
      );
    }

    if (typeof value === 'number') {
      // Check if it's a percentage or score
      if (key?.toLowerCase().includes('score') || key?.toLowerCase().includes('probability') || key?.toLowerCase().includes('percent')) {
        return (
          <span className="ai-value ai-score">
            <span className="ai-score-bar" style={{ width: `${Math.min(value, 100)}%` }}></span>
            <span className="ai-score-text">{value}%</span>
          </span>
        );
      }
      return <span className="ai-value ai-number">{value}</span>;
    }

    if (Array.isArray(value)) {
      if (value.length === 0) return <span className="ai-value ai-empty">None</span>;
      return (
        <ul className="ai-list">
          {value.map((item, idx) => (
            <li key={idx} className="ai-list-item">{typeof item === 'object' ? JSON.stringify(item) : item}</li>
          ))}
        </ul>
      );
    }

    if (typeof value === 'object') {
      return (
        <div className="ai-nested">
          {Object.entries(value).map(([k, v]) => (
            <div key={k} className="ai-nested-item">
              <span className="ai-nested-key">{formatKey(k)}:</span>
              {renderValue(v, k)}
            </div>
          ))}
        </div>
      );
    }

    // String value
    if (value.length > 200) {
      return <p className="ai-value ai-text ai-text-long">{value}</p>;
    }
    return <span className="ai-value ai-text">{value}</span>;
  };

  const formatKey = (key) => {
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };

  const getTypeClass = () => {
    switch (type) {
      case 'success': return 'ai-output-success';
      case 'warning': return 'ai-output-warning';
      case 'danger': return 'ai-output-danger';
      case 'info': return 'ai-output-info';
      default: return '';
    }
  };

  const getRiskBadge = (riskLevel) => {
    const classes = {
      low: 'ai-badge-success',
      medium: 'ai-badge-warning',
      high: 'ai-badge-danger',
      critical: 'ai-badge-critical'
    };
    return classes[riskLevel?.toLowerCase()] || 'ai-badge-default';
  };

  const getStatusBadge = (status) => {
    const classes = {
      pending: 'ai-badge-warning',
      analyzed: 'ai-badge-info',
      verified: 'ai-badge-success',
      flagged: 'ai-badge-danger',
      escalated: 'ai-badge-critical',
      monitoring: 'ai-badge-info',
      active: 'ai-badge-success',
      paused: 'ai-badge-warning',
      draft: 'ai-badge-default',
      approved: 'ai-badge-success',
      generated: 'ai-badge-info',
      scheduled: 'ai-badge-warning',
      sent: 'ai-badge-success',
      ready: 'ai-badge-info'
    };
    return classes[status?.toLowerCase()] || 'ai-badge-default';
  };

  const getTrendIcon = (direction) => {
    switch (direction?.toLowerCase()) {
      case 'improving': return '📈';
      case 'declining': return '📉';
      case 'stable': return '➡️';
      default: return '📊';
    }
  };

  const getSentimentIcon = (sentiment) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return '😊';
      case 'negative': return '😞';
      case 'neutral': return '😐';
      default: return '🤔';
    }
  };

  // Render special fields with enhanced styling
  const renderSpecialField = (key, value) => {
    const lowerKey = key.toLowerCase();

    // Risk level badge
    if (lowerKey.includes('risk_level') || lowerKey === 'risklevel') {
      return (
        <span className={`ai-badge ${getRiskBadge(value)}`}>
          {value?.toUpperCase()}
        </span>
      );
    }

    // Status badge
    if (lowerKey === 'status' || lowerKey.includes('_status')) {
      return (
        <span className={`ai-badge ${getStatusBadge(value)}`}>
          {value?.charAt(0).toUpperCase() + value?.slice(1)}
        </span>
      );
    }

    // Trend direction
    if (lowerKey.includes('trend') && lowerKey.includes('direction')) {
      return (
        <span className="ai-trend">
          {getTrendIcon(value)} {value?.charAt(0).toUpperCase() + value?.slice(1)}
        </span>
      );
    }

    // Sentiment
    if (lowerKey.includes('sentiment') && typeof value === 'string') {
      return (
        <span className="ai-sentiment">
          {getSentimentIcon(value)} {value?.charAt(0).toUpperCase() + value?.slice(1)}
        </span>
      );
    }

    // Tone
    if (lowerKey === 'tone') {
      const toneEmojis = {
        professional: '👔',
        friendly: '😊',
        apologetic: '🙏',
        grateful: '💝'
      };
      return (
        <span className="ai-tone">
          {toneEmojis[value?.toLowerCase()] || '📝'} {value?.charAt(0).toUpperCase() + value?.slice(1)}
        </span>
      );
    }

    return null;
  };

  return (
    <div className={`ai-output-display ${getTypeClass()}`}>
      {title && (
        <div className="ai-output-header">
          <span className="ai-output-icon">🤖</span>
          <h3 className="ai-output-title">{title}</h3>
        </div>
      )}
      <div className="ai-output-content">
        {typeof data === 'string' ? (
          <p className="ai-output-text">{data}</p>
        ) : (
          Object.entries(data).map(([key, value]) => {
            // Skip internal fields
            if (key.startsWith('_') || key === 'id' || key === 'created_at' || key === 'updated_at') {
              return null;
            }

            const specialRender = renderSpecialField(key, value);

            return (
              <div key={key} className="ai-output-field">
                <label className="ai-field-label">{formatKey(key)}</label>
                <div className="ai-field-value">
                  {specialRender || renderValue(value, key)}
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default AIOutputDisplay;
