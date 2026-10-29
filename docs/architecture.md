# Architecture and implementation plan

Selected: 2026-10-26.

## Agreed scope

Build a free, open-source, public Premier League schedule and highlights site.
Use **cron-job.org + GitHub Actions + GitHub Pages**. The source repository stays public.
The hosting budget is $0. AWS, MongoDB and StreetBot's Fly deployment are out of
scope. As requested on 29 October 2026, scores and the first available highlight
are shown by default; scores can still be hidden and extra highlights expanded.

The collector, snapshot handling and fixture UI are implemented. Live operation
requires provider credentials, initial bootstrap and the external cron job.
See [Operations](operations.md) for deployment and recovery.

## How it works

1. cron-job.org sends an authenticated POST to GitHub's workflow dispatch API
   every 30 minutes, at minutes 7 and 37. The workflow runs a portable CommonJS
   Node.js collector on a standard GitHub-hosted runner. Manual dispatch remains
   available; there is no GitHub schedule trigger.
2. It loads the last published snapshot and fetches fixture/highlight updates
   from the configured providers. API credentials come from Actions secrets.
3. It merges by stable fixture/video IDs, carries unfinished checks forward and
   validates a new snapshot. An upstream failure must not erase valid data.
4. It publishes the static frontend and sanitized JSON together to Pages.
5. Visitors read static files. Filters, favourite teams and score reveal run
   in the browser without triggering collection or backend requests.

No database, public API server, AWS account or custom domain is required.

## State and recovery

The deployed Pages snapshot holds state between runs: public fixture data,
highlight links, freshness timestamps and minimal retry state. Private
diagnostics and credentials never enter published files.

Do not rely on runner disk, an evictable Actions cache or a short-lived artifact
as the sole state store. Do not commit changing provider metadata to Git
history. Expiring deployment artifacts must not remove the deployed snapshot.

Use one publishing workflow/concurrency group. Code pushes and manual runs must
preserve snapshots just as scheduled runs do. After initial setup, if the prior
snapshot cannot be fetched or validated, stop publication and keep the current
site. Bootstrap and recovery must be explicit: an unexpected 404 must not
silently reset the season.

This is simpler than a database and does not provide independently backed-up
durability. Keep the state format exportable for recovery.

## Keeping hosting at $0

- Keep the repository public and use a standard runner such as `ubuntu-latest`.
  Larger runners are paid even for public repositories.
- Keep generated files small and Pages artifact retention short, initially one
  day. Avoid redundant caches and large artifacts; check shared account storage.
  Public visibility does not make every GitHub feature or unlimited storage free.
- Stay within included storage and Pages limits. Do not enable paid runner,
  cache or artifact-storage upgrades.
- Keep provider calls within free plans. Hosting being free does not exempt
  the application from provider quotas or terms.
- No paid API subscription, cloud service or domain purchase is required.

## Scheduling limitations

GitHub documents its 60-day inactivity restriction for scheduled workflows.
Use workflow_dispatch with an external scheduler instead of a schedule trigger;
do not add keepalive commits or automatic workflow re-enablement.

cron-job.org holds a fine-grained GitHub token restricted to this repository
with Actions write permission. Renew it before expiry. Provider credentials
remain in Actions secrets. The scheduler's HTTP success only proves dispatch
was accepted, not that collection or deployment succeeded. Monitor Actions
failures and the site's data freshness as well as trigger failures.

Neither the external scheduler nor Actions guarantees exact execution times.
See [cron-job.org setup](cron-job-setup.md) for the request settings. Enable the
recurring job after the initial successful live publication.

Persist pending matches and retry across runs for at least seven days, tapering
frequency. A missed run must not permanently miss a delayed highlight. Show
separate last-success timestamps for fixtures and highlights, plus stale-data
warnings. Workflow success does not prove every provider succeeded. Do not
advertise exact refresh timing or real-time scores.

## Product and data requirements

- Full-season fixtures, upcoming/results/highlights views and team/gameweek
  filters. UTC kickoff timestamps; Asia/Singapore display time by default.
- Scores shown by default, with per-match/global hiding. The first available
  highlight appears directly with its original title, thumbnail and YouTube link.
  Extra highlights are expandable; score hiding does not conceal video metadata.
- Verified official highlight links matched using stable channels, aliases
  and timing evidence. Ambiguous candidates remain unresolved.
- Distinguish no fixtures, highlights not found yet and upstream failures.
- Use team names and original graphics unless asset rights are established.
  Include the fixture provider's attribution.
- Preserve the original YouTube link/metadata presentation.
  Do not download videos or modify embedded players.
  Follow metadata refresh/deletion rules; prolonged workflow inactivity is an
  operational issue, not an exemption.
- Fork operators supply their own credentials. MIT covers source code, not
  third-party content.

## Implementation sequence

1. Implemented: strict schema v1 with a 2 MiB snapshot limit, explicit bootstrap
   and retention checks.
2. Implemented: portable collector and offline tests for delayed uploads,
   outages, rate limits, ambiguous matches, duplicate runs and rescheduling.
3. Implemented: one test/collect/publish workflow with snapshot preservation
   and degraded-source reporting after deployment.
4. Implemented: fixture UI, local-time grouping, score reveal, favorite teams,
   video-preview disclosures and freshness states.
5. Validate over a complete matchweek, then disable StreetBot's `youtubePLFeed`
   through supported configuration. Its job stays live until cutover. Any
   historical import is a separate one-time export, not ongoing MongoDB access.

## Sources

- [GitHub Actions billing](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [Free standard runners for public repositories](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job)
- [GitHub Pages limits](https://docs.github.com/en/pages/getting-started-with-github-pages/github-pages-limits)
- [Scheduled workflow limitations](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [Workflow dispatch API](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event)
- [cron-job.org features](https://cron-job.org/en/)
- [cron-job.org FAQ](https://cron-job.org/en/faq/)
- [Pages deployment workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [Football-data.org terms](https://www.football-data.org/about)
- [YouTube developer policies](https://developers.google.com/youtube/terms/developer-policies)
- [YouTube presentation guidance](https://developers.google.com/youtube/terms/developer-policies-guide)
