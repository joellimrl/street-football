const DAY = 86400000;
const STATUSES = new Set(['SCHEDULED', 'TIMED', 'IN_PLAY', 'PAUSED', 'FINISHED', 'SUSPENDED', 'POSTPONED', 'CANCELLED', 'AWARDED']);
function ensure(condition) { if (!condition) throw new Error('Invalid public snapshot'); }
function keys(value, names) {
  ensure(value && typeof value === 'object' && !Array.isArray(value));
  ensure(Object.keys(value).length === names.length && Object.keys(value).every(key => names.includes(key)));
}
function text(value, max = 200) { ensure(typeof value === 'string' && value.length > 0 && value.length <= max); }
function date(value) { ensure(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value))); }
function nullableDate(value) { if (value !== null) date(value); }
function id(value) { ensure(typeof value === 'string' && /^\d{1,12}$/.test(value)); }
function validateTeam(team) {
  keys(team, ['id', 'name', 'shortName', 'tla']); id(team.id); text(team.name); text(team.shortName); text(team.tla, 8);
}
function validateVideo(video) {
  keys(video, ['videoId', 'title', 'channelId', 'channelTitle', 'teamId', 'thumbnail', 'url', 'publishedAt', 'checkedAt']);
  ensure(/^[\w-]{11}$/.test(video.videoId)); text(video.title, 500); text(video.channelTitle);
  ensure(/^UC[\w-]{4,}$/.test(video.channelId)); id(video.teamId);
  ensure(video.url === `https://www.youtube.com/watch?v=${video.videoId}`);
  const image = new URL(video.thumbnail);
  ensure(image.protocol === 'https:' && ['i.ytimg.com', 'i9.ytimg.com'].includes(image.hostname) && !image.username && !image.password);
  date(video.publishedAt); date(video.checkedAt);
}
function validateSnapshot(value) {
  keys(value, ['schemaVersion', 'generatedAt', 'season', 'fixtures', 'sources']);
  ensure(value.schemaVersion === 1); date(value.generatedAt);
  if (value.season !== null) {
    keys(value.season, ['id', 'startDate', 'endDate']); id(value.season.id);
    for (const day of [value.season.startDate, value.season.endDate]) ensure(/^\d{4}-\d{2}-\d{2}$/.test(day) && Number.isFinite(Date.parse(day)));
    ensure(value.season.startDate < value.season.endDate);
  }
  keys(value.sources, ['fixtures', 'highlights']);
  for (const source of Object.values(value.sources)) {
    keys(source, ['status', 'lastAttemptAt', 'lastSuccessAt']);
    ensure(['ok', 'error', 'not_configured'].includes(source.status));
    nullableDate(source.lastAttemptAt); nullableDate(source.lastSuccessAt);
  }
  ensure(Array.isArray(value.fixtures) && value.fixtures.length <= 500);
  ensure(value.fixtures.length === 0 || value.season !== null);
  const seen = new Set();
  for (const match of value.fixtures) {
    keys(match, ['id', 'utcDate', 'status', 'matchday', 'home', 'away', 'score', 'highlights', 'lastHighlightsCheckAt']);
    id(match.id); ensure(!seen.has(match.id)); seen.add(match.id); date(match.utcDate);
    ensure(STATUSES.has(match.status));
    ensure(match.matchday === null || (Number.isInteger(match.matchday) && match.matchday >= 1 && match.matchday <= 60));
    validateTeam(match.home); validateTeam(match.away); ensure(match.home.id !== match.away.id);
    keys(match.score, ['home', 'away']);
    for (const score of Object.values(match.score)) ensure(score === null || (Number.isInteger(score) && score >= 0 && score <= 99));
    ensure(Array.isArray(match.highlights) && match.highlights.length <= 6);
    const videos = new Set();
    for (const video of match.highlights) { validateVideo(video); ensure(!videos.has(video.videoId)); videos.add(video.videoId); }
    nullableDate(match.lastHighlightsCheckAt);
  }
  ensure(Buffer.byteLength(JSON.stringify(value)) <= 2 * 1024 * 1024);
  return value;
}
function emptySnapshot(now) {
  return { schemaVersion: 1, generatedAt: now, season: null, fixtures: [], sources: {
    fixtures: { status: 'not_configured', lastAttemptAt: null, lastSuccessAt: null },
    highlights: { status: 'not_configured', lastAttemptAt: null, lastSuccessAt: null }
  } };
}
function normalizeFixtures(payload) {
  ensure(Array.isArray(payload?.matches) && payload.matches.length > 0 && payload.matches.length <= 500);
  const first = payload.matches[0].season;
  ensure(first);
  const season = { id: String(first.id), startDate: first.startDate, endDate: first.endDate };
  const team = input => ({ id: String(input.id), name: input.name, shortName: input.shortName || input.name, tla: input.tla });
  const fixtures = payload.matches.map(m => {
    ensure(String(m.season?.id) === season.id);
    return { id: String(m.id), utcDate: new Date(m.utcDate).toISOString(), status: m.status, matchday: m.matchday ?? null,
      home: team(m.homeTeam), away: team(m.awayTeam), score: { home: m.score?.fullTime?.home ?? null, away: m.score?.fullTime?.away ?? null },
      highlights: [], lastHighlightsCheckAt: null };
  });
  validateSnapshot({ ...emptySnapshot(new Date().toISOString()), season, fixtures });
  return { season, fixtures };
}
module.exports = { DAY, validateSnapshot, validateVideo, normalizeFixtures, emptySnapshot };
