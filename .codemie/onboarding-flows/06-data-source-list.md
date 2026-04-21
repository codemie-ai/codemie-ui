# Data Sources List & Indexing

**Name**: Data Sources List & Indexing
**Description**: Learn to read indexing statuses, trigger re-indexes, and manage your data sources from the list page
**Target Audience**: Users who have created at least one data source
**Estimated Duration**: 2-3 minutes
**Triggers**:
  - Help Panel Pages: datasources
  - Show on Welcome: false
  - Release Versions: none

---

## Step 1: Welcome

**Title**: Welcome to Data Sources List
**Action Type**: Modal

**Message**:
```
Welcome to the Data Sources List tour!

Once you've created a data source, this page is where you monitor and manage it.

In this guide, you'll learn how to:
- Read the table columns and understand what each one shows
- Track indexing progress through each status stage
- Trigger manual re-indexes and manage sources from the row actions menu
- Filter the list to quickly find the sources you need

Let's take a look!
```

---

## Tech Step: Navigate to Data Sources List

**Action Type**: Navigation
**Navigate To**: Data Sources list page

---

## Step 2: Data Sources Table

**Title**: Your Data Sources at a Glance
**Action Type**: Highlight
**Target**: Main data sources table in the center of the Data Sources page

**Message**:
```
The table shows all connected sources across your projects. Key columns:

- **Name** — click to open the full details page for that source
- **Type** — the data source type icon and label (Git, Confluence, Jira, etc.)
- **Project** — which project owns this source
- **Created By** — who created it
- **Created / Updated** — creation and last-modified timestamps
- **Shared** — whether the source is shared with all project members
- **Status** — current indexing state (covered next)
- **Actions** — ⋮ menu for indexing operations and management

The table auto-refreshes every few seconds so you can watch indexing progress without manually reloading.
```

---

## Step 3: Indexing Status

**Title**: Track Indexing Progress
**Action Type**: Highlight
**Target**: Status column in the data sources table, including status badges and the progress bar shown for in-progress sources

**Message**:
```
Indexing starts automatically when you save a new data source. The Status column tracks every stage:

- **Queued** — job accepted, waiting for an available worker
- **Fetching** — downloading content (cloning repo, crawling pages, or parsing an uploaded file)
- **Processing** — splitting, embedding, and writing to the vector index; a progress bar shows % complete
- **Completed** — indexing finished; source is ready to attach to an assistant
- **Error** — indexing failed; open the details page for the full error message
- **Paused** — a scheduled run was explicitly paused; use Resume Indexing to restart
- **Pending** — a re-index was requested and is waiting to start

Expected durations: File 1–30 min · Git 2–60 min · Confluence 2–45 min · Jira 2–40 min

Tip: If a source stays on Fetching, check that your integration credentials haven't expired — an expired token is the most common cause.
```

---

## Step 4: Row Actions

**Title**: Manage and Re-index Data Sources
**Action Type**: Highlight
**Target**: The ⋮ actions menu on any data source row in the table

**Message**:
```
Click ⋮ on any row to manage that data source:

- **View Details** — inspect configuration, indexed document count, and full indexing history
- **Edit** — update description, query filters, or reindex schedule; saving most changes triggers a re-index prompt
- **Incremental Index** (Jira only) — fetch only issues changed since the last run; much faster than a full reindex
- **Full Reindex** — re-fetch and re-embed all content from scratch; use after major content changes
- **Resume Indexing** — restart a job that was paused or interrupted mid-run
- **Force Reindex** — override any stuck locks and force a fresh run immediately
- **Copy ID** — copy the data source's unique ID to the clipboard
- **Export** — download a JSON export of the configuration
- **Delete** — permanently remove the source and its vector index (irreversible)
```

---

## Step 5: Sidebar Filters

**Title**: Filter Your Data Sources
**Action Type**: Highlight
**Target**: DataSourceFilters panel in the left sidebar of the Data Sources page

**Message**:
```
Narrow the table when you have many sources across projects:

- **Name** — search by partial or full name
- **Type** — show only one type (Git, Confluence, Jira, etc.)
- **Project** — show only sources from a specific project
- **Created By** — filter by creator
- **Status** — show only sources in a specific state

Tip: Filter by Status = Error to instantly surface all broken sources across your projects and fix them before they affect assistant responses.
```

---

## Step 6: Completion

**Title**: You're All Set!
**Action Type**: Modal

**Completion Message**:
```
Congratulations! You've completed the Data Sources List tour.

You now know how to:
✓ Read the table columns — name, type, project, shared flag, and status
✓ Follow the full indexing pipeline: Queued → Fetching → Processing → Completed
✓ Identify and troubleshoot Error and Paused states
✓ Trigger Full Reindex, Incremental Index (Jira), and Resume Indexing from the row menu
✓ Filter the list by name, type, project, creator, or status
```

**Next Steps Suggestions**:

The modal should display a "Continue Learning" or "What's Next?" section with the following suggested flows:

```
Continue your learning journey with these guided tours:

1. 🤖 Attach Data Sources to Assistants
   Open the Create Assistant form and connect an indexed data source to ground responses in your project knowledge.
   Duration: 4-5 minutes

2. 📱 Query Data Sources in Chats
   Learn how assistants use data source context to answer questions about your code, docs, and tickets.
   Duration: 4-5 minutes

3. ⚡ Use Data Sources in Workflows
   Chain data source lookups into automated multi-step workflows for knowledge-driven automation.
   Duration: 4-5 minutes

4. 📚 Add Your First Data Source
   Walk through the creation form and every supported data source type step by step.
   Duration: 6-8 minutes

You can skip these tours and start exploring on your own, or restart any tour from Help > Onboarding Tours.
```

**Implementation Note**: These suggestions should be clickable and start the respective onboarding flow when selected. Allow users to:
- Click a suggestion to start that flow immediately
- Dismiss the modal to explore on their own
- Access "Skip for now" option

---

**Last Updated**: 2026-04-15
**Version**: 1.0
