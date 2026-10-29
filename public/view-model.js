(function (root) {
  const DAY = 86400000;
  function validTimezone(zone) {
    try { new Intl.DateTimeFormat('en', { timeZone: zone || 'Asia/Singapore' }).format(); return zone || 'Asia/Singapore'; }
    catch { return 'Asia/Singapore'; }
  }
  function dateKey(date, zone) {
    const parts = new Intl.DateTimeFormat('en-CA', { timeZone: validTimezone(zone), year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(date));
    const part = name => parts.find(p => p.type === name).value;
    return `${part('year')}-${part('month')}-${part('day')}`;
  }
  function scoreText(match, revealed) {
    if (!revealed) return 'Reveal score';
    return Number.isInteger(match.score?.home) && Number.isInteger(match.score?.away) ? `${match.score.home} – ${match.score.away}` : 'Unavailable';
  }
  function safeHighlights(match, now = new Date().toISOString()) {
    return (match.highlights || []).filter(video => {
      const age = Date.parse(now) - Date.parse(video.checkedAt);
      return /^[\w-]{11}$/.test(video.videoId) && video.url === `https://www.youtube.com/watch?v=${video.videoId}` &&
        typeof video.title === 'string' && typeof video.channelTitle === 'string' && age >= -300000 && age < 29 * DAY;
    });
  }
  function selectFixtures(fixtures, options = {}, now = new Date().toISOString()) {
    const { view = 'all', teamId = 'all', matchday = 'all', favoritesOnly = false, favorites = [] } = options;
    const result = fixtures.filter(match => {
      const completed = ['FINISHED', 'AWARDED', 'CANCELLED'].includes(match.status);
      return (view !== 'upcoming' || !completed) && (view !== 'recent' || completed) &&
        (view !== 'highlights' || safeHighlights(match, now).length > 0) &&
        (teamId === 'all' || [match.home.id, match.away.id].includes(teamId)) &&
        (matchday === 'all' || String(match.matchday) === matchday) &&
        (!favoritesOnly || [match.home.id, match.away.id].some(id => favorites.includes(id)));
    });
    return result.sort((a, b) => (view === 'recent' || view === 'highlights' ? -1 : 1) * a.utcDate.localeCompare(b.utcDate));
  }
  function shiftMonth(month, offset) {
    const date = new Date(`${month}-01T00:00:00Z`);
    date.setUTCMonth(date.getUTCMonth() + offset);
    return date.toISOString().slice(0, 7);
  }
  function monthGrid(fixtures, month, timezone) {
    const first = new Date(`${month}-01T00:00:00Z`);
    const leading = (first.getUTCDay() + 6) % 7;
    const next = Date.parse(`${shiftMonth(month, 1)}-01T00:00:00Z`);
    const length = Math.round((next - first.getTime()) / DAY);
    const byDate = new Map();
    for (const match of fixtures) {
      const date = dateKey(match.utcDate, timezone);
      if (!date.startsWith(`${month}-`)) continue;
      if (!byDate.has(date)) byDate.set(date, []);
      byDate.get(date).push(match);
    }
    return Array.from({ length: Math.ceil((leading + length) / 7) * 7 }, (_, index) => {
      const date = new Date(first.getTime() + (index - leading) * DAY).toISOString().slice(0, 10);
      return { date, inMonth: date.startsWith(`${month}-`),
        fixtures: (byDate.get(date) || []).sort((a, b) => a.utcDate.localeCompare(b.utcDate)) };
    });
  }
  function selectCalendarDate(days, today) {
    const matching = days.filter(day => day.inMonth && day.fixtures.length);
    return (matching.find(day => day.date >= today) || matching.at(-1) ||
      days.find(day => day.inMonth && day.date === today) || days.find(day => day.inMonth))?.date || null;
  }
  const api = { validTimezone, dateKey, scoreText, safeHighlights, selectFixtures, shiftMonth, monthGrid, selectCalendarDate };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.FootballView = api;
})(typeof globalThis === 'object' ? globalThis : this);
