export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export const escapeRegex = (s = '') => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Adds an inclusive createdAt range (from/to are yyyy-mm-dd) to a Mongo filter. */
export function applyDateRange(filter, from, to, field = 'createdAt') {
  const range = {};
  if (from && !isNaN(new Date(from))) range.$gte = new Date(from);
  if (to && !isNaN(new Date(to))) {
    const end = new Date(to);
    end.setUTCHours(23, 59, 59, 999);
    range.$lte = end;
  }
  if (Object.keys(range).length) filter[field] = range;
  return filter;
}

export function pageParams(query, defaultLimit = 10) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}

export const paginated = (items, total, { page, limit }) => ({
  items,
  pagination: { page, limit, total, pages: Math.max(1, Math.ceil(total / limit)) },
});
