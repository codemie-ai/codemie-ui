# Backend Handoff — User Project Spending

**Date**: 2026-08-13
**Ticket**: EPMCDME-14071
**Requested by**: Frontend
**Companion**: `2026-08-13-epmcdme-14071-user-project-spending-design.md`

---

## TL;DR

We need **two new analytics tabular endpoints** that answer:

1. *How much has user X spent, broken down by each project they belong to?*
2. *How much has each member of project Y spent in that project?*

Both reuse the **existing `v1/analytics/{metric}` tabular envelope** — the same one that already
backs `budget_usage` (personal spending). No new response format is being invented.

The frontend is being built against this contract now. Until these ship, the affected UI is behind
the existing budget-management permission check and simply renders empty/`-`.

---

## Why these two

| Admin page | Exists today | Missing |
|---|---|---|
| Users list | Each user's **global** spend per budget category | The per-project breakdown of that spend |
| Project details → members | Each member's **allocated limit** (`allocated_max_budget`) | The member's **actual spend** in that project |

The second is the sharper gap: the project members table currently shows only limits, never actuals.

---

## Endpoint 1 — `user-project-spending`

```
GET /v1/analytics/user-project-spending?users=<email>
```

Called when an admin expands a user's row in the users table. One user per call.

**Params**

| Param | Type | Required | Notes |
|---|---|---|---|
| `users` | `string[]` (emails) | yes | Existing analytics convention. Exactly one for this use case. |

No `time_period` / `start_date` / `end_date` is sent — see [Time semantics](#time-semantics).

**Response** — one row per project the user is assigned to:

```jsonc
{
  "data": {
    "columns": [
      { "id": "project_name",   "label": "Project",        "type": "string", "format": null },
      { "id": "platform",       "label": "Platform",       "type": "number", "format": "currency" },
      { "id": "cli",            "label": "CLI",            "type": "number", "format": "currency" },
      { "id": "premium_models", "label": "Premium models", "type": "number", "format": "currency" }
    ],
    "rows": [
      {
        "project_name": "project-6",
        "display_name": "Project 6",
        "platform": 120.50,
        "cli": 40.00,
        "premium_models": 12.50,
        "platform_limit": 500.00,
        "cli_limit": 100.00,
        "premium_models_limit": 50.00
      },
      {
        "project_name": "atlas-core",
        "display_name": null,
        "platform": 180.00,
        "cli": 50.00,
        "premium_models": 0,
        "platform_limit": null,
        "cli_limit": null,
        "premium_models_limit": null
      }
    ]
  },
  "metadata": { "timestamp": "2026-08-13T10:00:00Z", "data_as_of": "2026-08-13T09:55:00Z" },
  "pagination": { "page": 0, "per_page": 50, "total_count": 2, "has_more": false }
}
```

---

## Endpoint 2 — `project-member-spending`

```
GET /v1/analytics/project-member-spending?projects=<name>&page=0&per_page=20
```

Called once when the project details page loads its members table.

**Params**

| Param | Type | Required | Notes |
|---|---|---|---|
| `projects` | `string[]` (names) | yes | Projects are keyed by **name**, not id. Exactly one here. |
| `page` | `int` | no | 0-indexed, matching the rest of analytics. |
| `per_page` | `int` | no | |

**Response** — one row per project member, keyed by `user_id` so the frontend can join onto the
existing member rows:

```jsonc
{
  "data": {
    "columns": [
      { "id": "user_id",        "label": "User",           "type": "string", "format": null },
      { "id": "platform",       "label": "Platform",       "type": "number", "format": "currency" },
      { "id": "cli",            "label": "CLI",            "type": "number", "format": "currency" },
      { "id": "premium_models", "label": "Premium models", "type": "number", "format": "currency" }
    ],
    "rows": [
      {
        "user_id": "u-1",
        "platform": 120.50, "cli": 40.00, "premium_models": 12.50,
        "platform_limit": 500.00, "cli_limit": 100.00, "premium_models_limit": 50.00
      }
    ]
  },
  "metadata": { "...": "..." },
  "pagination": { "page": 0, "per_page": 20, "total_count": 1, "has_more": false }
}
```

`user_id` must match the `id` returned by `GET /v1/admin/users` — the join key.

---

## Contract rules

These are the details that will break the UI if they differ. Please read them as requirements, not
suggestions.

1. **No `total` field.** Categories only. Deliberate product decision; the UI does not render a total
   in these tables.

2. **Categories are the existing `BudgetCategory` values**: `platform`, `cli`, `premium_models` —
   the same enum already used by `BudgetAssignment` and the budgets admin UI. Row keys must match
   these strings exactly.

3. **`columns[]` is authoritative.** The frontend renders the sub-table generically from `columns`,
   so **you can add a fourth category later without a frontend release** — as long as it appears in
   both `columns[]` and the row objects. Please keep `format: "currency"` on money columns; it drives
   number formatting.

4. **`*_limit` fields are optional.** `null` or absent means "no limit configured". The UI then shows
   the spend with no threshold coloring. Do not send `0` to mean "no limit" — `0` is a real limit and
   would be rendered as fully consumed.

5. **Zero spend must be returned as `0`, not omitted.** A project the user belongs to with no spend
   still needs a row; it renders `$0.00`. Omitting it makes the project silently disappear from the
   breakdown.

6. **Empty result is `200` with `rows: []`**, not `404`. A user with no projects, or a project with no
   members, is a normal state.

7. **Amounts are JSON numbers**, not preformatted strings. USD, consistent with the rest of the admin
   UI. Send full precision; the frontend rounds to 2 decimals for display.

8. **Authorization** should mirror the existing budgets surface — the data is only requested by
   clients that already pass the budget-management permission check (feature flag + maintainer). Please
   enforce server-side regardless; do not rely on the UI gate.

<a name="time-semantics"></a>
## Time semantics — important

Spend must be scoped to the **current budget cycle**: the amount accumulated since the active budget
period began, i.e. consistent with `current_spending` on the existing `BudgetAssignment` model and
with what the "Budgets" column already shows on the users page.

This is intentionally **not** a free time-range query. The frontend sends no date params, and the two
numbers a user sees on the same screen — the existing global Budgets column and the new per-project
rows — must be over the same window, or they will appear to contradict each other.

If per-category cycles can differ (different `budget_duration` per category), spend for each category
should follow its own cycle, matching how `current_spending` already behaves per assignment.

---

## Edge cases we need defined

Please confirm the intended behavior; the frontend will follow your answer.

1. **Spend in a project the user has since left.** Include the row (historical spend is real), or omit
   it (list reflects current membership)? Frontend default assumption: **omit** — rows follow current
   project assignment.
2. **Personal projects.** The project details page already skips personal projects
   (`isPersonalProject`). Should personal-project spend appear in a user's per-project breakdown?
   Assumption: **yes**, it is real spend.
3. **Spend not attributable to any project — ANSWERED: yes, it exists.**
   Confirmed by the product owner. Consequence: **per-project rows will not sum to the user's
   global spend** shown in the existing "Budgets" column on the same screen. Two numbers that
   disagree on one page reads as a bug unless it is explained.

   Not requesting an "Unassigned" row in this iteration. The frontend will instead label the
   nested table so the discrepancy is expected rather than alarming — see "UI consequence" below.
   If you can cheaply return unattributed spend as a row with `project_name: null`, say so and we
   will render it; otherwise no backend change is needed for this.

4. **Deleted/inactive users** in `project-member-spending` — include or exclude?

---

## Performance notes

- **Endpoint 1** is called per expanded row, lazily. Typical users belong to a handful of projects.
  Expect bursts if an admin expands several rows in sequence. Response should be comfortably under a
  second; the UI shows a spinner in the meantime.
- **Endpoint 2** is called once per project page load, and is on the critical path for that page —
  it is the one worth optimizing.
- Both are read-only aggregations and safe to cache server-side for a short TTL. `metadata.data_as_of`
  is displayed-capable, so a slightly stale value is acceptable if it is reported honestly there.

---

## What the frontend does in the meantime

Built against this contract, with the UI gated behind the existing budget permission check. Before the
endpoints exist, requests fail and the affected surfaces degrade gracefully: the expanded row shows an
inline warning, the project column renders `-`. Nothing else on either page is affected.

Once the endpoints land, no frontend change should be required beyond flipping from mock to live —
provided the response matches the field names above.

---

## Contact / open decisions

| # | Question | Status |
|---|---|---|
| 1 | Include spend from projects the user has left? | Open — frontend assumes **omit** |
| 2 | Include personal-project spend? | Open — frontend assumes **include** |
| 3 | Is project-unattributable spend possible? | **ANSWERED: yes.** Rows will not sum to the user's global total; frontend labels for it (see §3 and "UI consequence") |
| 4 | Include inactive users in member spending? | Open — frontend assumes **include** |
| 5 | Can per-category budget cycles differ? | Open — frontend assumes **yes**, each follows its own |

### Confirmed: per-project limits

Per-project limits exist **only where the user has a project budget assignment**. For projects
without one, `*_limit: null` is correct and expected — rule 4 above already covers this. The UI
renders those amounts with no threshold coloring, which is the intended behavior, not a gap.

### UI consequence of #3

Because unattributed spend exists, the nested per-project table is explicitly a **breakdown by
project**, not a decomposition of the user's global total. The frontend labels it accordingly so
an admin comparing it against the "Budgets" column does not read the difference as a defect.

Please confirm or correct these five; everything else in this document is a firm requirement of the UI
as designed.
