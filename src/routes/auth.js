import { Router } from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { protect, validate } from '../middleware/index.js';
import { loginSchema } from '../validators/index.js';
import { ApiError, asyncHandler } from '../utils/helpers.js';

const router = Router();

router.post(
  '/login',
  validate(loginSchema),
  asyncHandler(async (req, res) => {
    const user = await User.findOne({ email: req.body.email }).select('+password');
    if (!user || !(await user.matches(req.body.password))) {
      throw new ApiError(401, 'Incorrect email or password');
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
  })
);

router.get('/me', protect, (req, res) => res.json({ user: req.user }));

export default router;
