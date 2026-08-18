# Project Context

## Project Identity

| Field | Value | Source |
|---|---|---|
| Project name | CodeMie UI | `README.md` |
| Repository/package | `codemie-ui` (npm name `ai-assistant`) | `package.json`, `git remote -v` |
| Project code/key | EPMCDME | `CONTRIBUTING.md` |

## Work Item Tracker

| Field | Value |
|---|---|
| Provider | Jira |
| Key/prefix | EPMCDME |

> Adapter configuration belongs exclusively in `## Ticket Adapter`. Do not duplicate adapter status or instructions in the Work Item Tracker table.

## Ticket Adapter

**Status**: configured
**Adapter**: Invoke the `codemie-jira-assistant` skill via the Skill tool.
**Lookup**: Invoke the `codemie-jira-assistant` skill with the ticket key and a request for summary, description, acceptance criteria, and links.
**Create**: Invoke the `codemie-jira-assistant` skill with the complete ticket payload or approved story file as the argument.
**Output**: Ticket key and URL returned by the skill.

## Source Control And Review

| Field | Value |
|---|---|
| Provider | GitLab |
| Repository remote | `git remote -v` |
| Default target branch | main |
| Review artifact type | MR |

## MR Adapter

**Status**: configured
**Adapter**: `glab` CLI, authenticated against the GitLab host in `git remote -v`.
**Instructions**: Open the MR against `main`. The description must carry the full `npm run test-harness` log and must ask a reviewer to post `/sanity`; requirements are in `standards/git-workflow.md` and `security/README.md` § MR handoff.

## Complexity Scoring

**Status**: configured
**Field**: Total Score
**Format**: numeric
