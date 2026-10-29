(() => {
  const V = window.FootballView;
  const $ = id => document.getElementById(id);
  const el = (tag, text, className) => { const node = document.createElement(tag); if (text !== undefined) node.textContent = text; if (className) node.className = className; return node; };
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('street-football-preferences') || '{}') || {}; } catch { /* Storage is optional. */ }
  const state = { view: 'upcoming', teamId: 'all', matchday: 'all', favoritesOnly: false,
    favorites: Array.isArray(saved.favorites) ? saved.favorites.filter(id => typeof id === 'string') : [], timezone: V.validTimezone(saved.timezone), limit: 40,
    calendarMonth: null, calendarDay: null };
  const scoreStatuses = ['FINISHED', 'IN_PLAY', 'PAUSED', 'AWARDED'];
  let data; let showAllScores = true; const scoreOverrides = new Map();
  const scoreVisible = match => scoreOverrides.get(match.id) ?? showAllScores;
  const anyScoresVisible = () => data ? data.fixtures.some(match => scoreStatuses.includes(match.status) && scoreVisible(match)) : showAllScores;
  function scoreControl() {
    const anyRevealed = anyScoresVisible();
    $('hide-scores').setAttribute('aria-pressed', String(anyRevealed));
    $('hide-scores').textContent = anyRevealed ? '◉ Hide scores' : '◉ Show all scores';
  }
  function save() { try { localStorage.setItem('street-football-preferences', JSON.stringify({ favorites: state.favorites, timezone: state.timezone })); } catch { /* Works without persistence. */ } }
  function dateFormat(value, options) { return new Intl.DateTimeFormat('en-GB', { timeZone: state.timezone, ...options }).format(new Date(value)); }
  function empty(title, message) {
    const panel = el('div', undefined, 'empty-state'); panel.append(el('span', '+', 'pitch-icon'), el('h2', title), el('p', message));
    panel.firstChild.setAttribute('aria-hidden', 'true'); $('matches').replaceChildren(panel);
  }
  function teamNode(team) {
    const row = el('div', undefined, 'team');
    const code = el('span', team.tla, 'team-code'); code.setAttribute('aria-hidden', 'true');
    const favorite = el('button', state.favorites.includes(team.id) ? '★' : '☆', 'star'); favorite.type = 'button';
    favorite.setAttribute('aria-label', `Favorite ${team.shortName}`); favorite.setAttribute('aria-pressed', String(state.favorites.includes(team.id)));
    favorite.addEventListener('click', () => {
      state.favorites = state.favorites.includes(team.id) ? state.favorites.filter(id => id !== team.id) : [...state.favorites, team.id];
      save(); render();
      document.querySelector(`[aria-label="Favorite ${CSS.escape(team.shortName)}"]`)?.focus();
    });
    row.append(code, el('span', team.shortName, 'team-name'), favorite); return row;
  }
  function videoCard(video) {
    const card = el('article', undefined, 'video-card');
    try {
      const url = new URL(video.thumbnail);
      if (url.protocol === 'https:' && ['i.ytimg.com', 'i9.ytimg.com'].includes(url.hostname)) {
        const image = el('img'); image.src = video.thumbnail; image.alt = video.title; image.loading = 'lazy'; image.referrerPolicy = 'no-referrer'; card.append(image);
      }
    } catch { /* The text link remains usable without a thumbnail. */ }
    const info = el('div'); const link = el('a', 'Watch on YouTube ↗'); link.href = video.url; link.target = '_blank'; link.rel = 'noopener noreferrer';
    info.append(el('h3', video.title), el('p', `${video.channelTitle} · YouTube`), link); card.append(info); return card;
  }
  function matchNode(match) {
    const row = el('article', undefined, 'match'); row.setAttribute('aria-label', `${match.home.shortName} versus ${match.away.shortName}`);
    const kickoff = el('div', undefined, 'kickoff'); const time = el('time', dateFormat(match.utcDate, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' })); time.dateTime = match.utcDate;
    const labels = { FINISHED: 'Full time', IN_PLAY: 'In progress', PAUSED: 'Half time', POSTPONED: 'Postponed', SUSPENDED: 'Suspended', CANCELLED: 'Cancelled', AWARDED: 'Awarded', SCHEDULED: 'Time TBC', TIMED: `GW ${match.matchday || '—'}` };
    kickoff.append(time, el('small', labels[match.status] || 'Scheduled'));
    const teams = el('div', undefined, 'teams'); teams.append(teamNode(match.home), teamNode(match.away)); row.append(kickoff, teams);
    if (scoreStatuses.includes(match.status)) {
      const score = el('button'); score.type = 'button';
      const update = () => {
        const visible = scoreVisible(match); score.textContent = V.scoreText(match, visible);
        score.className = `score-button${visible ? ' revealed' : ''}`;
        score.setAttribute('aria-label', visible ? `${V.scoreText(match, true)}. Hide score for ${match.home.shortName} versus ${match.away.shortName}` : `Reveal score for ${match.home.shortName} versus ${match.away.shortName}`);
        score.setAttribute('aria-pressed', String(visible));
        scoreControl();
      };
      score.addEventListener('click', () => { scoreOverrides.set(match.id, !scoreVisible(match)); update(); }); update(); row.append(score);
    } else row.append(el('span', '—', 'score-placeholder'));
    const highlights = V.safeHighlights(match);
    if (highlights.length) {
      const section = el('div', undefined, 'match-highlights');
      section.append(videoCard(highlights[0]));
      if (highlights.length > 1) {
        const details = el('details', undefined, 'highlights-action');
        const count = highlights.length - 1;
        details.append(el('summary', `${count} more ${count === 1 ? 'highlight' : 'highlights'}`));
        details.addEventListener('toggle', () => {
          if (!details.open) { details.querySelector('.video-disclosure')?.remove(); return; }
          if (details.querySelector('.video-disclosure')) return;
          const content = el('div', undefined, 'video-disclosure video-list');
          for (const video of highlights.slice(1)) content.append(videoCard(video));
          details.append(content);
        });
        section.append(details);
      }
      row.append(section);
    } else row.append(el('span', match.status === 'FINISHED' ? 'Highlights not available yet' : 'Highlights after the match', 'highlights-action'));
    return row;
  }
  function calendarDateLabel(date, options = { weekday: 'long', day: 'numeric', month: 'long' }) {
    // Calendar keys already represent local dates; do not shift them a second time.
    return new Intl.DateTimeFormat('en-GB', { ...options, timeZone: 'UTC' }).format(new Date(`${date}T12:00:00Z`));
  }
  function renderCalendar(fixtures) {
    const today = V.dateKey(new Date().toISOString(), state.timezone);
    state.calendarMonth ||= today.slice(0, 7);
    const days = V.monthGrid(fixtures, state.calendarMonth, state.timezone);
    if (!days.some(day => day.inMonth && day.date === state.calendarDay)) state.calendarDay = V.selectCalendarDate(days, today);
    const monthLabel = calendarDateLabel(`${state.calendarMonth}-01`, { month: 'long', year: 'numeric' });
    $('calendar-title').textContent = monthLabel;
    const count = days.reduce((total, day) => total + day.fixtures.length, 0);
    $('result-count').textContent = `${count} ${count === 1 ? 'match' : 'matches'} in ${monthLabel}`;
    $('calendar-grid').replaceChildren();
    for (const day of days) {
      const cell = el(day.inMonth ? 'button' : 'div', undefined, `calendar-day${day.inMonth ? '' : ' outside-month'}`);
      cell.append(el('span', String(Number(day.date.slice(-2))), 'calendar-date'));
      if (!day.inMonth) {
        cell.setAttribute('aria-hidden', 'true'); $('calendar-grid').append(cell); continue;
      }
      cell.type = 'button'; cell.dataset.calendarDate = day.date;
      cell.setAttribute('aria-pressed', String(day.date === state.calendarDay));
      cell.setAttribute('aria-label', `${calendarDateLabel(day.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}, ${day.fixtures.length} ${day.fixtures.length === 1 ? 'match' : 'matches'}`);
      if (day.date === today) cell.setAttribute('aria-current', 'date');
      if (day.fixtures.length) {
        const countLabel = el('span', `${day.fixtures.length} ${day.fixtures.length === 1 ? 'match' : 'matches'}`, 'calendar-count');
        countLabel.setAttribute('aria-hidden', 'true'); cell.append(countLabel);
        const events = el('span', undefined, 'calendar-events'); events.setAttribute('aria-hidden', 'true');
        for (const match of day.fixtures.slice(0, 3)) {
          const item = el('span', undefined, 'calendar-event');
          const special = { POSTPONED: 'Postponed', CANCELLED: 'Cancelled', SUSPENDED: 'Suspended', SCHEDULED: 'Time TBC', AWARDED: 'Awarded' };
          item.append(el('span', special[match.status] || dateFormat(match.utcDate, { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }), 'calendar-time'),
            el('span', `${match.home.tla} · ${match.away.tla}`, 'calendar-teams'));
          events.append(item);
        }
        if (day.fixtures.length > 3) events.append(el('span', `+${day.fixtures.length - 3} more`, 'calendar-more'));
        cell.append(events);
      }
      cell.addEventListener('click', () => {
        state.calendarDay = day.date; render();
        document.querySelector(`[data-calendar-date="${day.date}"]`)?.focus({ preventScroll: true });
      });
      $('calendar-grid').append(cell);
    }
    return days.find(day => day.date === state.calendarDay)?.fixtures || [];
  }
  function render() {
    if (!data) return;
    scoreControl();
    $('favorites-only').setAttribute('aria-pressed', String(state.favoritesOnly));
    $('favorites-only').textContent = `${state.favoritesOnly ? '★' : '☆'} My teams`;
    for (const button of document.querySelectorAll('[data-view]')) button.setAttribute('aria-pressed', String(button.dataset.view === state.view));
    const calendar = state.view === 'calendar'; $('calendar-panel').hidden = !calendar;
    const filtered = V.selectFixtures(data.fixtures, state);
    const matches = calendar ? renderCalendar(filtered) : filtered; $('matches').replaceChildren();
    if (!calendar) $('result-count').textContent = `${matches.length} ${matches.length === 1 ? 'match' : 'matches'}`;
    $('zone-label').textContent = `Times in ${state.timezone.replaceAll('_', ' ')}`;
    $('load-more').hidden = calendar || matches.length <= state.limit;
    if (!data.fixtures.length) {
      empty('The first fixtures are on their way.', 'Match times, scores and available highlights will appear after the first successful update.');
      $('result-count').textContent = 'Awaiting first update'; return;
    }
    if (!matches.length) { empty(calendar ? `No matches on ${calendarDateLabel(state.calendarDay)}.` : 'No matches in this view.', state.favoritesOnly && !state.favorites.length ? 'Star a team in the fixture list, then use My teams to follow them.' : calendar ? 'Select another day or change your filters.' : 'Try another team, gameweek or match view.'); return; }
    let currentDay; let group;
    for (const match of calendar ? matches : matches.slice(0, state.limit)) {
      const key = V.dateKey(match.utcDate, state.timezone);
      if (key !== currentDay) {
        currentDay = key; group = el('section', undefined, 'day-group');
        const heading = el('h2', dateFormat(match.utcDate, { weekday: 'long', day: 'numeric', month: 'long' }), 'day-heading');
        const today = key === V.dateKey(new Date().toISOString(), state.timezone);
        heading.append(el('small', today ? 'TODAY' : dateFormat(match.utcDate, { year: 'numeric' }))); group.append(heading); $('matches').append(group);
      }
      group.append(matchNode(match));
    }
  }
  function freshness() {
    const warnings = [];
    for (const name of ['fixtures', 'highlights']) {
      const source = data.sources[name]; const label = name === 'fixtures' ? 'Fixtures' : 'Highlights';
      const age = Date.now() - Date.parse(source.lastSuccessAt);
      $(name + '-freshness').textContent = `${label}: ${source.lastSuccessAt ? dateFormat(source.lastSuccessAt, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'awaiting first update'}${source.status === 'ok' ? '' : ' · update pending'}`;
      if (source.status !== 'ok' || age > 2 * 3600000) warnings.push(label.toLowerCase());
    }
    $('notice').hidden = !warnings.length;
    $('notice').textContent = data.fixtures.length ? `Updates to ${warnings.join(' and ')} are delayed. Showing the last available data. Kickoff times can change.` : 'The first data update is pending.';
  }
  function options() {
    const teams = new Map(data.fixtures.flatMap(m => [[m.home.id, m.home], [m.away.id, m.away]]));
    $('team').replaceChildren(new Option('All teams', 'all'));
    for (const team of [...teams.values()].sort((a, b) => a.shortName.localeCompare(b.shortName))) $('team').append(new Option(team.shortName, team.id));
    if (!teams.has(state.teamId)) state.teamId = 'all'; $('team').value = state.teamId;
    $('matchday').replaceChildren(new Option('All gameweeks', 'all'));
    const days = [...new Set(data.fixtures.map(m => m.matchday).filter(Number.isInteger))].sort((a, b) => a - b);
    for (const day of days) $('matchday').append(new Option(`Gameweek ${day}`, String(day)));
    if (!days.includes(Number(state.matchday))) state.matchday = 'all'; $('matchday').value = state.matchday;
    if (data.season) $('season').textContent = `${data.season.startDate.slice(0, 4)}/${data.season.endDate.slice(2, 4)}`;
  }
  async function load() {
    $('refresh').disabled = true; $('matches').setAttribute('aria-busy', 'true');
    try {
      const response = await fetch('./data/snapshot.json', { cache: 'no-cache', signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Snapshot unavailable');
      const candidate = await response.json();
      if (candidate.schemaVersion !== 1 || !Array.isArray(candidate.fixtures) || !candidate.sources?.fixtures || !candidate.sources?.highlights) throw new Error('Invalid snapshot');
      data = candidate; options(); freshness(); render();
    } catch {
      if (!data) { empty('Fixtures couldn’t be loaded.', 'Please try again in a moment.'); $('result-count').textContent = 'Data unavailable'; }
      $('notice').hidden = false; $('notice').textContent = 'The latest snapshot could not be loaded. Try Refresh page data.';
    } finally { $('refresh').disabled = false; $('matches').setAttribute('aria-busy', 'false'); }
  }
  const localZone = V.validTimezone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  if (![...$('timezone').options].some(option => option.value === localZone)) $('timezone').append(new Option(`My device (${localZone})`, localZone));
  if (![...$('timezone').options].some(option => option.value === state.timezone)) $('timezone').append(new Option(state.timezone, state.timezone));
  $('timezone').value = state.timezone;
  for (const button of document.querySelectorAll('[data-view]')) button.addEventListener('click', () => { state.view = button.dataset.view; state.limit = 40; render(); });
  $('team').addEventListener('change', event => { state.teamId = event.target.value; state.limit = 40; state.calendarDay = null; render(); });
  $('matchday').addEventListener('change', event => { state.matchday = event.target.value; state.limit = 40; state.calendarDay = null; render(); });
  $('timezone').addEventListener('change', event => { state.timezone = V.validTimezone(event.target.value); state.calendarDay = null; save(); if (data) freshness(); render(); });
  $('favorites-only').addEventListener('click', () => { state.favoritesOnly = !state.favoritesOnly; state.limit = 40; state.calendarDay = null; render(); });
  for (const [id, offset] of [['previous-month', -1], ['next-month', 1]]) {
    $(id).addEventListener('click', () => { state.calendarMonth = V.shiftMonth(state.calendarMonth, offset); state.calendarDay = null; render(); });
  }
  $('current-month').addEventListener('click', () => { state.calendarMonth = V.dateKey(new Date().toISOString(), state.timezone).slice(0, 7); state.calendarDay = null; render(); });
  $('hide-scores').addEventListener('click', () => { showAllScores = !anyScoresVisible(); scoreOverrides.clear(); render(); });
  $('load-more').addEventListener('click', () => { state.limit += 40; render(); });
  $('refresh').addEventListener('click', load);
  load();
})();
