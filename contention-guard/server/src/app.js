const express = require('express');
const cors = require('cors');
const apiRoutes = require('./routes/apiRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Security and CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id']
}));

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in development
if (process.env.NODE_ENV !== 'test') {
  app.use((req, res, next) => {
    if (!req.url.startsWith('/api/metrics') && !req.url.startsWith('/api/simulation/status')) {
      // Avoid spamming logs for polling endpoints
      console.log(`[HTTP] ${req.method} ${req.url}`);
    }
    next();
  });
}

// Mount REST APIs
app.use('/api', apiRoutes);

// Root informational endpoint
app.get('/', (req, res) => {
  res.json({
    service: 'Contention-Aware Transaction Guard (CTG)',
    version: '1.0.0',
    documentation: '/api/health',
    status: 'ACTIVE'
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Endpoint not found: ${req.method} ${req.originalUrl}`
  });
});

// Centralized error handling
app.use(errorHandler);

module.exports = app;
