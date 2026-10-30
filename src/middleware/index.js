import jwt from 'jsonwebtoken';
import {
  ZodError
} from 'zod';
import {
  ApiError
} from '../utils/helpers.js';
import User from '../models/User.js';

export async function protect(req, _res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;
    if (!token) throw new ApiError(401, 'Authentication required');
    const {
      id
    } = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(id).select('-password').lean();
    if (!user) throw new ApiError(401, 'User no longer exists');
    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'JsonWebTokenError' || err.name === 'TokenExpiredError') {
      return next(new ApiError(401, 'Session expired, please sign in again'));
    }
    next(err);
  }
}

export const adminOnly = (req, _res, next) =>
  req.user?.role === 'admin' ? next() : next(new ApiError(403, 'Admin access required'));

export const validate = (schema) => (req, _res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) return next(result.error);
  req.body = result.data;
  next();
};

export const notFound = (req, _res, next) =>
  next(new ApiError(404, `Route not found: ${req.method} ${req.originalUrl}`));

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, _req, res, _next) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Please fix the highlighted fields',
      errors: err.issues.map((i) => ({
        field: i.path.join('.'),
        message: i.message
      })),
    });
  }
  if (err.name === 'CastError') return res.status(400).json({
    message: 'Invalid id'
  });
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      message: `A record with this ${field} already exists`
    });
  }
  const status = err.status || 500;
  if (status === 500) console.error(err);
  res.status(status).json({
    message: status === 500 ? 'Internal server error' : err.message
  });
}