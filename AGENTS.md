# Street Football agent guide

## Scope

A free, open-source, public Premier League schedule and highlights site.
This repository is independent of StreetBot. GitHub Actions is the selected
collector runner; GitHub Pages hosts the frontend and public JSON snapshots.
The budget is $0. AWS and separately hosted backend services are out of scope.

## Current state

- `public/` is a buildless static starter, not a working fixture dashboard.
- `.github/workflows/pages.yml` publishes only `public/` to GitHub Pages.
- `docs/architecture.md` records the selected architecture and implementation plan.
- No provider credentials, real fixture data, collector, database or AWS
  resources are included.

## Boundaries

- Check `git status --short` before edits; preserve unrelated work.
- Never read, print, commit or modify `.env` files. Document required variable
  names without credential values.
- Keep all provider API credentials in the collector's secret configuration.
  Browser bundles and published snapshots must contain only public data.
- Do not couple the site to StreetBot, its Fly deployment or MongoDB.
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
- No framework or dependency installation is needed for the current starter.
- Add meaningful offline tests when the collector is implemented: delayed
  uploads, upstream failures, duplicate runs, rescheduling and time zones.
- Run `node --check` for JavaScript files changed in future work.
- Preserve the last valid snapshot when fetching or validation fails.
- Report checks performed and any external services contacted.
