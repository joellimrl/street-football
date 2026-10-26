# Street Football

A free, open-source Premier League schedule and highlights companion.
See when matches happen in your time zone, keep scores hidden until you
choose to reveal them, and follow links to official highlights.

**Status:** repository and GitHub Pages starter. Live fixtures, highlight
collection and score-reveal controls are not implemented yet.

- Website: https://joellimrl.github.io/street-football/
- [Backend comparison and implementation plan](docs/architecture.md)
- [Source licence](LICENSE)

## Hosting decisions

- **Selected:** a public GitHub Pages frontend, independent of StreetBot.
- **Required:** $0 ongoing hosting cost, without depending on introductory
  credits. The previous S3/CloudFront recommendation is withdrawn.
- **Acceptable storage candidate:** DynamoDB Standard with provisioned capacity
  within its ongoing free allowance, not on-demand billing.
- **Backend decision still open:** GitHub Actions collection for the simplest
  free setup, or scheduled Lambda with DynamoDB within AWS free allowances.
  See the architecture document for publishing and scheduling tradeoffs.
- **Not needed for the first version:** MongoDB, StreetBot/Fly access,
  user accounts, API Gateway or an always-on backend server.

The collector still needs private provider API credentials. Those belong in
its runtime secret configuration, never in browser JavaScript or Git history.
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
workflow can also be run manually. GitHub Pages must use **GitHub Actions** as
its publishing source. No backend credentials are used by this workflow.

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
