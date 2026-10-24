const http = require('http');
const fs = require('fs');
const path = require('path');

let PORT = parseInt(process.env.PORT, 10) || 3001;
const ROOT_DIR = __dirname;
const DEFAULT_PAGE = 'index.html';

// MIME types dictionary
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm'
};

// SSE Clients for live reload
const clients = new Set();

// Live reload script to inject into HTML pages
const LIVE_RELOAD_SCRIPT = `
<!-- Auto Live-Reload Script -->
<script>
(function() {
  let es;
  function connect() {
    es = new EventSource('/__livereload');
    es.onmessage = function(e) {
      if (e.data === 'reload') {
        console.log('[LiveReload] Refreshing snc-dev.html...');
        window.location.reload();
      }
    };
    es.onerror = function() {
      es.close();
      setTimeout(connect, 1500);
    };
  }
  connect();
})();
</script>
</body>`;

// Create HTTP server
const server = http.createServer((req, res) => {
  const urlPath = req.url.split('?')[0];

  // SSE Live Reload Endpoint
  if (urlPath === '/__livereload') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });
    res.write('data: connected\n\n');
    clients.add(res);

    req.on('close', () => {
      clients.delete(res);
    });
    return;
  }

  // Determine requested file path
  let relativePath = decodeURIComponent(urlPath);
  if (relativePath === '/' || relativePath === '') {
    relativePath = '/' + DEFAULT_PAGE;
  }

  let filePath = path.join(ROOT_DIR, relativePath);

  // Support clean URLs (e.g. /about -> about.html)
  if (!fs.existsSync(filePath) && fs.existsSync(filePath + '.html')) {
    filePath = filePath + '.html';
  }

  // Prevent directory traversal
  if (!filePath.startsWith(ROOT_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      res.writeHead(404, { 'Content-Type': 'text/html' });
      res.end(`<h1>404 Not Found</h1><p>File non-existent: ${relativePath}</p>`);
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    if (ext === '.html') {
      fs.readFile(filePath, 'utf8', (readErr, content) => {
        if (readErr) {
          res.writeHead(500);
          res.end('Error reading file');
          return;
        }

        // Inject Live Reload snippet right before </body> or at the end
        let modifiedHtml = content;
        if (content.includes('</body>')) {
          modifiedHtml = content.replace('</body>', LIVE_RELOAD_SCRIPT);
        } else {
          modifiedHtml = content + LIVE_RELOAD_SCRIPT;
        }

        res.writeHead(200, {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache, no-store, must-revalidate'
        });
        res.end(modifiedHtml);
      });
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stats.size,
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      });
      fs.createReadStream(filePath).pipe(res);
    }
  });
});

// Watch directory for changes and trigger reload
let debounceTimer = null;
function notifyClients() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    console.log(`[LiveReload] File change detected. Notifying ${clients.size} client(s)...`);
    for (const client of clients) {
      client.write('data: reload\n\n');
    }
  }, 100);
}

try {
  fs.watch(ROOT_DIR, { recursive: true }, (eventType, filename) => {
    if (filename && (
      filename.includes('.git') ||
      filename.includes('.DS_Store') ||
      filename.endsWith('.tmp') ||
      filename.includes('node_modules')
    )) {
      return;
    }
    notifyClients();
  });
} catch (watchErr) {
  console.warn('Recursive watch failed, falling back to top-level watch:', watchErr.message);
  fs.watch(ROOT_DIR, (eventType, filename) => {
    notifyClients();
  });
}

function startServer(portToTry) {
  server.listen(portToTry, () => {
    console.log(`\n==================================================`);
    console.log(`  Portfolio Local View Server Running!`);
    console.log(`  URL: http://localhost:${portToTry}/snc-dev.html`);
    console.log(`  Default URL: http://localhost:${portToTry}/`);
    console.log(`  Live Reload: ENABLED (Auto-refreshes on edits)`);
    console.log(`==================================================\n`);
  });
}

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`[Port ${PORT} in use] Retrying on port ${PORT + 1}...`);
    PORT++;
    startServer(PORT);
  } else {
    console.error('Server error:', err);
  }
});

startServer(PORT);
