const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { NOW, snapshot, payload, video, fixture } = require('./fixtures');
const { requestJson, HttpError } = require('../collector/http');
const { preparePublication } = require('../scripts/publish');
const { createProviders } = require('../collector/providers');

test('HTTP retries transient failures, honors Retry-After and caps long waits', async () => {
  let count = 0; const delays = [];
  const result = await requestJson('https://example.test/data', { fetchImpl: async () => {
    count++; return count === 1 ? new Response('', { status: 429, headers: { 'retry-after': '2' } }) : new Response('{"ok":true}');
  }, sleep: async ms => delays.push(ms) });
  assert.equal(result.ok, true); assert.deepEqual(delays, [2000]);
  await assert.rejects(requestJson('https://example.test/data', { fetchImpl: async () => new Response('', { status: 429, headers: { 'retry-after': '3600' } }), sleep: async () => assert.fail('must defer to next run') }), /429/);
});
test('HTTP errors never include URLs, credentials or response body and nonretryable 403 is not retried', async () => {
  let count = 0;
  await assert.rejects(requestJson('https://example.test/?key=private', { fetchImpl: async () => { count++; return new Response('private', { status: 403 }); } }), error => {
    assert.equal(error.status, 403); assert.ok(!error.message.includes('private')); return true;
  });
  assert.equal(count, 1);
  await assert.rejects(requestJson('https://example.test', { maxBytes: 4, fetchImpl: async () => new Response('{"abcdef":true}') }), /large/);
});
test('publication requires explicit bootstrap on 404 and refuses bad prior data even with bootstrap', async () => {
  await assert.rejects(preparePublication({ now: NOW, request: async () => { throw new HttpError(404); } }), /snapshot/);
  await assert.rejects(preparePublication({ now: NOW, bootstrap: true, request: async () => ({ bad: true }) }), /snapshot/);
  await assert.rejects(preparePublication({ now: NOW, bootstrap: true, request: async () => { throw new HttpError(500); } }), /500/);
});
test('bootstrap with no credentials publishes an honest empty state; later failures retain fixture data', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'street-football-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const out = path.join(dir, 'dist');
  await preparePublication({ now: NOW, bootstrap: true, outputDir: out, request: async () => { throw new HttpError(404); } });
  let saved = JSON.parse(await fs.readFile(path.join(out, 'data/snapshot.json'), 'utf8'));
  assert.equal(saved.sources.fixtures.status, 'not_configured'); assert.deepEqual(saved.fixtures, []);
  const result = await preparePublication({ now: NOW, outputDir: out, request: async () => snapshot(), providers: {
    fixturesProvider: async () => { throw new Error('unavailable'); }
  } });
  saved = JSON.parse(await fs.readFile(path.join(out, 'data/snapshot.json'), 'utf8'));
  assert.equal(saved.fixtures[0].id, '123'); assert.equal(result.degraded, true);
  assert.ok((await fs.readFile(path.join(out, 'index.html'), 'utf8')).includes('Street Football'));
});
test('first live collection failure does not create output', async t => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'street-football-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  const out = path.join(dir, 'dist');
  await assert.rejects(preparePublication({ now: NOW, bootstrap: true, outputDir: out,
    request: async () => { throw new HttpError(404); }, providers: { fixturesProvider: async () => { throw new Error(); } } }), /Initial/);
  await assert.rejects(fs.stat(out), { code: 'ENOENT' });
});
test('fixtures request uses competition endpoint and a header token', async () => {
  const providers = createProviders({ footballToken: 'test-only', request: async (url, opts) => {
    assert.equal(url, 'https://api.football-data.org/v4/competitions/PL/matches');
    assert.equal(opts.headers['X-Auth-Token'], 'test-only'); return payload();
  } });
  assert.equal((await providers.fixturesProvider()).matches[0].id, 123);
});
test('YouTube paginates uploads, confirms video channel, and reports per-club failures', async () => {
  const routes = [];
  const providers = createProviders({ youtubeKey: 'test-only', channels: [{ tla: 'ARS', user: 'arsenal' }, { tla: 'CHE', user: 'chelseafc' }], request: async (raw, opts) => {
    const url = new URL(raw); routes.push(url.pathname + url.searchParams.get('pageToken'));
    assert.equal(opts.headers['X-Goog-Api-Key'], 'test-only');
    if (url.pathname.endsWith('/channels')) {
      if (url.searchParams.get('forUsername') === 'chelseafc') throw new HttpError(503);
      return { items: [{ id: 'UCtest', contentDetails: { relatedPlaylists: { uploads: 'UUtest' } } }] };
    }
    if (url.pathname.endsWith('/playlistItems')) return url.searchParams.get('pageToken') ?
      { items: [{ contentDetails: { videoId: 'abcdefghijk', videoPublishedAt: video().publishedAt } }] } :
      { items: [], nextPageToken: 'second' };
    if (url.pathname.endsWith('/videos')) return { items: [{ id: 'abcdefghijk', snippet: {
      title: video().title, channelId: 'UCtest', channelTitle: 'Arsenal', publishedAt: video().publishedAt,
      thumbnails: { high: { url: video().thumbnail } } }, contentDetails: { duration: 'PT4M' }, status: { privacyStatus: 'public' } }] };
    throw new Error('Unexpected endpoint');
  } });
  const result = await providers.highlightsProvider([fixture()], NOW);
  assert.equal(result.videos[0].teamId, '57'); assert.equal(result.healthy, false);
  assert.deepEqual(result.failedTeamIds, ['61']); assert.ok(routes.some(route => route.endsWith('second')));
});

test('YouTube diagnostics identify failed clubs and stages without logging provider errors or credentials', async () => {
  const reports = [];
  const providers = createProviders({ youtubeKey: 'private-key', report: event => reports.push(event),
    channels: [{ tla: 'ARS', user: 'arsenal' }, { tla: 'CHE', user: 'chelseafc' }], request: async raw => {
      if (new URL(raw).searchParams.get('forUsername') === 'arsenal') return { items: [] };
      const error = new Error('private-key in upstream response'); error.status = 403; throw error;
    } });
  const result = await providers.highlightsProvider([fixture()], NOW);
  assert.equal(result.healthy, false);
  assert.deepEqual(reports, [
    { stage: 'channels', team: 'ARS', reason: 'Unknown club channel', httpStatus: null },
    { stage: 'channels', team: 'CHE', reason: 'Request or response failed', httpStatus: 403 }
  ]);
  assert.ok(!JSON.stringify(reports).includes('private-key'));
});
