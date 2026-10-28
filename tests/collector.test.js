const { test } = require('node:test');
const assert = require('node:assert/strict');
const { NOW, fixture, video, snapshot, payload } = require('./fixtures');
const { validateSnapshot, normalizeFixtures } = require('../collector/model');
const { matchVideos } = require('../collector/matching');
const { collect } = require('../collector/collect');
const noVideos = async () => ({ videos: [], removedIds: [], failedTeamIds: [], healthy: true });

test('untrusted snapshots reject invalid URLs, scores, extra private fields and duplicate IDs', () => {
  assert.doesNotThrow(() => validateSnapshot(snapshot()));
  for (const bad of [snapshot({ schemaVersion: 2 }), snapshot({ fixtures: [fixture(), fixture()] }),
    snapshot({ fixtures: [fixture({ score: { home: -1, away: 0 } })] }),
    snapshot({ token: 'private' }), snapshot({ fixtures: [fixture({ highlights: [video({ url: 'javascript:alert(1)' })] })] })]) {
    assert.throws(() => validateSnapshot(bad));
  }
});
test('normalize rejects empty and malformed results rather than interpreting them as no matches', () => {
  assert.throws(() => normalizeFixtures({ matches: [] }));
  assert.throws(() => normalizeFixtures(payload({ utcDate: 'bad' })));
  assert.equal(normalizeFixtures(payload()).fixtures[0].score.home, 2);
});
test('a delayed upload four days after kickoff still matches', () => {
  assert.equal(matchVideos([fixture()], [video()], NOW).get('123')[0].videoId, 'abcdefghijk');
});
test('reject youth, historical, unrelated channels/opponents and out-of-window videos', () => {
  for (const candidate of [video({ title: 'Arsenal Chelsea U21 highlights' }), video({ title: 'Classic Arsenal Chelsea highlights' }),
    video({ title: 'Arsenal Liverpool highlights' }), video({ teamId: '99' }),
    video({ publishedAt: '2026-10-25T14:00:00Z' }), video({ publishedAt: '2026-11-05T12:00:00Z' })]) {
    assert.equal(matchVideos([fixture()], [candidate], NOW).get('123')?.length || 0, 0);
  }
});
test('ambiguous repeat opponents do not share a video and duplicate IDs collapse', () => {
  assert.equal(matchVideos([fixture(), fixture({ id: '456', utcDate: '2026-10-27T12:00:00Z' })], [video()], NOW).size, 0);
  assert.equal(matchVideos([fixture()], [video(), video()], NOW).get('123').length, 1);
});
test('upstream failures preserve existing data and report stale source separately', async () => {
  const previous = snapshot({ fixtures: [fixture({ highlights: [video()] })] });
  const result = await collect({ previous, now: NOW, fixturesProvider: async () => { throw new Error('secret query'); },
    highlightsProvider: async () => { throw new Error('private'); } });
  assert.equal(result.snapshot.fixtures[0].highlights.length, 1);
  assert.equal(result.snapshot.sources.fixtures.status, 'error');
  assert.equal(result.snapshot.sources.fixtures.lastSuccessAt, NOW);
  assert.equal(result.degraded, true);
  assert.ok(!JSON.stringify(result).includes('secret'));
});
test('season changes and rescheduling clear obsolete highlights', async () => {
  const previous = snapshot({ fixtures: [fixture({ highlights: [video()] })] });
  for (const update of [payload({ status: 'POSTPONED', utcDate: '2026-11-05T15:00:00Z' }),
    payload({ season: { id: 2027, startDate: '2027-08-01', endDate: '2028-05-31' } })]) {
    const result = await collect({ previous, now: NOW, fixturesProvider: async () => update, highlightsProvider: noVideos });
    assert.deepEqual(result.snapshot.fixtures[0].highlights, []);
  }
});
test('failed refresh deletes expired YouTube data and confirmed unavailable videos disappear', async () => {
  const previous = snapshot({ fixtures: [fixture({ highlights: [video({ checkedAt: '2026-09-01T12:00:00Z' })] })] });
  const result = await collect({ previous, now: NOW, fixturesProvider: async () => payload(), highlightsProvider: async () => { throw new Error(); } });
  assert.deepEqual(result.snapshot.fixtures[0].highlights, []);
  previous.fixtures[0].highlights = [video()];
  const removed = await collect({ previous, now: NOW, fixturesProvider: async () => payload(),
    highlightsProvider: async () => ({ videos: [], removedIds: ['abcdefghijk'], failedTeamIds: [], healthy: true }) });
  assert.deepEqual(removed.snapshot.fixtures[0].highlights, []);
});
test('partial highlight failure preserves links but does not claim complete source success', async () => {
  const result = await collect({ previous: snapshot(), now: NOW, fixturesProvider: async () => payload(),
    highlightsProvider: async () => ({ videos: [video()], removedIds: [], failedTeamIds: ['61'], healthy: false }) });
  assert.equal(result.snapshot.fixtures[0].highlights.length, 1);
  assert.equal(result.snapshot.sources.highlights.status, 'error');
});
test('an idle discovery run must not postpone the next due highlight check', async () => {
  const previous = snapshot({ fixtures: [fixture({ lastHighlightsCheckAt: '2026-10-29T08:00:00.000Z' })] });
  const result = await collect({ previous, now: NOW, fixturesProvider: async () => payload(),
    highlightsProvider: async () => ({ videos: [], removedIds: [], failedTeamIds: [], checkedFixtureIds: [], healthy: true }) });
  assert.equal(result.snapshot.fixtures[0].lastHighlightsCheckAt, '2026-10-29T08:00:00.000Z');
});
