const parsePagination = (query) => {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 10));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

const buildPaginationResponse = (data, total, page, limit) => {
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit)
    }
  };
};

const buildSearchClause = (search, columns) => {
  if (!search || !columns.length) return { clause: '', params: [] };
  const conditions = columns.map((col, i) => `${col} ILIKE $${i + 1}`);
  const params = columns.map(() => `%${search}%`);
  return {
    clause: `(${conditions.join(' OR ')})`,
    params
  };
};

const buildSortClause = (sortBy, sortOrder, allowedColumns) => {
  if (!sortBy || !allowedColumns.includes(sortBy)) {
    return 'created_at DESC';
  }
  const order = sortOrder === 'asc' ? 'ASC' : 'DESC';
  return `${sortBy} ${order}`;
};

module.exports = { parsePagination, buildPaginationResponse, buildSearchClause, buildSortClause };
