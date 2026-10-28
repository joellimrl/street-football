# Street Football agent guide

## Scope

A free, open-source, public Premier League schedule and highlights site.
This repository is independent of StreetBot. GitHub Actions is the selected
collector runner; cron-job.org triggers it through workflow_dispatch, and
GitHub Pages hosts the frontend and public JSON snapshots.
The budget is $0. AWS and separately hosted backend services are out of scope.

## Current state

- `public/` is the buildless fixture dashboard; `collector/` holds data adapters,
  matching and validation; `scripts/publish.js` preserves state and builds `dist/`.
- `.github/workflows/pages.yml` tests offline, collects, then publishes `dist/`.
- `docs/cron-job-setup.md` describes the external trigger; `docs/operations.md`
  covers credentials, initial bootstrap, recovery and source failures.
- `docs/architecture.md` records the selected architecture and implementation plan.
- Provider credentials belong only in GitHub Actions secrets. Real data is
  published as a snapshot, never committed to this repository.

## Boundaries

- Check `git status --short` before edits; preserve unrelated work.
- Never read, print, commit or modify `.env` files. Document required variable
  names without credential values.
- Keep all provider API credentials in the collector's secret configuration.
  Browser bundles and published snapshots must contain only public data.
- Do not couple the site to StreetBot, its Fly deployment or MongoDB.
- Keep the workflow dispatchable by cron-job.org; do not add a GitHub schedule
  trigger, keepalive commits or automatic workflow re-enablement.
- Keep the repository public, use standard Actions runners and keep artifacts
  small with short retention within included storage. Do not add paid services.
- Persist only public retry/link state in the published snapshot. All deploy
  paths must preserve the last valid data; never use Actions cache as the only
  durable state or commit changing provider metadata to Git history.
- Scores are hidden by default. Avoid score spoilers in titles, previews and
  accessibility labels. Review YouTube metadata display requirements before
  implementing video cards; do not obscure or modify an embedded player.
- Use team names and original graphics unless third-party image rights have
  been established. The MIT licence covers source code, not provider content.
- Do not run production collectors or provision cloud resources as a test.

## Implementation and validation

- Prefer a static frontend and a portable CommonJS Node.js collector.
- No framework or dependency installation is needed. Use Node 22 or later.
- Run `node --test tests/*.test.js` for the offline suite: delayed
  uploads, upstream failures, duplicate runs, rescheduling and time zones.
- Run `node --check` for each changed JavaScript file.
- Preserve the last valid snapshot when fetching or validation fails.
- Report checks performed and any external services contacted.
