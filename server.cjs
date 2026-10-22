const express = require('express');
const path = require('path');
const app = require('./api/index');

const distPath = path.join(__dirname, 'dist');
app.use(express.static(distPath));

// Fallback to index.html for SPA routes
app.get('*', (req, res, next) => {
  if (req.url.startsWith('/api')) return next();
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = parseInt(process.env.PORT || '4000', 10);
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log('------------------------------------------------------------');
  console.log(' Research Arena - Contention-Aware Transaction Guard (CTG)');
  console.log(` Running in Combined React + API Mode at http://${HOST}:${PORT}`);
  console.log('------------------------------------------------------------');
});
