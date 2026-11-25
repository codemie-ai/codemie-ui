# Technical Research

**Task**: profile delete-conversations button hover contrast
**Generated**: 2026-11-16
**Research path**: filesystem

---

## 1. Original Context

EPMCDME-8578 (Bug, Minor) "[1.4.3] The contrast ratio is failed for the 'Delete All Conversations' button when hovered". Steps: open #/settings/profile as an authorised user, hover the "Delete All Conversations" button, measure contrast between its text and background in hover state. Actual: text #FE3B4C over background #333436 gives only 3.5:1. Expected: hovered text vs background contrast at least 4.5:1 (WCAG AA). Labels: Frontend, Profile, accessibility_issue. Note: an older Jira comment mentions a prior plan (update failed.delete.hover token in tailwind.config.ts and use semantic hover classes in Button.tsx) — treat it as an unverified hint; check the current code, and whether it is already in main.

---

## 2. Codebase Findings

### Existing Implementations

Purpose: the hover colours of the Delete All Conversations button.
- Render site: `src/pages/settings/components/ConversationCard.tsx:45` — `<Button type="delete" onClick=...>` with `DeleteDangerSvg` icon, no className override. Sits inside `InfoCard` (`src/pages/settings/components/InfoCard.tsx:29`, `bg-surface-base-chat`), so the button's translucent bg composites over `surface-base-chat`.
- Variant: `src/components/Button/Button.tsx:87` (ButtonType.DELETE):
  `border-failed-delete-default text-failed-delete-default bg-failed-delete-default/10 hover:bg-failed-delete-hover/10 hover:text-failed-delete-hover hover:border-failed-delete-hover`
- Tokens: `tailwind.config.ts:459-462`, tuples are [dark, light]:
  - `failed.delete.default` = [red.520 `#FA323E`, red.580 `#E52530`]
  - `failed.delete.hover` = [red.420 `#FF4450`, red.645 `#D11D28`]
- Background: `surface-base-chat` = [neutral.900 `#1C1C1C`, neutral.0 `#FFFFFF`] (`tailwind.config.ts:223`).
- My computed WCAG ratios (10% alpha composite over surface-base-chat; arithmetic check, not a browser measurement):
  - Dark hover: `#FF4450` on `#332021` = 4.52:1.
  - Light hover: `#D11D28` on `#FAE8EA` = 4.54:1.
  - Default (non-hover): dark 4.17:1, light 3.88:1 (below 4.5, outside the ticket's hover scope).
- Reported colours do not match current code. `#FE3B4C` is red.450 (`failed-secondary`/`failed-primary` family), not a delete token. `#333436` is neutral.725 (`surface-specific-dropdown-hover`, `secondary-button-hover`, etc.). Ratio of those two: 3.53:1, which matches the ticket's "3.5:1". The reporter's build or element therefore likely predates the current Button delete classes, or a different style was measured.

Other touched code: none required to identify the render site.

### Decisions Already in the Code
- The delete variant uses a dedicated `failed.delete.{default,hover}` token pair and a 10% alpha tinted background. It was introduced by `fed7f53b9` "EPMCDME-8234: Fix contrast ratio on Delete button hover state" (Button.tsx +1/-1, tailwind.config.ts +8, plus an AssistantDetailsPage integration test), already on main. The Jira "prior plan" token half is therefore already in main. The "semantic hover classes" half is not: Button.tsx still uses the `failed-delete-*` utilities rather than `surface-specific-*` or `border-specific-*` semantic names.
- Theme tuple convention is [dark, light] (see `.ai-run/guides/styling/theme-management.md`).
- A prior attempt for this exact ticket exists only on `origin/EPMCDME-8578-delete-all-conversations-button-contrast-ratio-fix` (commits `a820bb708`, `cf97662c6`, etc.) and not on main. `a820bb708` adds a className override on ConversationCard (`hover:bg-surface-specific-button-conversation-delete-hover hover:text-text-inverse hover:border-border-specific-button-conversation-delete-hover`), two tokens in tailwind.config.ts, and a ConversationCard test. It is scoped to this one button. Current branch has no commits ahead of main.

### Task Statements Checked Against the Code
- "Actual: #FE3B4C on #333436": contradicted for the current Button delete hover classes (they resolve to #FF4450 on about #332021 in dark). Not reproduced from code; needs a browser measurement.
- "Update failed.delete.hover token in tailwind.config.ts": already in main (via 8234); the token exists. It leaves the shared Button delete variant, used by every consumer below, in place.
- "Use semantic hover classes in Button.tsx": not in main (unverified whether wanted).

### Consumers of Changed Contracts
Searches: `failed-delete` across `src` returns only Button.tsx (no other direct use). All consumers come via `ButtonType.DELETE` / `type|variant="delete"`, about 70 call sites, most through `ConfirmationModal` `confirmButtonType`. Non-modal direct users include:
- `src/pages/settings/components/CustomAppearance/BasicSettings.tsx:119` (small, same settings area)
- `src/pages/chat/components/ChatControls.tsx:50` (abort)
- `src/pages/workflows/editor/EditorActions.tsx:78`, `.../configPanels/UnsavedChangesConfirmation.tsx:35`, `.../configPanels/components/{TabFooter,ConfigPanelFooter,MappingRow}.tsx`, `.../configPanels/SwitchTab.tsx:194`
- `src/pages/workflows/details/WorkflowExecutionHeader.tsx:76`, `.../states/WorkflowExecutionStateControls.tsx:104`
- `src/pages/settings/administration/CostCenterDetailsPage.tsx:123`, `.../projectsManagement/CostCenterProjectsManager.tsx:200`, `.../usersManagement/components/UserProjectsTable.tsx:295`, `.../components/MCPServerDetails/ServerActions.tsx:48`, `.../marketplaceManagement/components/AssistantDetailsDrawer.tsx:213`
- `src/pages/assistants/AssistantActions/components/{PublishGateFindingsModal,QualityValidationModal}.tsx`, `.../MCPToolkit/MCPServerDetail.tsx:88`, `.../SystemPrompt/ManagePromptVariablesPopup.tsx:198`
- `src/pages/chat/.../DeleteFolderPopup.tsx:61`, `AssistantFolderDeletePopup.tsx:82`, `thoughtView.tsx:85`
- `src/pages/settings/aws/agentCoreRuntimes/components/AwsAgentCoreEndpointRow.tsx:118`

Changing the `failed.delete` tokens or the Button DELETE classes changes all of them in both themes. A className override on ConversationCard (as on the unmerged branch) changes only this button.

### Architecture and Layers Affected
Presentation only: shared `Button` component, Tailwind theme tokens (`tailwind.config.ts` themes dark/light, emitted as `--colors-*` CSS vars), and the settings page card.

### Integration Points
`cn()` (`@/utils/utils`, tailwind-merge) merges `className` after the variant classes, so a per-instance override wins. `ConfirmationModal` forwards `confirmButtonType` to Button.

### Patterns and Conventions
Semantic tokens in `tailwind.config.ts` as [dark, light] tuples; Button variants are class strings keyed on `ButtonType`.

---

## 3. Documentation Findings

### Guides and Architecture Docs
`.ai-run/guides/styling/styling-guide.md` and `theme-management.md` exist (listed; not read in depth).

### Architectural Decisions
None recorded beyond the commit history above. Earlier task analyses exist under `docs/superpowers/tasks/` (for example 2026-08-11-epmcdme-8547 for dropdown contrast).

### Derived Conventions
Contrast fixes are made via tokens in `tailwind.config.ts`, with an assertion in the nearest component test.

---

## 4. Testing Landscape

### Existing Coverage
`src/components/Button/__tests__/Button.test.tsx` covers only the magical type and disabled (no delete-variant class assertions). `AssistantDetailsPage.integration.test.tsx` got an assertion in 8234. `src/utils/__tests__/themeHelpers.test.ts` covers theme helpers.

### Testing Framework and Patterns
Vitest + Testing Library (`toHaveClass` assertions).

### Coverage Gaps
No `ConversationCard` test on main (the branch adds one). No test asserts the delete token values or a contrast ratio.

---

## 5. Configuration and Environment

### Environment Variables
None relevant.

### Configuration Files
`tailwind.config.ts` (tokens, themes dark/light, `darkMode: ['variant', '.nottused * &']`).

### Feature Flags and Deployment Concerns
None found. The user-customizable appearance presets (`CustomAppearance/BasicSettings.tsx`) may override theme colours; not checked.

---

## 6. Risk Indicators

- Reported colours (#FE3B4C on #333436) do not correspond to current delete hover classes; the defect may not reproduce on main. Needs a measurement in the running app before any change.
- Computed hover contrast is 4.52 (dark) and 4.54 (light), barely above 4.5, so any measurement variance (alpha compositing, different surface) can flip it.
- Default (non-hover) state computes 4.17 (dark) and 3.88 (light), under 4.5; a likely sibling a11y finding.
- Speculative: a token or Button change has about 70 consumers in both themes; a ConversationCard-only override has a blast radius of one but diverges from the shared variant.
- The prior branch's fix (`a820bb708`) exists unmerged and may overlap; the "semantic hover classes" suggestion is not in main.
- Contrast computed by me with a 10% alpha composite; not verified in a browser.

---

## 7. Summary for Complexity Assessment

The Delete All Conversations button is `<Button type="delete">` in `ConversationCard.tsx`. Its hover colours come entirely from the shared Button DELETE variant (Button.tsx:87) and `failed.delete` tokens (tailwind.config.ts:459). Layers touched are the presentation layer only: a component, a theme token file, and possibly one test. The change surface is small (one to three files), but the shared variant has about 70 consumers across both themes.

Technical novelty is low. The token approach from the Jira hint was already merged by EPMCDME-8234. Current computed hover contrast is about 4.5:1 in both themes, so the ticket's measured values do not match the code, and reproduction is the main uncertainty. An unmerged branch on origin holds a ConversationCard-scoped fix.

Test posture is thin: no ConversationCard test on main and no delete-variant assertions in the Button tests. Main risks are an unreproducible report, marginal passing ratios, and the blast radius if shared tokens are changed.

---

## 8. External References

None named by the task. The Jira comment's prior plan was checked against code and git history (Section 2).
