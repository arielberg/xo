const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();

const options = {
  key: fs.readFileSync('/workspace/xo/localScripts/localhost-key.pem'),
  cert: fs.readFileSync('/workspace/xo/localScripts/localhost-cert.pem')
};

// Serve wpa.html for root
app.get('/', (req, res) => {
  const filePath = path.join(__dirname, '..', 'wpa.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.status(500).send('Error loading file');
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.send(data);
    }
  });
});

// Optional: serve index.html if requested
app.get('/index.html', (req, res) => {
  const filePath = path.join(__dirname, '..', 'wpa.html');
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.status(500).send('Error loading file');
    } else {
      res.setHeader('Content-Type', 'text/html');
      res.send(data);
    }
  });
});

https.createServer(options, app).listen(8443, () => {
  console.log('HTTPS server running on https://localhost:8443');
});
