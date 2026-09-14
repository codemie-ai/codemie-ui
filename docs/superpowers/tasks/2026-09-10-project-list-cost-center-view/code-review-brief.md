# Code review — 2026-09-10-project-list-cost-center-view (2026-09-10)

**request-changes** · confidence: low · 3 blocking · 0 deferred · 0 filtered as noise
Coverage: blind — n/a (compact profile) · edge-case ✓ · acceptance — n/a (no spec) · verification-gap — n/a (compact profile)  (1/4 lenses ran)

## Look here first

- `src/pages/settings/administration/projectsManagement/ProjectsManagementFull.tsx:141` — [other] whitespace-only `display_name` renders the project code twice in the new two-line name cell — CR-002
- `src/store/chatGeneration.ts:1537` — [other] an explicit `routing: null` from the backend can never clear a previously merged routing label — CR-003
- `src/pages/chat/components/ChatHeader/ChatHeader.tsx:166` — [billing] classifier cost row is hidden when the cost is exactly $0, indistinguishable from "classifier didn't run" — CR-001

## Checked and clean

standards: commit-format n/a · code-quality n/a · security n/a (audit not expected for the compact profile)
