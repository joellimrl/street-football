# Street Football

A free, open-source Premier League schedule and highlights companion.
See when matches happen in your time zone, keep scores hidden until you
choose to reveal them, and follow links to official highlights.

**Status:** repository and GitHub Pages starter. Live fixtures, highlight
collection and score-reveal controls are not implemented yet.

- Website: https://joellimrl.github.io/street-football/
- [Architecture and implementation plan](docs/architecture.md)
- [Set up cron-job.org](docs/cron-job-setup.md)
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

## Planned first release

- Full-season fixtures, with an upcoming-match view and team/gameweek filters.
- Asia/Singapore display time by default; UTC timestamps in stored data.
- Scores concealed until revealed, with preferences stored on the device.
- Direct links to verified official highlights.
- Retryable discovery of delayed uploads and visible data freshness.
- Clear distinctions between no matches, no highlights yet and failed updates.

The exact presentation of YouTube-derived links and metadata must be checked
against its policies before implementing spoiler-free video cards.

## Local preview

Open `public/index.html` in a browser. The starter has no build step,
dependencies or network data requests. Do not mistake it for the completed app.

## Deployment

Pushes to `main` deploy the `public/` directory using GitHub Actions. The
workflow can also be run manually or through GitHub's workflow dispatch API.
GitHub Pages must use **GitHub Actions** as its publishing source. No backend
credentials are used by this workflow yet. Keep the recurring cron-job.org job
disabled until the collector is implemented; a test run only deploys the starter.

For forks, update this README and the starter's repository link, then enable
Pages in the fork's settings. The stylesheet uses a relative path so project
sites work under a repository subpath.

## Source and data licences

The application source is MIT-licensed. That licence does not cover football
datasets, club or competition branding, YouTube videos, or other third-party
content. The starter contains no real match data, club badges or videos.

The planned fixture provider is football-data.org. Its required attribution
will be displayed wherever its data is published: **Football data provided by
the Football-Data.org API**. Provider terms, quota limits and data-retention
requirements also apply to fork operators.
