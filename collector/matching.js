const { DAY } = require('./model');
const ALIASES = { MCI: ['man city', 'manchester city'], MUN: ['man utd', 'man united', 'manchester united'],
  TOT: ['spurs', 'tottenham'], WOL: ['wolves', 'wolverhampton'], BHA: ['brighton'], NOT: ['nottingham forest', 'nottm forest'],
  WHU: ['west ham'], NEW: ['newcastle'], AVL: ['aston villa'], BOU: ['bournemouth'], IPS: ['ipswich'],
  CRY: ['crystal palace', 'palace'] };
function words(value) { return value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, ' ').trim(); }
function mentions(title, team) {
  const names = [team.name.replace(/\s+FC$/i, ''), team.shortName, ...(ALIASES[team.tla] || [])];
  return names.some(name => words(name).length > 3 && ` ${words(title)} `.includes(` ${words(name)} `));
}
function isHighlight(title) {
  const value = words(title);
  return /\bhighlights?\b/.test(value) && !/\b(women|womens|ladies|u ?(?:18|19|21|23)|under ?(?:18|19|21|23)|youth|academy|legends|classic|throwback|retro|pl2|premier league 2|friendly|pre season|carabao|fa cup|efl cup)\b/.test(value);
}
function matchVideos(fixtures, videos, now) {
  const result = new Map();
  const seen = new Set();
  for (const video of videos) {
    if (seen.has(video.videoId) || !isHighlight(video.title) || Date.parse(video.publishedAt) > Date.parse(now)) continue;
    seen.add(video.videoId);
    const candidates = fixtures.filter(match => {
      const delay = Date.parse(video.publishedAt) - Date.parse(match.utcDate);
      return match.status === 'FINISHED' && delay >= 90 * 60000 && delay <= 7 * DAY &&
        [match.home.id, match.away.id].includes(video.teamId) && mentions(video.title, match.home) && mentions(video.title, match.away);
    });
    if (candidates.length !== 1) continue;
    const list = result.get(candidates[0].id) || [];
    list.push(video);
    result.set(candidates[0].id, list);
  }
  return result;
}
module.exports = { matchVideos, isHighlight };
