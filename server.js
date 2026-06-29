const express = require('express');
const path = require('path');
const { app: apiApp } = require('./netlify/functions/api');
const port = process.env.PORT || 3001;

const server = express();

// Serve frontend static files
server.use(express.static(path.join(__dirname, 'frontend', 'dist')));

// Mount API routes (fallback when no static file matches)
server.use(apiApp);

server.listen(port, () => {
  console.log(`Gothra Express Server running on port ${port}`);
});
