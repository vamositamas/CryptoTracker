import express, { ErrorRequestHandler } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import * as path from 'path';
import { initSeedData } from './utils/seed-data';
import { formulaService } from './services/formula.service';
import tradersRouter from './routes/traders.routes';
import tradesRouter from './routes/trades.routes';
import masterDataRouter from './routes/master-data.routes';
import auditRouter from './routes/audit.routes';
import dashboardRouter from './routes/dashboard.routes';

dotenv.config();

const DATA_DIR = path.resolve(process.env.DATA_DIR || path.join(__dirname, '../data'));

export const app = express();
export const PORT = process.env.PORT || 3001;

// ── Global middleware ──────────────────────────────────────────────────────
// Restrict CORS to localhost origins only — NFR7: no data leaves the host machine
app.use(cors({
  origin: [
    'http://localhost:4200',  // Angular dev server
    'http://localhost:3001',  // direct backend access during dev
  ],
}));
app.use(express.json());

// CSP header — required on ALL responses (NFR5, Architecture decision)
app.use((_req, res, next) => {
  res.setHeader('Content-Security-Policy', "default-src 'self'");
  next();
});

// ── Data directory 403 guard ───────────────────────────────────────────────
// Must block BEFORE any route handlers (Architecture: "data/ 403 guard")
app.use('/data', (_req, res) => {
  res.status(403).json({ error: { code: 'FORBIDDEN', message: 'Access denied' } });
});

// ── Routes ────────────────────────────────────────────────────────────────
app.get('/api/v1/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Shared routes (no trader scope required)
app.use('/api/v1/traders', tradersRouter);
app.use('/api/v1/master-data', masterDataRouter);

// Per-trader routes (traderMiddleware applied inside each router)
app.use('/api/v1/trades', tradesRouter);
app.use('/api/v1/audit', auditRouter);
app.use('/api/v1/dashboard', dashboardRouter);

// ── Global error handler (must be last middleware, 4-param signature) ─────
export const errorHandler: ErrorRequestHandler = (err, _req, res, _next) => {
  console.error('[server] Unhandled error:', err);
  res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: (err as Error).message || 'Internal server error' },
  });
};
app.use(errorHandler);

// ── Start (only when run directly, not during tests) ─────────────────────
if (require.main === module) {
  initSeedData(DATA_DIR)
    .then(async () => {
      await formulaService.load();
      formulaService.validate();
    })
    .then(() =>
      app.listen(PORT, () => {
        console.log(`[server] Backend running on http://localhost:${PORT}`);
      }),
    )
    .catch((err) => {
      console.error('[server] Startup failed:', err);
      process.exit(1);
    });
}
