# Block Disabled Feature Routes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Wrap all unguarded feature-flagged routes in `src/router.tsx` with `FeatureGuard` so that direct URL navigation to any disabled-feature route is blocked generically.

**Architecture:** `FeatureGuard` already exists and is used in `analyticsRoutes` and `aiAdoptionConfigRoutes`. It reads `appInfoStore.configs` via `useSnapshot` and throws a 404-shaped error when the flag is disabled, caught by the root `ErrorBoundary: ErrorPage`. The fix is purely additive — wrap route elements in five route arrays. No new files, no new abstractions.

**Tech Stack:** React, react-router v7.9.5, Valtio (`useSnapshot`), Vitest + React Testing Library

**Spec:** `docs/superpowers/tasks/2026-08-14-epmcdme-14081-block-disabled-feature-routes/technical-analysis.md`

## Global Constraints

- Commit message format enforced by CI: `^(EPMCDME)-(?!0+)\d+:\s[A-Z][a-z]*.*`
- Branch: `EPMCDME-14081_block-disabled-feature-routes`
- Do NOT modify `FeatureGuard.tsx` or `featureFlags.ts` — they already have everything needed.
- All `FEATURE_FLAGS` constants needed are already declared in `src/constants/featureFlags.ts`.
- Wrapping pattern: `element: (<FeatureGuard featureFlag={FEATURE_FLAGS.X}><Page /></FeatureGuard>)` — identical to `analyticsRoutes`.

---

### Task 1: Wrap favoritesRoutes with FAVORITES_PAGE guard

**Files:**
- Modify: `src/router.tsx:647-668`

**Test-first: yes** — manually verify RED by confirming `/favorites` renders when flag is disabled before the change; GREEN after.

- [ ] **Step 1: Apply the change**

In `src/router.tsx`, replace `favoritesRoutes` (lines 647–668):

```tsx
const favoritesRoutes: RouteObject[] = [
  {
    id: 'favorites',
    path: 'favorites',
    element: (
      <FeatureGuard featureFlag={FEATURE_FLAGS.FAVORITES_PAGE}>
        <FavoritesPage filter="all" />
      </FeatureGuard>
    ),
  },
  {
    id: 'favorites-assistants',
    path: 'favorites/assistants',
    element: (
      <FeatureGuard featureFlag={FEATURE_FLAGS.FAVORITES_PAGE}>
        <FavoritesPage filter="assistant" />
      </FeatureGuard>
    ),
  },
  {
    id: 'favorites-workflows',
    path: 'favorites/workflows',
    element: (
      <FeatureGuard featureFlag={FEATURE_FLAGS.FAVORITES_PAGE}>
        <FavoritesPage filter="workflow" />
      </FeatureGuard>
    ),
  },
  {
    id: 'favorites-skills',
    path: 'favorites/skills',
    element: (
      <FeatureGuard featureFlag={FEATURE_FLAGS.FAVORITES_PAGE}>
        <FavoritesPage filter="skill" />
      </FeatureGuard>
    ),
  },
]
```

`FeatureGuard` already imported at line 104. `FEATURE_FLAGS` already imported at line 21. No new imports.

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/router.tsx
git commit -m "EPMCDME-14081: Wrap favorites routes with FeatureGuard"
```

---

### Task 2: Wrap settings routes with TEAMS_BOT_INTEGRATION, USER_MANAGEMENT, BUDGET_MANAGEMENT, MCP_CONNECT guards

**Files:**
- Modify: `src/router.tsx:440-523` (settingsRoutes)

**Test-first: yes** — same manual verification approach.

- [ ] **Step 1: Apply the change**

In `src/router.tsx`, in `settingsRoutes`, replace the four unguarded entries:

```tsx
  {
    id: 'budgets-management',
    path: '/settings/administration/budgets',
    element: (
      <FeatureGuard featureFlag={FEATURE_FLAGS.BUDGET_MANAGEMENT}>
        <BudgetsManagementPage />
      </FeatureGuard>
    ),
  },
  {
    id: 'administration-users',
    path: '/settings/administration/users',
    element: (
      <FeatureGuard featureFlag={FEATURE_FLAGS.USER_MANAGEMENT}>
        <UsersManagementPage />
      </FeatureGuard>
    ),
  },
  {
    path: '/settings/administration/mcps',
    element: (
      <FeatureGuard featureFlag={FEATURE_FLAGS.MCP_CONNECT}>
        <MCPManagementPage />
      </FeatureGuard>
    ),
  },
  {
    id: SETTINGS_TEAMS_BOT,
    path: '/settings/administration/teams',
    element: (
      <FeatureGuard featureFlag={FEATURE_FLAGS.TEAMS_BOT_INTEGRATION}>
        <TeamsBotPage />
      </FeatureGuard>
    ),
  },
  {
    id: SETTINGS_TEAMS_BOT_PROJECT,
    path: '/settings/administration/teams/:projectName',
    element: (
      <FeatureGuard featureFlag={FEATURE_FLAGS.TEAMS_BOT_INTEGRATION}>
        <TeamsBotProjectPage />
      </FeatureGuard>
    ),
  },
```

Note: these currently use `Component:` shorthand. Switching to `element:` with `FeatureGuard` wrapping is the correct approach (same as `analyticsRoutes`).

- [ ] **Step 2: Run typecheck**

```bash
npx tsc --noEmit
```

Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/router.tsx
git commit -m "EPMCDME-14081: Wrap settings routes with feature-flag guards"
```
