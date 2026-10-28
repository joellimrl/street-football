const { DAY, validateSnapshot, validateVideo, normalizeFixtures, emptySnapshot } = require('./model');
const { matchVideos } = require('./matching');
async function collect({ previous, fixturesProvider, highlightsProvider, now = new Date().toISOString() }) {
  const snapshot = structuredClone(validateSnapshot(previous || emptySnapshot(now)));
  snapshot.generatedAt = now;
  const stamp = (name, success, configured = true) => {
    snapshot.sources[name].status = !configured ? 'not_configured' : success ? 'ok' : 'error';
    snapshot.sources[name].lastAttemptAt = now;
    if (success) snapshot.sources[name].lastSuccessAt = now;
  };
  try {
    if (!fixturesProvider) throw new Error('Not configured');
    const fresh = normalizeFixtures(await fixturesProvider());
    const sameSeason = fresh.season.id === snapshot.season?.id;
    const prior = new Map(sameSeason ? snapshot.fixtures.map(m => [m.id, m]) : []);
    for (const match of fresh.fixtures) {
      const old = prior.get(match.id);
      if (old && old.utcDate === match.utcDate && old.home.id === match.home.id && old.away.id === match.away.id && match.status === 'FINISHED') {
        match.highlights = old.highlights;
        match.lastHighlightsCheckAt = old.lastHighlightsCheckAt;
      }
      prior.set(match.id, match);
    }
    snapshot.season = fresh.season;
    snapshot.fixtures = [...prior.values()];
    stamp('fixtures', true);
  } catch { stamp('fixtures', false, Boolean(fixturesProvider)); }
  // Expiry applies even on source failure. Metadata never lives indefinitely.
  for (const match of snapshot.fixtures) {
    match.highlights = match.highlights.filter(v => Date.parse(now) - Date.parse(v.checkedAt) < 29 * DAY);
  }
  try {
    if (!highlightsProvider) throw new Error('Not configured');
    const result = await highlightsProvider(snapshot.fixtures, now);
    for (const video of result.videos) validateVideo(video);
    const refreshed = new Map(result.videos.map(v => [v.videoId, v]));
    const removed = new Set(result.removedIds);
    const matched = matchVideos(snapshot.fixtures, result.videos, now);
    for (const match of snapshot.fixtures) {
      const kept = match.highlights.filter(v => !removed.has(v.videoId)).map(v => refreshed.get(v.videoId) || v);
      const combined = new Map([...kept, ...(matched.get(match.id) || [])].map(v => [v.videoId, v]));
      match.highlights = [...combined.values()].sort((a, b) => a.publishedAt.localeCompare(b.publishedAt)).slice(0, 6);
      if (result.checkedFixtureIds?.includes(match.id) &&
          !result.failedTeamIds.includes(match.home.id) && !result.failedTeamIds.includes(match.away.id)) match.lastHighlightsCheckAt = now;
    }
    stamp('highlights', result.healthy);
  } catch { stamp('highlights', false, Boolean(highlightsProvider)); }
  snapshot.fixtures.sort((a, b) => a.utcDate.localeCompare(b.utcDate) || a.id.localeCompare(b.id));
  validateSnapshot(snapshot);
  return { snapshot, degraded: Object.values(snapshot.sources).some(s => s.status !== 'ok') };
}
module.exports = { collect };
