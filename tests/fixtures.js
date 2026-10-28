const NOW = '2026-10-29T12:00:00.000Z';
const home = { id: '57', name: 'Arsenal FC', shortName: 'Arsenal', tla: 'ARS' };
const away = { id: '61', name: 'Chelsea FC', shortName: 'Chelsea', tla: 'CHE' };
const season = { id: '2026', startDate: '2026-08-01', endDate: '2027-05-31' };
function fixture(overrides = {}) {
  return { id: '123', utcDate: '2026-10-25T15:00:00.000Z', status: 'FINISHED', matchday: 9,
    home, away, score: { home: 2, away: 1 }, highlights: [], lastHighlightsCheckAt: null, ...overrides };
}
function video(overrides = {}) {
  return { videoId: 'abcdefghijk', title: 'Arsenal 2-1 Chelsea | Premier League highlights',
    channelId: 'UCtest', channelTitle: 'Arsenal', teamId: '57',
    thumbnail: 'https://i.ytimg.com/vi/abcdefghijk/hqdefault.jpg',
    url: 'https://www.youtube.com/watch?v=abcdefghijk', publishedAt: '2026-10-28T12:00:00.000Z', checkedAt: NOW, ...overrides };
}
function snapshot(overrides = {}) {
  const source = { status: 'ok', lastAttemptAt: NOW, lastSuccessAt: NOW };
  return { schemaVersion: 1, generatedAt: NOW, season, fixtures: [fixture()],
    sources: { fixtures: { ...source }, highlights: { ...source } }, ...overrides };
}
function payload(overrides = {}) {
  return { matches: [{ id: 123, utcDate: '2026-10-25T15:00:00Z', status: 'FINISHED', matchday: 9,
    homeTeam: { ...home, id: 57 }, awayTeam: { ...away, id: 61 }, season: { ...season, id: 2026 },
    score: { fullTime: { home: 2, away: 1 } }, ...overrides }] };
}
module.exports = { NOW, fixture, video, snapshot, payload, season };
