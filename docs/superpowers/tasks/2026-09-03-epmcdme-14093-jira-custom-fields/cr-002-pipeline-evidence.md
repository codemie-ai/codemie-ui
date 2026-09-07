# Pipeline evidence for CR-002

Source: GitLab API, project epm-cdme/codemie-ui, merge request !1696,
note id 2370030 posted by `auto_epmd-edp_vcs` at 2026-09-02T16:43:01.179Z.

Retrieved with:

```
GITLAB_HOST=gitbud.epam.com glab api "projects/epm-cdme%2Fcodemie-ui/merge_requests/1696/notes?per_page=100&sort=asc"
```

The pipeline below ran on SCM revision `4120547b655e17d0db317124db3d605195ef9e66`, whose
commit subject is `Merge branch 'main' into EPMCDME-14093_jira-custom-fields` — a subject that
matches no alternative of the git-workflow.md regex. `mr-title-validate` passed on it; the only
failing task was `sonar`, on new code smells.

Verbatim task table from that note:

<!-- krci-pipeline-report codebase=codemie-ui -->
## Pipeline [`review-codemie-ui-main-zxtdm`](https://portal.core.kuberocketci.io/c/core/cicd/pipelineruns/edp-delivery/review-codemie-ui-main-zxtdm) — ✗ Failed

| Status | Task | Duration |
|---|---|---|
| ✓ Passed | report-pipeline-start-to-gitlab | 26s |
| ✓ Passed | get-gitlab-project-id | 8s |
| ✓ Passed | mr-title-validate | 24s |
| ✓ Passed | fetch-repository | 1m5s |
| ✓ Passed | gitleaks-scan | 10s |
| ✓ Passed | build | 12m54s |
| ✓ Passed | helm-docs | 37s |
| ✓ Passed | dockerfile-lint | 32s |
| ✓ Passed | dockerfile-lint-kc-theme | 31s |
| ✓ Passed | helm-lint | 30s |
| ✓ Passed | dockerbuild-verify-kc-theme | 8m34s |
| **✗ Failed** | **sonar** | 46s |
| ✓ Passed | dockerbuild-verify | 13s |
| ✓ Passed | gitlab-report-pipeline-status | 6s |

> Pushing new commits re-runs this pipeline automatically.
> To re-run it without new commits, comment `/recheck`.
