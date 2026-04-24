import React from 'react';
import './Skeleton.css';

const Skeleton = ({ width = '100%', height = 16, borderRadius = 4, style = {} }) => (
  <div
    className="skeleton-shimmer"
    style={{ width, height, borderRadius, ...style }}
  />
);

const SkeletonTable = ({ rows = 5, cols = 5 }) => (
  <div className="skeleton-table">
    <div className="skeleton-table-header">
      {Array.from({ length: cols }).map((_, i) => (
        <Skeleton key={i} height={14} width="80%" />
      ))}
    </div>
    {Array.from({ length: rows }).map((_, r) => (
      <div key={r} className="skeleton-table-row">
        {Array.from({ length: cols }).map((_, c) => (
          <Skeleton key={c} height={14} width={`${60 + Math.random() * 30}%`} />
        ))}
      </div>
    ))}
  </div>
);

const SkeletonCard = ({ count = 3 }) => (
  <div className="skeleton-cards">
    {Array.from({ length: count }).map((_, i) => (
      <div key={i} className="skeleton-card">
        <Skeleton height={20} width="60%" style={{ marginBottom: 12 }} />
        <Skeleton height={14} width="90%" style={{ marginBottom: 8 }} />
        <Skeleton height={14} width="75%" style={{ marginBottom: 8 }} />
        <Skeleton height={14} width="40%" style={{ marginBottom: 16 }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Skeleton height={28} width={80} borderRadius={6} />
          <Skeleton height={28} width={60} borderRadius={6} />
        </div>
      </div>
    ))}
  </div>
);

export { Skeleton, SkeletonTable, SkeletonCard };
export default Skeleton;
