# Project Settings

**Work Item Key Prefix**: EPMCDME
**Project Name**: codemie-ui-next
**MR Target Branch**: main

## Ticket Adapter

**Status**: configured
**Adapter**: Jira via `codemie-jira-assistant` skill (invoke via the `codemie-jira-assistant` skill) or the `mcp__jira` MCP server. The skill handles story/task/bug lookup and creation in the EPM-CDME Jira project. The `jira` MCP server is enabled in `.claude/settings.local.json` and provides direct Jira tool access.

## Lifecycle Intent Handling

### record_complexity_score
Invoke the `codemie-jira-assistant` skill and ask it to update the ticket's complexity score (Total Score) with the value from `data.complexity_total`.
Ticket ID: extract from the current branch name (pattern `EPMCDME-\d+`) or from the run work item.

### artifact_published
Invoke the `codemie-jira-assistant` skill and attach the artifact file using the `--file` flag:

```bash
codemie assistants chat "289d2751-afd9-4c77-a272-90df7cd71702" \
  "Attach this file to Jira ticket EPMCDME-<ID> as the approved <kind> artifact." \
  --file "<path-to-artifact>"
```

Ticket ID: extract from the current branch name (pattern `EPMCDME-\d+`) or from the run work item.
`<path-to-artifact>`: use `data.artifact_path`, or the path to `spec.md` / `plan.md` in the run directory.
