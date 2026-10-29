const { test } = require('node:test');
const assert = require('node:assert/strict');
const { fixture, video, NOW } = require('./fixtures');
const { dateKey, selectFixtures, scoreText, safeHighlights, validTimezone, shiftMonth, monthGrid, selectCalendarDate } = require('../public/view-model');
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

test('month navigation crosses year boundaries in both directions', () => {
  assert.equal(shiftMonth('2026-12', 1), '2027-01');
  assert.equal(shiftMonth('2027-01', -1), '2026-12');
  assert.equal(shiftMonth('2026-10', 0), '2026-10');
});

test('month grids start on Monday and include leap days and whole weeks', () => {
  const february = monthGrid([], '2024-02', 'UTC');
  assert.equal(february[0].date, '2024-01-29');
  assert.equal(february.at(-1).date, '2024-03-03');
  assert.equal(february.length, 35);
  assert.equal(february.filter(day => day.inMonth).length, 29);
  const march = monthGrid([], '2026-03', 'UTC');
  assert.equal(march[0].date, '2026-02-23');
  assert.equal(march.at(-1).date, '2026-04-05');
  assert.equal(march.length, 42);
});

test('calendar places fixtures in their selected local month, including daylight-saving changes', () => {
  const fixtures = [
    fixture({ id: 'late', utcDate: '2026-10-31T20:00:00Z' }),
    fixture({ id: 'early', utcDate: '2026-10-31T16:00:00Z' }),
    fixture({ id: 'october', utcDate: '2026-10-31T15:59:00Z' })
  ];
  const singapore = monthGrid(fixtures, '2026-11', 'Asia/Singapore');
  assert.deepEqual(singapore.find(day => day.date === '2026-11-01').fixtures.map(match => match.id), ['early', 'late']);
  assert.equal(singapore.find(day => day.date === '2026-10-31').fixtures.length, 0);
  assert.equal(monthGrid(fixtures, '2026-11', 'UTC').flatMap(day => day.fixtures).length, 0);
  const london = monthGrid([
    fixture({ id: 'summer', utcDate: '2026-10-24T23:30:00Z' }),
    fixture({ id: 'winter', utcDate: '2026-10-25T23:30:00Z' })
  ], '2026-10', 'Europe/London');
  assert.deepEqual(london.find(day => day.date === '2026-10-25').fixtures.map(match => match.id), ['summer', 'winter']);
});

test('calendar retains the full month and applies existing filters to completed and upcoming fixtures', () => {
  const fixtures = Array.from({ length: 65 }, (_, i) => fixture({
    id: String(i), status: i % 2 ? 'TIMED' : 'FINISHED',
    matchday: i < 50 ? 9 : 10, utcDate: `2026-10-${String(1 + i % 31).padStart(2, '0')}T15:00:00Z`
  }));
  assert.equal(monthGrid(fixtures, '2026-10', 'UTC').flatMap(day => day.fixtures).length, 65);
  const filtered = selectFixtures(fixtures, { view: 'calendar', teamId: '61', matchday: '9', favoritesOnly: true, favorites: ['57'] }, NOW);
  const shown = monthGrid(filtered, '2026-10', 'UTC').flatMap(day => day.fixtures);
  assert.equal(shown.length, 50);
  assert.equal(shown.filter(match => match.status === 'FINISHED').length, 25);
  assert.equal(shown.filter(match => match.status === 'TIMED').length, 25);
  assert.equal(monthGrid(selectFixtures(fixtures, { favoritesOnly: true, favorites: [] }), '2026-10', 'UTC').flatMap(day => day.fixtures).length, 0);
});

test('calendar initially selects the next matching date, then most recent past date, with empty-month fallback', () => {
  const days = monthGrid([
    fixture({ utcDate: '2026-10-25T15:00:00Z' }),
    fixture({ id: 'later', utcDate: '2026-10-31T15:00:00Z' })
  ], '2026-10', 'UTC');
  assert.equal(selectCalendarDate(days, '2026-10-29'), '2026-10-31');
  assert.equal(selectCalendarDate(days, '2026-11-01'), '2026-10-31');
  assert.equal(selectCalendarDate(days, '2026-10-25'), '2026-10-25');
  assert.equal(selectCalendarDate(monthGrid([], '2026-10', 'UTC'), '2026-10-29'), '2026-10-29');
  assert.equal(selectCalendarDate(monthGrid([], '2026-11', 'UTC'), '2026-10-29'), '2026-11-01');
});
