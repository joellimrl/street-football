# Street Football agent guide

## Scope

A free, open-source, public Premier League schedule and highlights site.
This repository is independent of StreetBot. GitHub Pages is the chosen
frontend host. The backend is proposed, not yet provisioned.

## Current state

- `public/` is a buildless static starter, not a working fixture dashboard.
- `.github/workflows/pages.yml` publishes only `public/` to GitHub Pages.
- `docs/architecture.md` records backend options and the implementation plan.
- No provider credentials, real fixture data, collector, database or AWS
  resources are included.

## Boundaries

- Check `git status --short` before edits; preserve unrelated work.
- Never read, print, commit or modify `.env` files. Document required variable
  names without credential values.
- Keep all provider API credentials in the collector's secret configuration.
  Browser bundles and published snapshots must contain only public data.
- Do not couple the site to StreetBot, its Fly deployment or MongoDB.
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
