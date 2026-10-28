const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const demo = process.argv.includes('--demo');
const root = path.resolve(__dirname, '../public');
const types = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.json': 'application/json' };
const allowed = new Set(['/index.html', '/styles.css', '/app.js', '/view-model.js', '/privacy.html']);
function demonstration() {
  const { snapshot, fixture, video } = require('../tests/fixtures');
  const now = new Date(); const iso = n => new Date(now.getTime() + n * 86400000).toISOString();
  const clubs = [
    { id: '57', name: 'Arsenal FC', shortName: 'Arsenal', tla: 'ARS' }, { id: '61', name: 'Chelsea FC', shortName: 'Chelsea', tla: 'CHE' },
    { id: '64', name: 'Liverpool FC', shortName: 'Liverpool', tla: 'LIV' }, { id: '65', name: 'Manchester City FC', shortName: 'Man City', tla: 'MCI' },
    { id: '66', name: 'Manchester United FC', shortName: 'Man United', tla: 'MUN' }, { id: '73', name: 'Tottenham Hotspur FC', shortName: 'Tottenham', tla: 'TOT' }
  ];
  const fixtures = Array.from({ length: 12 }, (_, i) => fixture({ id: String(100 + i), utcDate: iso(i < 6 ? 1 + Math.floor(i / 3) : -1 - Math.floor((i - 6) / 3)),
    home: clubs[i % 6], away: clubs[(i + 1) % 6], matchday: i < 6 ? 10 : 9, status: i < 6 ? 'TIMED' : 'FINISHED',
    highlights: i === 6 ? [video({ checkedAt: now.toISOString(), publishedAt: iso(-0.5) })] : [] }));
  return snapshot({ generatedAt: now.toISOString(), fixtures, sources: {
    fixtures: { status: 'ok', lastAttemptAt: now.toISOString(), lastSuccessAt: now.toISOString() },
    highlights: { status: 'ok', lastAttemptAt: now.toISOString(), lastSuccessAt: now.toISOString() }
  } });
}
const server = http.createServer(async (req, res) => {
  const route = new URL(req.url, 'http://localhost').pathname;
  try {
    if (route === '/data/snapshot.json') {
      const content = demo ? JSON.stringify(demonstration()) : await fs.readFile(path.resolve(__dirname, '../dist/data/snapshot.json'));
      res.writeHead(200, { 'Content-Type': types['.json'], 'Cache-Control': 'no-store' }); res.end(content); return;
    }
    const resource = route === '/' ? '/index.html' : route;
    if (!allowed.has(resource)) { res.writeHead(404); res.end('Not found'); return; }
    let content = await fs.readFile(path.join(root, resource));
    if (demo && resource === '/index.html') content = content.toString().replace('<main>', '<main><p class="notice">LOCAL DEMO — synthetic fixtures for interface testing</p>');
    res.writeHead(200, { 'Content-Type': types[path.extname(resource)], 'Cache-Control': 'no-store' }); res.end(content);
  } catch { res.writeHead(404); res.end('Not found'); }
});
server.listen(4173, '127.0.0.1', () => console.log(`Preview: http://127.0.0.1:4173/${demo ? ' (synthetic local data)' : ''}`));
