# Hosting and backend plan

Reviewed: 2026-10-26.

## Decisions

The frontend will be a free, public GitHub Pages site. The source is open
source. Scores are hidden by default. The application must be independent of
StreetBot and should put no extra collection or visitor load on its Fly app.

**Budget update: $0 ongoing hosting cost is required.** Introductory credits or
an estimate of "a small bill" do not satisfy that requirement. DynamoDB is an
acceptable storage candidate. No backend or AWS resources have been deployed.

The previous S3/CloudFront recommendation is superseded. The backend choice
remains open between a GitHub-based setup and an AWS design operating within
ongoing free allowances.

## Revised cost assessment

- S3's current introductory credits/free-plan offer is time-limited; do not
  use it as the foundation of an indefinitely free storage design.
- DynamoDB Standard has an ongoing allowance of 25 GB, 25 provisioned read
  capacity units and 25 provisioned write capacity units. AWS describes the
  allowance on a per-Region, per-payer-account basis; it is shared, not a new
  allocation for each table. On-demand requests are billed and do not receive
  that provisioned-capacity allowance.
- For a small collector, start with fixed provisioned capacity such as 1 RCU
  and 1 WCU, pace reads/writes and disable autoscaling. Keep table data small;
  omit paid backups/PITR, DAX and additional replicas. Check available shared
  allowance before provisioning. These controls reduce cost exposure but do
  not constitute an account-wide hard spending cap.
- DynamoDB cannot simply replace S3's public JSON URL. A publisher must export
  public data to Pages, or a public API must serve it. Prefer Pages exports so
  visitors do not invoke billable AWS compute or perform database reads.
- AWS Budgets can warn after charges occur; they are not a guarantee that the
  bill cannot exceed zero. Account-wide Lambda, logging, transfer and other
  service allowances must be considered if using AWS.

## Revised approaches for selection

| Approach | Persistence and publishing | Cost boundary | Scheduling tradeoff |
| --- | --- | --- | --- |
| GitHub Actions + Pages, no AWS | Collect, validate and publish JSON with the site; carry forward the last published snapshot | Standard public-repository runners are free; keep artifacts within included storage, with short retention and no paid runners or storage expansion | Runs may be late/dropped or disabled after inactivity |
| GitHub Actions + provisioned DynamoDB + Pages | Collector runs in Actions; DynamoDB keeps durable pending-match state; the same run publishes a snapshot | Adds conditional AWS free-tier dependence, but no Lambda or visitor-driven AWS requests | Same Actions scheduling limits; durable state supports catch-up |
| EventBridge + Lambda + provisioned DynamoDB, with a Pages publisher | Lambda maintains data independently; a separate publisher exports it into the Pages deployment | Expected $0 only while all relevant ongoing allowances and feature constraints hold | Collector has independent scheduling; publication still needs its own trigger/recovery design |

For a strict no-AWS-billing-exposure interpretation of $0, prefer the first
approach. If using AWS within its free allowances is acceptable, DynamoDB is a
better storage fit than S3. The original desire for consistent updates remains
relevant: do not silently present Actions scheduling as equivalent to a managed
scheduler.

For the GitHub-only approach, carry forward public retry/link state from the
last successfully deployed snapshot. Never rely solely on an evictable cache
or runner disk. All publishing paths, including source-code pushes, must
preserve valid data. If the prior snapshot cannot be retrieved, stop publication
and retain the current site; use an explicit recovery/bootstrap path. This
does not provide the same independently backed-up durability as a database.

Do not commit changing provider metadata to Git history. Use short-lived Pages
artifacts and refresh/delete live metadata according to provider requirements.
With Actions scheduling, retry unfinished matches across runs and display the
last successful update time. Delays and manual re-enablement after inactivity
remain limitations, even with correct retry handling.

All candidates keep browser reads separate from collection. Backend services
remain unprovisioned while the zero-cost tradeoff is being resolved.

## Requirements shared by the candidate designs

- No StreetBot, Fly or ongoing MongoDB dependency. The small season dataset
  needs persistent state, not access to personal information.
- Keep provider credentials private in the collector configuration. If Actions
  accesses AWS, use a repository-scoped OIDC role, not long-lived AWS keys.
- Publish only public, validated fixture data and verified highlight links.
  Browser filters and favourite-team/score-reveal preferences stay local.
- Preserve valid data when an upstream fails. An outage is not an empty season.
  Store actual last-success timestamps separately for fixtures and highlights.
- Use one writer, stable match/video IDs and retry-safe writes. Persist pending
  matches so a late upload can still be found for at least seven days.
- Retry transient errors with backoff, honour rate limits and surface invalid
  credentials as configuration failures. Reject ambiguous video associations.
- Default to Asia/Singapore display time and store kickoff timestamps in UTC.
- The snapshot's scores are public data. Spoiler protection is a display
  preference, not an access-control mechanism.
- The MVP has no per-visitor backend work, paid API subscriptions or custom
  domain purchase. Source-code hosting and site delivery remain on GitHub.

## Implementation order after backend selection

1. Define the snapshot contract and implement a portable CommonJS collector
   with fixture/provider and storage adapters, independent of its runner.
2. Test delayed uploads, provider failures, duplicate runs, rescheduled matches,
   stale snapshots, publication failures and local-date boundaries offline.
3. Configure the selected persistence and publisher. Verify the actual free
   allowances and account settings before provisioning any AWS resources.
4. Build upcoming/results/highlights views, filters, score reveal and freshness
   indicators against published JSON.
5. Validate over a complete matchweek, then disable StreetBot's `youtubePLFeed`
   job through supported configuration. Until cutover, the existing job stays
   live. An optional historical import is a separate one-time export; the new
   collector never needs permanent MongoDB access.

## Public-site constraints

Use team names and original graphics unless asset rights are established.
Include football-data.org attribution. Keep videos on official YouTube
channels and link out; do not download or rehost them. Review the exact
metadata-free link presentation against YouTube's requirements before building
spoiler-free video cards. API metadata must follow refresh/deletion rules;
public Git commits are not an appropriate permanent metadata archive.

Publishing the application under MIT does not relicense third-party content.
Fork operators supply their own provider credentials and observe provider terms.

## Sources

- [DynamoDB ongoing free allowance](https://aws.amazon.com/dynamodb/pricing/)
- [DynamoDB always-free documentation](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Introduction.html)
- [S3 free-plan limits](https://aws.amazon.com/s3/pricing/)
- [Free standard Actions runners for public repositories](https://docs.github.com/en/actions/how-tos/write-workflows/choose-where-workflows-run/choose-the-runner-for-a-job)
- [Actions billing and included storage](https://docs.github.com/en/billing/concepts/product-billing/github-actions)
- [AWS Budgets notification delays](https://docs.aws.amazon.com/cost-management/latest/userguide/budgets-managing-costs.html)
- [GitHub Pages deployment workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)
- [GitHub Actions schedule limitations](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule)
- [EventBridge scheduling for Lambda](https://docs.aws.amazon.com/lambda/latest/dg/with-eventbridge-scheduler.html)
- [Lambda pricing](https://aws.amazon.com/lambda/pricing/)
- [EventBridge pricing](https://aws.amazon.com/eventbridge/pricing/)
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Football-data.org terms](https://www.football-data.org/about)
- [YouTube developer policies](https://developers.google.com/youtube/terms/developer-policies)
- [YouTube presentation guidance](https://developers.google.com/youtube/terms/developer-policies-guide)
