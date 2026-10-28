import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const DIST_DIR = path.join(__dirname, 'frontend', 'dist');

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const cleanUrl = req.url.split('?')[0];
  let filePath = path.join(DIST_DIR, cleanUrl === '/' ? 'index.html' : cleanUrl);
  
  // Security: prevent directory traversal
  if (!filePath.startsWith(DIST_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stat) => {
    if (err) {
      // Try index.html for SPA routing (treat cleanUrl without extension as SPA route)
      if (cleanUrl !== '/' && !path.extname(cleanUrl)) {
        filePath = path.join(DIST_DIR, 'index.html');
        fs.stat(filePath, (err2, stat2) => {
          if (err2) {
            res.writeHead(404);
            res.end('Not Found');
            return;
          }
          serveFile(filePath, res);
        });
        return;
      }
      res.writeHead(404);
      res.end('Not Found');
      return;
    }

    if (stat.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
      fs.stat(filePath, (err2) => {
        if (err2) {
          res.writeHead(404);
          res.end('Not Found');
          return;
        }
        serveFile(filePath, res);
      });
      return;
    }

    serveFile(filePath, res);
  });
});

function serveFile(filePath, res) {
  const ext = path.extname(filePath);
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.json': 'application/json',
    '.js': 'application/javascript',
    '.css': 'text/css',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2'
  };

  const contentType = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', contentType);

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500);
      res.end('Server Error');
      return;
    }
    res.writeHead(200);
    res.end(content);
  });
}

server.listen(PORT, () => {
  console.log(`✓ Frontend server running on http://localhost:${PORT}`);
  console.log(`✓ Test viewer: http://localhost:${PORT}/viewer?testProject=test-project-001`);
});

server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});
