# Implementation Plan — EPMCDME-12330: Release Notification Top Bar

## Acceptance criteria
1. **Decouple Release Notification from Blocking Modals**: Completely eliminate the release modal dialog and backdrop in `AutoPopupManager.tsx`.
2. **Implement Production Top Bar**: Deliver a pixel-perfect ~48px top bar with version badge (`v{version}`), announcement text, "View Release Notes" route link, and dismiss button ("X") in `ReleaseNotificationBar.tsx`.
3. **Strict Priority & Non-Stacking Architecture**: If an Admin Announcement Banner is active, the Release Top Bar is suppressed.
4. **Onboarding Sequence Safety**: The release bar is suppressed while a new SSO user completes the initial P1 onboarding intro flow.
5. **Decouple First-Visit Page Popups (P2)**: First-time page popups trigger without waiting on or depending on release dialog dismissal.

---

## Tasks

### Task 1: Store Layer Updates in `appInfo.ts`
- **Test-first**: yes — Verify that `appInfoStore` initializes correct reactive properties (`dismissedReleaseBarVersion`, `isAdminBannerDismissed`) and evaluates `isAdminBannerActive` and `isReleaseBarDismissed` accurately.
- **Description**: Add reactive state tracking and helper methods for release bar dismissal and banner prioritization. Export `DISMISSED_RELEASE_BAR_KEY`, `BANNER_SHOWN_STORAGE_KEY_PREFIX`, and `hash` to eliminate code duplication across components and support reactive `configsList` evaluation.

### Task 2: Create ReleaseNotificationBar UI Component
- **Test-first**: yes — Verify that `ReleaseNotificationBar` mounts without error and displays version `v2.46.0` and the update copy when a new release is available.
- **Description**: Create `ReleaseNotificationBar.tsx` with production styles (Tailwind `min-h-12 h-12`), WCAG 2.1 AA focus rings, and reactive snapshot state (`configs`) passed to `isAdminBannerActive` for dynamic banner suppression.

### Task 3: Update Banner, AutoPopupManager, and App Layout
- **Test-first**: yes — Verify that the Admin Banner dismissal updates `appInfoStore.isAdminBannerDismissed` and `AutoPopupManager` no longer renders the P2 modal release.
- **Description**: Mount the new notification bar in `App.tsx` below `Banner`, update `Banner`'s close handler to trigger reactive state updates, deduplicate `hash` logic using shared exports from `appInfo.ts`, and clean up the old P2 modal in `AutoPopupManager`.

### Task 4: Add Automated Unit Tests for the Release Top Bar
- **Test-first**: yes — Verify that `ReleaseNotificationBar.test.tsx` triggers and fails correctly when asserting new behaviors before implementation is complete.
- **Description**: Create complete unit tests covering render, dismissal, navigation, priority, and suppression conditions.

### Task 5: Add Store-Level Unit Tests in `appInfo.test.ts`
- **Test-first**: yes — Verify that `appInfoStore.isReleaseBarDismissed`, `dismissReleaseBar`, `isAdminBannerActive`, and `dismissAdminBanner` are tested with full branch coverage.
- **Description**: Add unit tests in `src/store/__tests__/appInfo.test.ts` using the exported `DISMISSED_RELEASE_BAR_KEY` constant to guarantee 100% test coverage on new state methods and pass SonarQube quality gate.
