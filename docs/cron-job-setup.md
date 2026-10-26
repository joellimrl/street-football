# Set up cron-job.org

This connects cron-job.org to the existing Pages workflow. The workflow
currently deploys the starter page only. Save the cron job disabled and use a
single test run; enable recurring execution after the collector and snapshot
preservation are implemented.

## 1. Create a restricted GitHub token

Open https://github.com/settings/personal-access-tokens/new and create a
fine-grained personal access token:

| Setting | Value |
| --- | --- |
| Token name | Street Football cron-job.org |
| Resource owner | joellimrl |
| Repository access | Only select repositories: street-football |
| Repository permission | Actions: Read and write |
| Expiration | Choose an expiry and renew the cron-job.org header before it expires |

GitHub includes Metadata read access automatically. No Contents write,
Administration or account permissions are needed. Enter the token directly
in cron-job.org's Authorization header; do not put it in the repository,
request URL, screenshots or chat. No cron-job.org API key or AWS account is
needed for this UI setup.

## 2. Create the cron job

| Setting | Value |
| --- | --- |
| Title | Street Football refresh |
| Enabled | Off until the collector is ready |
| URL | https://api.github.com/repos/joellimrl/street-football/actions/workflows/pages.yml/dispatches |
| Request method | POST |
| Time zone | Asia/Singapore |
| Schedule | Every hour at minutes 7 and 37, every day |

If using cron-expression entry, the schedule is `7,37 * * * *`.
In the advanced request settings, add these headers separately:

| Header | Value |
| --- | --- |
| Authorization | Bearer YOUR_GITHUB_TOKEN |
| Accept | application/vnd.github+json |
| Content-Type | application/json |
| X-GitHub-Api-Version | 2026-03-10 |

Replace YOUR_GITHUB_TOKEN with the actual token, keeping `Bearer ` and its
following space. Leave HTTP Basic authentication unset.

Request body:

```json
{"ref":"main"}
```

Enable failure notifications to your own address in cron-job.org. A failed
dispatch should be visible; HTTP success does not prove the later workflow
succeeded. Enable GitHub Actions failure notifications too.

## 3. Test the connection

Use cron-job.org's Test run control once. A successful GitHub API response is
2xx (the selected API version documents 200 with the workflow run details).
Then check the new workflow_dispatch run at:

https://github.com/joellimrl/street-football/actions/workflows/pages.yml

Wait for that run to complete successfully and check the deployed site:

https://joellimrl.github.io/street-football/

This proves dispatch and deployment only. The site still has no live match
data. The recurring job stays disabled until collection is implemented.

Common errors:

- 401: check the token and the `Bearer ` prefix; the token may have expired.
- 403: check Actions write permission, account policies and rate limits.
- 404: check the repository selection on the token, owner, repo and workflow filename.
- 422: check the JSON body, `main` branch and workflow dispatch configuration.
- Successful dispatch but failed Actions run: inspect that run's failed job;
  cron-job.org cannot detect failures that happen after GitHub accepts the request.

## Later activation

Keep this endpoint stable when collection is added to the publishing workflow.
All publication paths must preserve the last valid snapshot. Add the football
provider keys to GitHub Actions secrets, validate collection, then enable the
cron job. Do not create a second publisher or a GitHub schedule trigger.

For forks, substitute your own owner and repository in the URL and token scope.

## References

- [GitHub fine-grained tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens)
- [GitHub workflow dispatch API](https://docs.github.com/en/rest/actions/workflows#create-a-workflow-dispatch-event)
- [cron-job.org features](https://cron-job.org/en/)
- [cron-job.org FAQ](https://cron-job.org/en/faq/)
