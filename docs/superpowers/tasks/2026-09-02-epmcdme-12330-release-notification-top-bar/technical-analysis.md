# Technical Research

**Task**: Change "New Codemie Release" popup into top bar
**Generated**: 2026-09-02
**Research path**: filesystem

---

## 1. Original Context

As a User, I come to Codemie ONLY when I need to do something. I come with certain goal / task to solve, and I want to proceed straight to the fulfilling the goal. I do not want to be distracted by banners, popups, advertizings, promotions or any other popup windows I never asked for.

"What's new" modal popup distracts me from my goal:
 * In principle, I am not against learning what's new - but going to read it derails me from my work;
 * If I close this banner, I will have to search where in the GUI I can find this page with recent changes to read them AFTER I completed my work and if I still have time
 * If I do not have time, this popup will not appear until next Codemie release, so I have little chances to catch-up with potentially breaking changes.

So I want a way to stay informed, but in a sustainable manner that respesct my time and gives me opportunity to set my priorities.

*PROPOSAL*

Redesign "What's new" from current blocking modal popup to an upper drawer / bar (about 50px height) that remains visible all the time until user dismisses it with standard "X" (close) or "Dismiss" button. Bar remains visible until user manually closes it, not disappering automatically in the subsequent visits. 

---

## 2. Codebase Findings

### Existing Implementations
- `codemie-ui/src/components/appLevel/AutoPopupManager.tsx` — Handles the rendering and tracking of the various first-time popups and the "New CodeMie Release" popup (P2).
- `codemie-ui/src/components/appLevel/Banner.tsx` — Renders the active administrator banner (`VITE_BANNER_MESSAGE`).
- `codemie-ui/src/store/appInfo.ts` — Governs the general app-level metadata, viewed versions, and releases.
- `codemie-ui/src/App.tsx` — Main application-level entry point where the global providers, banners, and layout structures are mounted.

### Architecture and Layers Affected
- UI Layer: App.tsx layout mounting, AutoPopupManager popups management, and a new ReleaseNotificationBar component.
- State Layer: appInfoStore state properties tracking active banner dismissal and release bar dismissal states.

### Integration Points
- appInfoStore integration with localStorage for persisting viewed/dismissed version details.
- onboardingStore integration for suppressing elements during P1 intro flows.

### Patterns and Conventions
- Valtio-based state management with useSnapshot hooks for reactivity in React components (`useSnapshot(appInfoStore)` destructuring `configs` so async config fetching reactively triggers admin banner suppression).
- TailWind styling using standard spacing tokens (`min-h-12 h-12`) and approved gradient tokens, combined with local assets and SVGs.
- WCAG 2.1 AA keyboard accessibility: visible focus rings (`focus-visible:ring-2 focus-visible:ring-white`) and accurate ARIA landmarks.
- DRY and clean architecture: centralized `hash()` and `BANNER_SHOWN_STORAGE_KEY_PREFIX` in `appInfo.ts` and exported `DISMISSED_RELEASE_BAR_KEY` for unit test assertions.

---

## 3. Documentation Findings

### Guides and Architecture Docs
- No guides found — conventions derived from code exploration.

### Architectural Decisions
- None named by the task.

### Derived Conventions
- Components are modern React functional components with Valtio state snapshots and tailwind styling.

---

## 4. Testing Landscape

### Existing Coverage
- `codemie-ui/src/components/appLevel/__tests__/Banner.test.tsx` — Covers standard administrator banner rendering.
- `codemie-ui/src/components/appLevel/__tests__/AutoPopupManager.test.tsx` (if exists) or similar app level unit testing.

### Testing Framework and Patterns
- Vitest + React Testing Library using standard assertions and fireEvent utilities.

### Coverage Gaps
- Lack of specific test coverage for the non-blocking top bar, priority rules (Admin banner vs. Release bar), and SSO P1 onboarding suppression rules.

---

## 5. Configuration and Environment

### Environment Variables
- `VITE_BANNER_MESSAGE` — Defines the active admin announcement.

### Configuration Files
- None.

### Feature Flags and Deployment Concerns
- No active feature flags for this change.

---

## 6. Risk Indicators
- Stacking issues: Rendering multiple top banners on top of each other. Mitigated via strict banner priority.
- Regression in onboarding: Breaking user flow. Mitigated via checking SSO status and onboarding visibility rules.

---

## 7. Summary for Complexity Assessment
The task transforms a blocking popup modal into a modern, non-blocking top banner. It touches the application state layer (`appInfo.ts`), layout entry point (`App.tsx`), and popup management (`AutoPopupManager.tsx`). Testing coverage must be added to verify priority and suppression behaviors. Complexity is minimal (size S) as it leverages existing Valtio/localStorage states.

---

## 8. External References
Mockup path: `C:/Users/BohdanLeshko/.gemini/antigravity-cli/brain/f5f3295e-2381-4b90-a0e3-c83ac1d693d3/mockups/mockup-release-top-bar.html` (resolved).
