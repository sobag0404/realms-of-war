// Lightweight static file server for Realms of War
// Serves the prototype HTML game directly
const PORT = 3000;
const PUBLIC_DIR = '/home/z/my-project/public';

const MIME_TYPES: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.json': 'application/json',
  '.ico': 'image/x-icon',
};

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);
    let path = url.pathname;

    // Root path serves the prototype game
    if (path === '/') {
      path = '/prototype/index.html';
    }

    // Security: prevent directory traversal
    if (path.includes('..')) {
      return new Response('Forbidden', { status: 403 });
    }

    const filePath = PUBLIC_DIR + path;

    try {
      const file = Bun.file(filePath);
      const exists = await file.exists();

      if (!exists) {
        // For missing sprite images, return 204 so game doesn't break
        if (path.includes('/sprites/')) {
          return new Response(null, { status: 204 });
        }
        return new Response('Not Found', { status: 404 });
      }

      const ext = '.' + filePath.split('.').pop()!.toLowerCase();
      const contentType = MIME_TYPES[ext] || 'application/octet-stream';

      return new Response(file, {
        headers: {
          'Content-Type': contentType,
          'Cache-Control': 'no-cache',
        },
      });
    } catch (err) {
      return new Response('Internal Server Error', { status: 500 });
    }
  },
});

console.log(`🎮 Realms of War game server on http://localhost:${PORT}`);
