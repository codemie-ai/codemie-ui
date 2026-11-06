# Git Workflow

**Project**: CodeMie UI · **Stack**: TypeScript React · **Scope**: branch names, commit subjects, merge policy and their recovery steps; exact gate commands live in `.ai-run/guides/quality-gates.md`, the MR adapter in `.ai-run/guides/project.md`

## Branch Naming Convention

- base branch: main

### Rules
- Branch: `EPMCDME-<n>-short-description` from `main`; `<type>/short-description` is allowed when there is no ticket.

## Commit Message Format

```
EPMCDME-<n>: <Capitalized sentence>
```

### Rules
- Commit subject: `EPMCDME-<non-zero>: <Capitalised sentence>`, or `Generate release notes for version X.Y.Z`, or `Revert "EPMCDME-<n>: ..."`. Recent history follows it; the CI check documented for it lives in the external `epm-cdme/codemie-gitlab-templates` include, and no commit-msg hook exists in `.husky/`.

## Merge Strategy

### Rules
- Squash merge into `main` is the documented convention; history on `main` holds no merge commits. Evidence: recorded user decision
- Review host: GitLab merge request against `main` on remote `origin` (gitbud `epm-cdme/codemie-ui`), opened with `glab`.
- The MR description follows `.gitlab/merge_request_templates/Default.md`: it carries the full `npm run test-harness` log (suite `sanity-ui`) and asks a reviewer to post `/sanity`.

## Anti-Patterns

- Never commit with `--no-verify`. The pre-commit hook runs, stopping at the first failure: lint-staged (prettier, eslint --fix and a whole-project `tsc --noEmit` on staged JS/TS; license-header fix on staged src files), `license-headers:check`, `secrets:check`, `sonar-local` (runs `test:coverage`; exits 0 without `SONAR_TOKEN` or when the server is unreachable).

| Do not | Do instead | Why |
|---|---|---|
| Cut a branch from another feature branch | `git switch -c EPMCDME-<n>-short-description main` | rebases and MR diffs stay against the integration branch |
| Mix unrelated changes in one commit | one commit per logical change, each with the ticket key | revert and review stay scoped |
| Force-push a shared branch with `--force` | `git push --force-with-lease` after a rebase, and only on your own branch | a teammate's commits survive |

## Troubleshooting

| Issue | Fix |
|---|---|
| Branch was cut from the wrong base | `git rebase --onto main <old-base> <branch>`, then `git push --force-with-lease` |
| Subject lacks the ticket key | last commit: `git commit --amend`; older commits: `git rebase -i main` with `reword`; then `git push --force-with-lease` |
| Rebase conflicts on `main` | resolve file by file, `git add`, `git rebase --continue`; `git rebase --abort` to restart; never resolve by taking one side wholesale |
