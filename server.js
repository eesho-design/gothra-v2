const express = require('express');
const path = require('path');
const fs = require('fs');
const { app: apiApp } = require('./netlify/functions/api');
const port = process.env.PORT || 3001;

const server = express();

// Serve frontend static files
server.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// Mount API routes
server.use(apiApp);

// SPA fallback: serve index.html for any non-API, non-static route
const indexHtml = path.join(__dirname, 'frontend', 'dist', 'index.html');
server.use((req, res) => {
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.status(404).send('Not found');
  }
});

server.listen(port, () => {
  console.log(`Gothra Express Server running on port ${port}`);
});
