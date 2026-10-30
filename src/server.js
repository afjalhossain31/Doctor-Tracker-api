import 'dotenv/config';
import app from './app.js';
import { connectDB } from './config/db.js';
import User from './models/User.js';

const required = ['MONGODB_URI', 'JWT_SECRET'];
const missing = required.filter((k) => !process.env[k]);
if (missing.length) {
  console.error(`Missing env vars: ${missing.join(', ')}`);
  process.exit(1);
}

async function ensureAdmin() {
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) return;
  if (await User.exists({})) return;
  await User.create({ name: 'Admin', email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
  console.log(`Admin account created: ${ADMIN_EMAIL}`);
}

const PORT = process.env.PORT || 5000;
connectDB()
  .then(ensureAdmin)
  .then(() => app.listen(PORT, () => console.log(`API running on port ${PORT}`)))
  .catch((err) => {
    console.error('Startup failed:', err.message);
    process.exit(1);
  });
