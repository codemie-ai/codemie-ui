# Project Context

## Project Identity

| Field | Value | Source |
|---|---|---|
| Project name | CodeMie UI | README.md::CodeMie |
| Repository/package | codemie-ui | sonar-project.properties::sonar.projectKey |
| Project code/key | EPMCDME | CONTRIBUTING.md::EPMCDME |

## Work Item Tracker

| Field | Value |
|---|---|
| Provider | Jira |
| Key/prefix | EPMCDME |

## Ticket Adapter

**Status**: configured
**Adapter**: Invoke the `codemie-jira-assistant` skill via the Skill tool.
**Lookup**: Invoke the `codemie-jira-assistant` skill with the ticket key and a request for summary, description, acceptance criteria, and links.
**Create**: Invoke the `codemie-jira-assistant` skill with the complete ticket payload or approved story file as the argument.
**Output**: Ticket key and URL returned by the skill.
**Comment**: Invoke the `codemie-jira-assistant` skill with a request to add a comment to the ticket, passing the comment body as the argument.

## Source Control And Review

| Field | Value |
|---|---|
| Provider | GitLab |
| Repository remote | git@gitbud.epam.com:epm-cdme/codemie-ui.git |
| Default target branch | main |
| Review artifact type | MR |

## MR Adapter

**Status**: configured
**Adapter**: glab CLI
**Instructions**: Existing project.md: open the MR against main through glab authenticated to the GitLab host in git remote -v; description from .gitlab/merge_request_templates/Default.md with the test-harness log and a /sanity request for dependency, Dockerfile or security changes. .claude/settings.json allows Bash(glab *); README.md documents glab setup.
**Body Template**: .gitlab/merge_request_templates/Default.md

## Complexity Scoring

**Status**: configured
**Field**: Labels
**Format**: t-shirt

## Lifecycle Intent Handling

### record_complexity_score
Via the `codemie-jira-assistant` skill, add a complexity label to the ticket with the size from `data.complexity_size` (XS–XXL, as-is):
`initial` → `sdlc-factory-est-<SIZE>`, `actual` → `sdlc-factory-act-<SIZE>`. Add only — never remove or change existing labels, so an `sdlc-standard` ticket ends with both labels.
Ticket ID: from the branch name (`EPMCDME-\d+`) or the run work item.

### get_field
For `Labels`: always return `field_value: null` — complexity labels are additive, there is nothing to overwrite.
