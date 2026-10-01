# Spec — Mobile and Tablet Adaptation

**Ticket:** EPMCDME-15365 (implementation; design in EPMCDME-10587)
**Date:** 2026-09-25
**Status:** Implemented
**Repos:** codemie-ui
**Design:** Figma `JSNEJLYXrX6qhc9ygB5QgJ`, "mobile" section (node `15127:51409`)

---

## 1. Goals

1. The app is usable on modern phones (360–430px) and portrait tablets (744–834px).
2. The mobile layout follows the Figma "mobile" section.
3. Desktop (>= 1024px) looks and behaves exactly as before.
4. The change stays small: existing components gain a mobile branch; nothing is rewritten.

## 2. Layout model

- One breakpoint separates the layouts: Tailwind `lg` (1024px). Below it the mobile shell is used;
  phones (< 640px, `max-sm:`) get extra compaction.
- CSS uses `max-lg:`/`max-sm:` utilities. Components that render different markup use
  `useIsMobileLayout()`, which evaluates the same media query (`MOBILE_LAYOUT_MEDIA_QUERY`), so CSS and
  JS always agree. `matchesMobileLayout()` reads it once, for effects that must not re-run on a switch.
- Mobile shell state (navigation open, sidebar open, registered page sidebars) lives in `appInfoStore`.

## 3. Behaviour by area

| Area | Mobile behaviour (< 1024px) |
|---|---|
| Top bar | 56px bar: logo (starts a new chat), a sidebar button shown only when the page has a sidebar, and a section switcher showing the current section that opens the navigation |
| Navigation | Existing navigation rendered as a full-screen overlay under the top bar, always expanded; closes on link tap, Escape, route change, or when the sidebar opens |
| Page sidebars | `Sidebar` and the workflow execution history become full-width overlays under the top bar, opened from the top bar; they stay mounted (filters keep state) and close on navigation or Escape |
| Page header | Wraps; title truncates; actions wrap instead of overflowing |
| Tables | Default-variant tables without footers or custom rows render one card per row (title, actions, labelled fields, expandable content). A toolbar above the cards offers "Select all" and "Sort by" for tables that support them |
| Dialogs | Never wider than the screen; 16px outer margin |
| Tabs, cards | Tabs scroll horizontally; cards grow to fit a wrapping footer |
| Chat | No resizable panels: the chat list is the page sidebar overlay and the configuration is a full-width overlay with a close button. Picking another chat closes the configuration. Compact header (icon-only actions), icon-first prompt toolbar that never hides Send, compact AI metadata (`2.28s / date`) with a small inline avatar, floating help launcher hidden |
| Forms | Assistant and skill forms use the existing compact (chat-config) layout; rows wrap; nothing overflows |
| Analytics | Metric tiles in 2 columns; charts stack under their legends; smaller widget padding on phones |
| Katas | Cards and tabs fit; the floating kata window is never wider than the screen |
| Users management | Filters in a 2-column grid; users as cards with select-all and expandable budgets |
| Onboarding | Tours target the desktop layout: they do not auto-start and are not offered on mobile; first-visit tours stay pending for a desktop session |
| Login | Logo and form fit a phone screen (Keycloak theme shares the layout) |
| Global | `100dvh` app height, `interactive-widget=resizes-content`, 16px form fields on touch screens < 1024px (no iOS focus zoom) |

After a switch back to desktop (window resize, tablet rotation) the chat panels follow the store state:
a collapsed chat list stays collapsed, and an open configuration opens as the desktop panel. Uploaded
attachments in the prompt survive a switch in either direction, and the floating kata window keeps
fitting the screen after a resize or rotation.

While an overlay is open, the content it covers is inert (out of reach of the keyboard and screen
readers). Escape closes the overlay, unless focus is in a dialog or menu opened over it, which closes
first.

## 4. Acceptance criteria

1. At >= 1024px the application looks and behaves exactly as before: same structure, same classes in
   effect, no behaviour change.
2. Below 1024px no page scrolls horizontally, and content does not overflow sideways on the main pages
   (chats, assistants, skills, workflows, integrations, data sources, schedulers, katas, analytics,
   help, settings, create/edit forms).
3. The top bar exists only below 1024px; the navigation and sidebar overlays are mutually exclusive,
   close on route change and on Escape, and do not stay open after switching to desktop.
4. The sidebar button is shown only on pages that render a sidebar.
5. Chat on phones: chat list and configuration are overlays; prompt, Send and header actions stay
   reachable; nothing covers Send; picking another chat shows that chat.
6. The prompt toolbar does not cut off the Skills control; AI message metadata is compact.
7. "Create New Skill" has no overlapping or overflowing text.
8. Katas, the Analytics dashboard and the login page are usable on phones.
9. Card tables keep row selection, "select all" and sorting; taps inside expanded content do not
   change the selection.
10. Dialogs never exceed the screen width.
11. Crossing the 1024px breakpoint keeps the chat panels in step with the store.
12. No existing test, feature or style breaks; all quality gates pass.

## 5. Out of scope and known limitations

- The workflow editor canvas is not redesigned for phones (best effort only; the execution history is
  adapted).
- Onboarding tours are desktop-only.
- Crossing the breakpoint still remounts the chat area (only the prompt's text draft and uploaded
  attachments are handed over; an upload in progress at that moment is not).
- The global `matchMedia` test stub stays desktop; tests opt into the mobile layout with
  `mockMobileLayout()` from `src/test-utils/mobileLayout.ts`.
