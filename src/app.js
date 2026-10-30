import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import authRoutes from './routes/auth.js';
import doctorRoutes from './routes/doctors.js';
import patientRoutes from './routes/patients.js';
import dashboardRoutes from './routes/dashboard.js';
import { protect, adminOnly, notFound, errorHandler } from './middleware/index.js';

const app = express();
const origins = (process.env.CLIENT_URL || 'http://localhost:3000').split(',').map((s) => s.trim());

app.set('trust proxy', 1);
app.use(helmet());
app.use(cors({ origin: origins, credentials: true }));
app.use(express.json({ limit: '100kb' }));
if (process.env.NODE_ENV !== 'test') app.use(morgan('dev'));

app.get('/', (_req, res) => res.json({ name: 'Doctor Tracker API', status: 'ok' }));
app.get('/api/health', (_req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

app.use('/api/auth/login', rateLimit({ windowMs: 15 * 60 * 1000, max: 30, standardHeaders: true }));
app.use('/api/auth', authRoutes);

// Everything below requires a valid JWT + admin role
app.use('/api', protect, adminOnly);
app.use('/api/doctors', doctorRoutes);
app.use('/api/patients', patientRoutes);
app.use('/api/dashboard', dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

export default app;
