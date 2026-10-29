# Street Football

A free, open-source Premier League schedule and highlights companion.
See when matches happen in your time zone, check scores and follow links
to official highlights directly from each match card.

**Status:** fixture dashboard and collector implemented. Live operation requires
the two provider secrets and an initial successful bootstrap (see Operations).

- Website: https://joellimrl.github.io/street-football/
- [Architecture and implementation plan](docs/architecture.md)
- [Set up cron-job.org](docs/cron-job-setup.md)
- [Credentials, deployment and recovery](docs/operations.md)
- [Source licence](LICENSE)

## Hosting decisions

- **Selected:** cron-job.org triggers GitHub Actions for collection; GitHub
  Pages hosts the public frontend and JSON snapshots. The repository stays public.
- **Required:** $0 ongoing hosting cost. Use standard runners, small artifacts
  and short retention within included storage. No paid runner/storage upgrades.
- **Excluded:** AWS, MongoDB, StreetBot/Fly access, user accounts and an
  always-on backend server.
- **Accepted tradeoff:** external triggers and Actions runs can fail or be
  delayed. The dispatch token needs renewal before expiry. Preserve the last
  valid data, retry unfinished matches and show update freshness.

The collector still needs private provider API credentials. Those belong in
GitHub Actions secrets, never in browser JavaScript or Git history.
Site visitors read a cached public JSON snapshot; they do not trigger provider
requests or collector executions.

## Features

- Full-season fixtures, with an upcoming-match view and team/gameweek filters.
- Asia/Singapore display time by default; UTC timestamps in stored data.
- Scores shown by default, with optional per-match and global hiding.
- The first verified official highlight shown directly, with more available on expansion.
- Retryable discovery of delayed uploads and visible data freshness.
- Clear distinctions between no matches, no highlights yet and failed updates.

The top video preview shows the original YouTube title, thumbnail and direct
YouTube link without expansion. Additional videos use a disclosure. Hiding match
scores does not conceal video titles or thumbnails, which may contain results.
No player is embedded; video metadata is refreshed daily or removed before
30 days. See the privacy/terms page and the operational retention requirement.

## Local preview

Use Node 22 or later; no dependency install is needed.

```sh
node --test tests/*.test.js
node scripts/preview.js --demo
```

Open http://127.0.0.1:4173/. Demo data is synthetic, generated only by the local
preview server, and clearly labelled. It is never included in production.
Without `--demo`, the preview reads `dist/data/snapshot.json` if available.

## Deployment

Relevant pushes to `main`, manual runs and API dispatches use the same workflow
and concurrency group. Tests run before collection and publication. GitHub
Pages must use **GitHub Actions** as its publishing source. The initial run
requires the `bootstrap` input; routine cron requests remain `{"ref":"main"}`.
Enable cron-job.org after the initial live run and snapshot verification.

If a provider fails, the site keeps usable prior data and shows source freshness;
the workflow reports failure after publication so Actions notifications can
alert the operator. If the previous snapshot is unavailable or malformed,
publication stops entirely. See [Operations](docs/operations.md).

For forks, update this README and the starter's repository link, then enable
Pages in the fork's settings. The stylesheet uses a relative path so project
sites work under a repository subpath.

## Source and data licences

The application source is MIT-licensed. That licence does not cover football
datasets, club or competition branding, YouTube videos, or other third-party
content. No club badges or downloaded videos are included.

The fixture provider is football-data.org. Its required attribution
is displayed on the site: **Football data provided by
the Football-Data.org API**. Provider terms, quota limits and data-retention
requirements also apply to fork operators.
