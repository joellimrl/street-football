const { requestJson } = require('./http');
const { DAY, validateVideo } = require('./model');
const { isHighlight } = require('./matching');
const catalogue = require('./channels.json');

function createProviders({ footballToken, youtubeKey, request = requestJson, channels = catalogue, report = () => {} } = {}) {
  const failure = (stage, team, error) => report({ stage, team,
    reason: ['Club channel not configured', 'Unknown club channel', 'YouTube request budget reached', 'Upload page limit reached'].includes(error.message) ? error.message : 'Request or response failed',
    httpStatus: Number.isInteger(error.status) && error.status >= 100 && error.status <= 599 ? error.status : null });
  const fixturesProvider = footballToken ? () => request('https://api.football-data.org/v4/competitions/PL/matches', {
    headers: { 'X-Auth-Token': footballToken }
  }) : undefined;
  const highlightsProvider = youtubeKey ? async (fixtures, now) => {
    let attempts = 0; let healthy = true;
    const failedTeamIds = new Set(); const videos = []; const removedIds = [];
    const channelTeams = new Map(); const ids = new Set(); const oldVideos = new Map();
    const api = async (resource, params) => {
      const url = new URL(`https://www.googleapis.com/youtube/v3/${resource}`);
      for (const [key, value] of Object.entries(params)) if (value) url.searchParams.set(key, value);
      const data = await request(url.href, { headers: { 'X-Goog-Api-Key': youtubeKey }, beforeAttempt: () => {
        if (++attempts > 160) throw new Error('YouTube request budget reached');
      } });
      if (!Array.isArray(data.items)) throw new Error('Invalid YouTube response');
      return data;
    };
    for (const match of fixtures) for (const video of match.highlights) {
      oldVideos.set(video.videoId, video); channelTeams.set(video.channelId, video.teamId);
      if (Date.parse(now) - Date.parse(video.checkedAt) >= DAY) ids.add(video.videoId);
    }
    // Taper discovery after two days, but continue through the full seven-day upload window.
    const due = fixtures.filter(m => m.status === 'FINISHED' && Date.parse(now) - Date.parse(m.utcDate) <= 8 * DAY &&
      (!m.lastHighlightsCheckAt || Date.parse(now) - Date.parse(m.lastHighlightsCheckAt) >=
        (Date.parse(now) - Date.parse(m.utcDate) > 2 * DAY ? 6 * 3600000 : 25 * 60000)));
    const teams = new Map(due.flatMap(m => [[m.home.id, m.home], [m.away.id, m.away]]));
    for (const team of teams.values()) {
      let stage = 'channels';
      try {
        const config = channels.find(c => c.tla === team.tla);
        if (!config) throw new Error('Club channel not configured');
        const data = await api('channels', { part: 'contentDetails', id: config.channelId, forUsername: config.user, forHandle: config.handle });
        const channel = data.items[0];
        if (!channel?.id || !channel.contentDetails?.relatedPlaylists?.uploads || (config.channelId && channel.id !== config.channelId)) throw new Error('Unknown club channel');
        channelTeams.set(channel.id, team.id);
        stage = 'playlistItems';
        let pageToken;
        for (let page = 0; page < 3; page++) {
          const feed = await api('playlistItems', { part: 'snippet,contentDetails', playlistId: channel.contentDetails.relatedPlaylists.uploads, maxResults: '50', pageToken });
          for (const item of feed.items) {
            const details = item.contentDetails;
            if (details?.videoId && Date.parse(details.videoPublishedAt) >= Date.parse(now) - 9 * DAY) ids.add(details.videoId);
          }
          const reachedOld = feed.items.some(item => Date.parse(item.contentDetails?.videoPublishedAt) < Date.parse(now) - 9 * DAY);
          if (!feed.nextPageToken || reachedOld) break;
          if (page === 2) { healthy = false; failedTeamIds.add(team.id); failure(stage, team.tla, new Error('Upload page limit reached')); }
          pageToken = feed.nextPageToken;
        }
      } catch (error) { healthy = false; failedTeamIds.add(team.id); failure(stage, team.tla, error); }
    }
    const allIds = [...ids];
    for (let offset = 0; offset < allIds.length; offset += 50) {
      const batch = allIds.slice(offset, offset + 50);
      try {
        const data = await api('videos', { part: 'snippet,contentDetails,status', id: batch.join(',') });
        const returned = new Set();
        for (const item of data.items) {
          if (!batch.includes(item.id)) throw new Error('Unexpected video');
          returned.add(item.id);
          const snippet = item.snippet;
          const teamId = channelTeams.get(snippet?.channelId);
          if (!teamId || item.status?.privacyStatus !== 'public' || !isHighlight(snippet.title)) {
            if (oldVideos.has(item.id)) removedIds.push(item.id);
            continue;
          }
          const thumbnail = snippet.thumbnails?.high?.url || snippet.thumbnails?.medium?.url || snippet.thumbnails?.default?.url;
          const video = { videoId: item.id, title: snippet.title, channelId: snippet.channelId, channelTitle: snippet.channelTitle,
            teamId, thumbnail, url: `https://www.youtube.com/watch?v=${item.id}`, publishedAt: snippet.publishedAt, checkedAt: now };
          validateVideo(video); videos.push(video);
        }
        for (const videoId of batch) if (!returned.has(videoId) && oldVideos.has(videoId)) removedIds.push(videoId);
      } catch (error) { healthy = false; for (const team of teams.values()) failedTeamIds.add(team.id); failure('videos', null, error); }
    }
    return { videos, removedIds, failedTeamIds: [...failedTeamIds], checkedFixtureIds: due.map(m => m.id), healthy };
  } : undefined;
  return { fixturesProvider, highlightsProvider };
}
module.exports = { createProviders };
