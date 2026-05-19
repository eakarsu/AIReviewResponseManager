import React from 'react';
import ReviewVolumeTimeline from '../components/ReviewVolumeTimeline';
import SentimentHeatmap from '../components/SentimentHeatmap';
import ResponseTemplatePDF from '../components/ResponseTemplatePDF';
import AutoReplyRulesEditor from '../components/AutoReplyRulesEditor';

const CustomViewsPage = () => {
  return (
    <div className="page-container" style={{ padding: 24 }}>
      <div className="page-header" style={{ marginBottom: 20 }}>
        <h1 style={{ margin: 0, color: '#111827' }}>Review Views</h1>
        <p style={{ marginTop: 6, color: '#6b7280' }}>
          Custom analytics and workflow tools: review volume timeline, sentiment heatmap,
          template library export, and auto-reply rule management.
        </p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
        <ReviewVolumeTimeline />
        <SentimentHeatmap />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20, marginBottom: 20 }}>
        <ResponseTemplatePDF />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}>
        <AutoReplyRulesEditor />
      </div>
    </div>
  );
};

export default CustomViewsPage;
