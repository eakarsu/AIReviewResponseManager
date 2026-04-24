import React from 'react';
import './Pagination.css';

const Pagination = ({ pagination, onPageChange }) => {
  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total, limit } = pagination;
  const startItem = (page - 1) * limit + 1;
  const endItem = Math.min(page * limit, total);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    let start = Math.max(1, page - Math.floor(maxVisible / 2));
    let end = Math.min(totalPages, start + maxVisible - 1);
    if (end - start < maxVisible - 1) {
      start = Math.max(1, end - maxVisible + 1);
    }
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  };

  return (
    <div className="pagination-container">
      <span className="pagination-info">
        Showing {startItem}-{endItem} of {total}
      </span>
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          onClick={() => onPageChange(1)}
          disabled={page === 1}
        >
          &laquo;
        </button>
        <button
          className="pagination-btn"
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
        >
          &lsaquo;
        </button>
        {getPageNumbers().map(p => (
          <button
            key={p}
            className={`pagination-btn ${p === page ? 'active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          className="pagination-btn"
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
        >
          &rsaquo;
        </button>
        <button
          className="pagination-btn"
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages}
        >
          &raquo;
        </button>
      </div>
    </div>
  );
};

export default Pagination;
