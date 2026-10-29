# Street Football implementation plan

> **For agentic workers:** Use superpowers:executing-plans task by task.

**Goal:** Publish a working, spoiler-conscious fixture and official highlights dashboard.
**Architecture:** cron-job.org dispatches one Node collector/Pages publisher. Public JSON on Pages holds state; source failures preserve validated snapshots. No database or always-on backend.
**Tech stack:** Node 22 CommonJS, native fetch, node:test, static HTML/CSS/JavaScript.
**Spec:** docs/architecture.md and the approved conversation decisions.

## Global constraints

- $0; public repository, standard GitHub runner, one-day artifact retention.
- No AWS, Fly, MongoDB, Telegram changes or secret files.
- Scores hidden by default; Singapore time; keyboard/mobile support.
- Official YouTube Data API, bounded calls, original metadata behind an explicit spoiler disclosure; no embeds or downloaded videos.
- Explicit bootstrap only on missing snapshot; malformed/unavailable prior state stops publishing.
- Refresh stored YouTube metadata daily and remove it before 30 days if refresh fails.

## Review focus

- Corrupt/missing snapshots after deployment must never reset the season.
- Same opponents meeting close together and youth/throwback videos must not create false links.
- Partial provider/channel failures must retain useful state and signal degraded freshness.
- Postponed fixtures and season rollover must not retain obsolete highlight links.
- Closed score/video disclosures must not expose spoilers to assistive technology.

### Task 1: Validated snapshot and collection core

Files: collector/model.js, collector/matching.js, collector/collect.js, tests/collector.test.js.
Interfaces: validateSnapshot(snapshot); normalizeFixtures(payload); matchVideos(fixtures,videos,now); collect({previous,fixturesProvider,highlightsProvider,now}) returns {snapshot,degraded}.
- [x] Write/run failing offline tests for bad state, delayed uploads (7 days), wrong teams/channels/dates, duplicates, youth videos, outages, season change, rescheduling, expired metadata and partial failures.
- [x] Implement strict public-data validation, stable-ID merge, date/channel matching and recovery rules.
- [x] Run node --test tests/collector.test.js and node --check changed JS; expect pass; commit.

### Task 2: Providers and publication workflow

Files: collector/http.js, collector/providers.js, collector/channels.json, scripts/publish.js, .github/workflows/pages.yml, tests/publish.test.js, package.json.
Interfaces: requestJson(url,options); createProviders({footballToken,youtubeKey,request}); preparePublication({snapshotUrl,bootstrap,outputDir,providers,request,now}).
- [x] Write/run failing tests for HTTP retries/Retry-After, malformed data, safe errors, prior-state 404/500, missing credentials, preserved stale data and atomic output.
- [x] Fetch current-season fixtures; scan known club uploads with pagination; refresh known video IDs daily; bound request quota, time and response size.
- [x] One dispatch/push workflow validates/tests, prepares dist, then deploys; no schedule event, no provider data in Git, no secret diagnostics in output. bootstrap boolean defaults false.
- [x] Run node --test and syntax checks; expect pass; commit.

### Task 3: Fixture dashboard

Files: public/index.html, public/styles.css, public/app.js, public/view-model.js, public/privacy.html, tests/view-model.test.js, scripts/preview.js.
Interfaces: view model consumes schema v1; exposes selectFixtures, dateKey, scoreText, safeHighlights.
- [x] Write/run failing tests for time zones/DST, filters, null scores, concealed scores, stale highlights and invalid URLs.
- [x] Build upcoming/recent/all views, team/gameweek filters, local favorites, time-zone control, per-match scores and explicit video-preview disclosures. Render provider text as text, never HTML.
- [x] Include loading/empty/error/stale states, attribution and privacy/terms links; no fake data on production.
- [x] Run offline suite; inspect actual desktop/mobile UI and interactions with synthetic data served only locally; commit.

### Task 4: Review and release

- [x] Fresh whole-branch review; fix substantive findings with regression tests.
- [x] Update setup/architecture documentation and source status.
- [x] Publish the dashboard with an explicit bootstrap; if credentials are absent, publish a truthful awaiting-data state, with normal dispatch blocked from pretending collection succeeded.
- [x] Once secrets exist, perform the first live collection, inspect results, then advise enabling cron-job.org. Leave Telegram cutover until matchweek validation.

Progress: Tasks 1–4 are complete. Review findings and live channel lookup errors
were reproduced and fixed; the offline suite has 25 passing tests, with syntax
checks passing. Desktop/mobile browser interactions passed locally. On 29 October
2026, live collection published all 380 fixtures and 28 highlight links with both
sources healthy. A subsequent normal workflow dispatch preserved those links and
published a newer snapshot (2026-10-29T11:37:18.011Z).

Release evidence:
- [Successful release](https://github.com/joellimrl/street-football/actions/runs/40866630734)
- [Successful normal dispatch](https://github.com/joellimrl/street-football/actions/runs/40866769429)
- [Live site](https://joellimrl.github.io/street-football/)

Remaining operational steps: enable the saved cron-job.org job if still disabled
(7,37 * * * *, Asia/Singapore; body {"ref":"main"}), keep failure notifications
enabled, and compare a full matchweek before disabling the old Telegram feed.
The previous browser QA workspace no longer existed at release verification;
live assets and snapshot were verified over HTTP, with a new browser pass
awaiting permission to open a replacement workspace.

## Execution decisions

The user explicitly asked to continue the previously approved plan; no repeated design approval is needed. Implementation proceeds inline with one final reviewer. The native worktree tool targets StreetBot rather than this separate repository, so a Git worktree at D:/Code/street-football-dashboard isolates the change. Browser inspection uses ego-browser; hosting remains GitHub Pages as requested.
