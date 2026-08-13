import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import authRoutes from './routes/auth.js';
import problemRoutes from './routes/problems.js';
import cardRoutes from './routes/cards.js';
import roadmapRoutes from './routes/roadmap.js';
import dashboardRoutes from './routes/dashboard.js';
import analyticsRoutes from './routes/analytics.js';
import settingsRoutes from './routes/settings.js';
import designRoutes from './routes/design.js';
import csRoutes from './routes/cs.js';
import sqlRoutes from './routes/sql.js';
import tutorRoutes from './routes/tutor.js';
import resumeRoutes from './routes/resumes.js';
import quizRoutes from './routes/quiz.js';
import chatRoutes from './routes/chats.js';
import { isConfigured } from './config/supabase.js';
import { getEncryptionKey } from './services/crypto.js';

dotenv.config();

try {
  getEncryptionKey();
} catch (err) {
  console.warn(`[crypto] ${err.message}`);
}

const app = express();
const PORT = process.env.PORT || 4000;

app.use(
  cors({
    origin: process.env.CLIENT_ORIGIN ? process.env.CLIENT_ORIGIN.split(',') : '*',
    credentials: true,
  })
);
app.use(express.json({ limit: '2mb' }));

app.get('/api/health', (_req, res) =>
  res.json({ ok: true, service: 'bentoprep-server', supabase: isConfigured })
);

app.use('/api/auth', authRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/cards', cardRoutes);
app.use('/api/roadmap', roadmapRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/settings', settingsRoutes);
app.use('/api/design', designRoutes);
app.use('/api/cs', csRoutes);
app.use('/api/sql', sqlRoutes);
app.use('/api/tutor', tutorRoutes);
app.use('/api/resumes', resumeRoutes);
app.use('/api/quiz', quizRoutes);
app.use('/api/chats', chatRoutes);

// 404 + error handler
app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error('[server]', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

// Safety net so a rejected async route never hangs a request or crashes the
// process silently. Routes should still catch their own errors for a proper 502.
process.on('unhandledRejection', (reason) => {
  console.error('[server] unhandledRejection:', reason);
});
process.on('uncaughtException', (err) => {
  console.error('[server] uncaughtException:', err);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`BentoPrep server running on http://localhost:${PORT}`);
});
