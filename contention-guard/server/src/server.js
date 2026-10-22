require('dotenv').config();
const app = require('./app');
const { initDb } = require('./database/db');

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  console.log('------------------------------------------------------------');
  console.log(' Contention-Aware Transaction Guard (CTG) - Starting Server');
  console.log('------------------------------------------------------------');

  const dbInit = await initDb();
  console.log(`[Database] Mode: ${dbInit.mode.toUpperCase()}`);
  console.log(`[Database] Status: ${dbInit.dbStatusMessage}`);

  const server = app.listen(PORT, HOST, () => {
    console.log(`[Server] CTG API Server running at http://${HOST}:${PORT}`);
    console.log(`[Server] Healthcheck: http://localhost:${PORT}/api/health`);
    console.log(`[Server] Products: http://localhost:${PORT}/api/products`);
    console.log(`[Server] Metrics: http://localhost:${PORT}/api/metrics`);
    console.log('------------------------------------------------------------');
  });

  const shutdown = () => {
    console.log('\n[Server] Graceful shutdown initiated...');
    server.close(() => {
      console.log('[Server] HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

bootstrap().catch(err => {
  console.error('[Server Fatal] Failed to start server:', err);
  process.exit(1);
});
