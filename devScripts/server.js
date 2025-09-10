const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');

const app = express();

// HTTPS options
const options = {
  key: fs.readFileSync('/workspace/xo/devScripts/server.key'),
  cert: fs.readFileSync('/workspace/xo/devScripts/server.crt')
};

// Serve all static files from the parent directory
const publicDir = path.join(__dirname, '..');
app.use(express.static(publicDir));

// Optional: fallback for 404
app.use((req, res) => {
  res.status(404).send('File not found');
});


['8443','8444','8445','8446','8447','8448','8449','8450'].forEach(port=>{
  // Start HTTPS server
  https.createServer(options, app).listen(port, () => {
    console.log('HTTPS server running on port '+port);
  });
})