const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture, video, NOW } = require('./fixtures');
const { dateKey, selectFixtures, scoreText, safeHighlights, validTimezone } = require('../public/view-model');
test('kickoffs group into the selected local day including daylight-saving boundaries', () => {
  assert.equal(dateKey('2026-10-29T20:00:00Z', 'Asia/Singapore'), '2026-10-30');
  assert.equal(dateKey('2026-10-24T23:30:00Z', 'Europe/London'), '2026-10-25');
  assert.equal(validTimezone('invalid'), 'Asia/Singapore');
});
test('score formatting supports shown and hidden states, including null and zero scores', () => {
  assert.equal(scoreText(fixture(), false), 'Reveal score');
  assert.equal(scoreText(fixture(), true), '2 – 1');
  assert.equal(scoreText(fixture({ score: { home: 0, away: 0 } }), true), '0 – 0');
  assert.equal(scoreText(fixture({ score: { home: null, away: null } }), true), 'Unavailable');
});
test('team, gameweek and favorites filters combine with upcoming and completed views', () => {
  const fixtures = [fixture(), fixture({ id: '456', status: 'TIMED', matchday: 10, utcDate: '2026-11-01T15:00:00Z' }),
    fixture({ id: '789', status: 'POSTPONED', utcDate: '2026-10-24T15:00:00Z' })];
  assert.deepEqual(selectFixtures(fixtures, { view: 'upcoming', matchday: '10' }, NOW).map(m => m.id), ['456']);
  assert.deepEqual(selectFixtures(fixtures, { view: 'recent', teamId: '61' }, NOW).map(m => m.id), ['123']);
  assert.deepEqual(selectFixtures(fixtures, { favoritesOnly: true, favorites: [] }, NOW), []);
  assert.equal(selectFixtures(fixtures, { favoritesOnly: true, favorites: ['57'] }, NOW).length, 3);
});
test('expired links and untrusted destinations are not offered in the UI', () => {
  assert.equal(safeHighlights(fixture({ highlights: [video()] }), NOW).length, 1);
  assert.equal(safeHighlights(fixture({ highlights: [video({ checkedAt: '2026-09-01T12:00:00Z' })] }), NOW).length, 0);
  assert.equal(safeHighlights(fixture({ highlights: [video({ url: 'https://evil.example/' })] }), NOW).length, 0);
});
