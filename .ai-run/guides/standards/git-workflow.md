# Git Workflow

**Project**: CodeMie UI · **Stack**: TypeScript React · **Scope**: branch names, commit subjects, merge policy and their recovery steps; exact gate commands live in `.ai-run/guides/quality-gates.md`, the MR adapter in `.ai-run/guides/project.md`

## Branch Naming Convention

- base branch: main
- pattern: `EPMCDME-<n>_<short-description>`

### Rules
- R1. Create every branch from `main` and name it with the ticket key, an underscore and a short kebab-case description, such as `EPMCDME-12399_add-hint-text`.

## Commit Message Format

```
EPMCDME-<n>: <Capitalised summary>
```

Examples: `EPMCDME-16522: Mark unknown and understated session cost in CLI Analytics`, `EPMCDME-14856: Fix Datasource Type dropdown black background`, `Generate release notes for version 2.66.0`

### Rules
- R1. Write every commit subject as the ticket key with a non-zero number, a colon, a space and a capitalised sentence (`EPMCDME-123: Fix authentication redirect loop`); release commits use `Generate release notes for version <x.y.z>` and reverts `Revert "<original subject>"`.
- R2. The commit format is a team convention; no hook or CI job in this repository enforces it, so check each subject before pushing.

## Merge Strategy

### Rules
- R1. Squash-merge a branch into `main` so it lands as one commit whose subject follows the commit format. Evidence: recorded user decision

## MR State: Draft First

Open every MR as **Draft**. Ready is a decision: mark it Ready when the work is complete and the
companion MRs of the same ticket (UI, SDK, backend) exist, because that is the moment automatic review starts.
Autoreview and the review pipeline skip Draft MRs. With `glab` add `--draft`. In the GitLab UI the default
template `.gitlab/merge_request_templates/Default.md` ends with the `/draft` quick action, so an MR created from it
is Draft (GitLab runs the action on creation and removes it, so later description edits keep the state). Mark it
Ready with `glab mr update <id> --ready` or the "Mark as ready" button.

## Anti-Patterns

- Never commit directly to `main`; branch from it with the ticket key.
- Never bypass the pre-commit hook with `--no-verify`; fix what it reports and commit again.
- Never use a zero ticket number (`EPMCDME-0`); use the real Jira key of the work item.

## Troubleshooting

- When the pre-commit hook fails on licence headers, run `npm run license-headers:fix`, re-stage and commit again.
- When the pre-commit hook fails on secrets detection with `No container engine found` or a stopped daemon, start Docker, Podman or Apple Containers and commit again; the script exits 1 in both cases, so the commit is blocked, not skipped.
- Resolve a merge conflict by rebasing the feature branch on `origin/main`, then push it again.
