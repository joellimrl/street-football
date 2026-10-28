# Operations

## Provider secrets

Add repository secrets at Settings > Secrets and variables > Actions:

- `FOOTBALL_DATA_API_TOKEN`: a football-data.org free-tier token for this application.
  Register at https://www.football-data.org/client/register. The provider's key
  covers one application; do not assume an existing bot key covers this site.
- `YOUTUBE_API_KEY`: a Google project API key with YouTube Data API v3 enabled.
  In Google Cloud Console, create/select the project, enable the API, then use
  APIs & Services > Credentials > Create credentials > API key. Restrict its API
  access to YouTube Data API v3. This is a server-side key, so browser/referrer
  restrictions do not fit. Standard GitHub runners do not have a fixed outbound
  IP. Keep the key in Actions secrets and out of URLs, logs and source code.

Public data uses an API key; no YouTube OAuth consent or viewer sign-in is used.
No paid plan, AWS account or database is needed. Google quota exhaustion causes
degraded updates; do not add paid services or request a quota expansion by default.

## First deployment

1. Enable GitHub Pages with GitHub Actions as the source.
2. Add both secrets above.
3. Run **Deploy GitHub Pages** on main with **bootstrap** checked. This permits
   a new snapshot only when the previous URL returns 404. A corrupt snapshot or
   other HTTP error always stops publication, even with bootstrap checked.
4. Verify the workflow, fixture count, source freshness and a sample of actual
   fixture/highlight matches. No fake data is deployed when credentials are absent.
5. Enable the saved cron-job.org job. The regular request body stays
   `{"ref":"main"}`; do not add bootstrap to recurring requests.

The first automatic push run can fail on the missing snapshot before the
explicit bootstrap. This is expected and preserves the prior deployment.

## Collection and source failures

- Fixtures: one current-season competition request per run, with bounded retries
  for network failures, 429 and server errors. Empty/malformed results are errors.
- Highlights: known club channel uploads via channels, playlistItems and videos
  endpoints. No YouTube search requests or scraping. Upload discovery runs for
  eight days after kickoff, accepting uploads within seven days. Checks taper
  to six-hourly after the first two days. Up to three upload pages per club are
  checked; hitting this cap marks that club incomplete rather than claiming success.
- A maximum of 160 actual YouTube requests including retries is allowed per run.
  Stored video metadata is refreshed daily in batches. Missing/deleted/private
  videos are removed; unrefreshed metadata expires after 29 days.
- Unknown club channel configurations, partial channel failures and missing
  credentials are visible as degraded sources. Fix the mapping in
  `collector/channels.json` after verifying the club's official channel.
- Keep matches pending across runs. No Telegram delivery state or MongoDB state
  affects this collector. No historical pre-launch highlight backfill is promised.

Enable cron-job.org dispatch failure notifications and GitHub Actions failure
notifications. HTTP 200 from cron-job.org only confirms GitHub accepted the run.
If collection is partially degraded, the last valid data is published with
freshness indicators and the workflow then fails deliberately to notify you.

## State and recovery

`https://joellimrl.github.io/street-football/data/snapshot.json` is the state
store. It contains only public fields and is validated before reuse. All
publishers share the `pages` concurrency group. Do not deploy `public/` directly
or use a second workflow that can overwrite `data/`.

If the snapshot is temporarily unavailable, restore availability and rerun.
If corrupt, retain a copy for diagnosis and restore a previously validated
snapshot through the same publication path. Do not silently reset with empty
data. Deliberate reset requires operator action and loses pending/link state.
Deployment artifacts have one-day retention and are not a durable backup.

**Retention when unattended work stops:** browser-side expiry conceals old links
but does not delete the raw hosted JSON. Restore the collector before stored
YouTube metadata reaches 30 days, or remove the metadata from the published
snapshot/site. Do not leave an abandoned deployment serving old API metadata.
The free scheduler does not provide an uptime guarantee. Expired credentials,
disabled Actions, provider cancellation and repository archival require action.

## Spoiler protection and data rights

Scores are concealed in the interface, not encrypted: the public JSON includes
them. Opening a video-preview disclosure shows the original title/thumbnail;
watching opens YouTube directly. The original video metadata is never blurred
or rewritten. Fixture matching is identified as Street Football's own feature.
See the site's privacy/terms page. Hosting publicly and using an MIT code
licence do not grant rights to the providers' data or club branding.

## Validation and cutover

Offline: `node --test tests/*.test.js`; syntax: `node --check` on edited JS.
UI: `node scripts/preview.js --demo`, then inspect desktop/mobile, filtering,
time zones, favorite persistence, score concealment and video disclosures.
The demo flag creates synthetic data only in the local preview server.

Keep StreetBot's existing `youtubePLFeed` enabled through a complete matchweek
comparison. Disable it through its existing supported configuration only after
the new site is reliably collecting; this repository never edits its database.

## References

- https://developers.google.com/youtube/data/getting-started
- https://developers.google.com/youtube/terms/developer-policies
- https://developers.google.com/youtube/terms/developer-policies-guide
- https://www.football-data.org/about
