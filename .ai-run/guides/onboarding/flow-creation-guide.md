# Onboarding Flow Creation Guide — CodeMie UI

> Create onboarding flow specs as high-level markdown. Focus on user experience, not implementation.

---

## Key Source Files

| File | Purpose |
|---|---|
| `src/types/onboarding.ts` | `OnboardingFlow`, `OnboardingFlowTriggers`, step type definitions |
| `src/store/onboarding.ts` | Flow registry, `getFlowsForPage`, `getFlowsForWelcome` |
| `src/config/onboarding/flows/` | Individual flow implementations |
| `src/constants/routes.ts` | Route name constants |
| `src/constants/helpLinks.ts` | `HelpPageId` values |

---

## Flow Structure

### File Naming

Format: `##-descriptive-name.md` — e.g., `01-navigation-introduction.md`, `02-chat-basics.md`

### Header Template

```markdown
# Flow Name

**Name**: User-friendly name
**Description**: 1-2 sentences on what the flow teaches
**Target Audience**: new users | advanced users | role
**Estimated Duration**: 3-4 minutes
**Triggers**:
  - Help Panel Pages: [HelpPageId, or "None"]
  - Show on Welcome: [true | false]
  - Release Versions: [version string, or "none"]
```

---

## Trigger Types

`triggers` controls where a flow is surfaced **beyond the Help page**.
All flows are always accessible from Help > Interactive Tours regardless of triggers.

```ts
triggers?: {
  helpPanelPages?: Array<{
    id: HelpPageId           // page where flow appears in ? help popup
    firstTimePopup?: boolean // auto-show popup on user's first visit to this page
  }>
  showOnWelcome?: boolean    // FirstTimeUserPopup for new SSO users
  releaseVersions?: string[] // NewReleasePopup for a specific app version
}
```

Omit `triggers` entirely for broad/general tours that should only appear in the Help page.

### `helpPanelPages` — HelpPanel & First-Time Page Popup

Adds the flow to the `?` button popup anchored to the bottom-right of a page.
Add `firstTimePopup: true` to also auto-show a one-time popup on the user's first visit.

**Available `HelpPageId` values:**

| Value | Pages shown on |
|---|---|
| `chat` | Chat home / `/chats` |
| `assistants` | Assistants list, detail, form |
| `workflows` | Workflows list, view, editor |
| `integrations` | Integrations list, form |
| `datasources` | Data Sources list, detail, form |
| `katas` | Katas list and detail |

### `showOnWelcome`

Set to `true` to surface the flow in the **FirstTimeUserPopup** — shown once to new SSO users on first login. Use for foundational tours that are an ideal starting point.

### `releaseVersions`

Array of version strings (e.g. `['0.4.7']`). Flow appears in the **NewReleasePopup** when the user sees the release notification for any listed version.

### Trigger Examples

```markdown
# Page-scoped flow
**Triggers**:
  - Help Panel Pages: assistants
  - Show on Welcome: false
  - Release Versions: none

# Auto-popup on first page visit
**Triggers**:
  - Help Panel Pages: integrations (firstTimePopup: true)
  - Show on Welcome: false
  - Release Versions: none

# Welcome flow only (no page popup)
**Triggers**:
  - Help Panel Pages: None
  - Show on Welcome: true
  - Release Versions: none

# Release-specific
**Triggers**:
  - Help Panel Pages: None
  - Show on Welcome: false
  - Release Versions: 0.4.7

# Broad tour — Help page only
**Triggers**: None (Help page only)
```

---

## Step Types

**RULE**: Each step has **exactly one** action type. Combine actions by creating sequential steps.

### Numbering Convention

- **User-visible steps** (Modal, Highlight): `## Step [N]: [Name]`
- **Technical steps** (Code Execution, Navigation): `## Tech Step: [Name]` (no number)

Tech steps do not break the numbering sequence of user-visible steps.

---

### 1. Modal

Use for: welcome messages, completion messages, major transitions, info not tied to a UI element.

```markdown
## Step 1: Welcome

**Title**: Welcome to Chat Interface
**Action Type**: Modal

**Message**:
```
Welcome! This tour covers the chat interface essentials.
```
```

Rules:
- Step 1 **must** be Modal (welcome)
- Last step **must** be Modal (completion)
- Max ~150 words per message

---

### 2. Code Execution

Use for: silent setup actions, toggling UI state, creating demo data, scrolling.

```markdown
## Tech Step: Expand Navigation

**Action Type**: Code Execution
**Code Action**: Expand the navigation menu if it's currently collapsed
```

Rules:
- No message, no title, no step number
- Describe **what** to do, not how (no function names, no selectors)
- Use imperative present tense

#### `onBack` — Back Navigation Reversal

Provide `onBack` when `execute` mutates visible UI state that would confuse the user if they saw it while revisiting an earlier step. Omit it when the side effect is harmless to leave in place.

```markdown
## Tech Step: Toggle Navigation Demo

**Action Type**: Code Execution
**Code Action**: Toggle the navigation width to demonstrate expand/collapse
**Back Action**: Toggle navigation width again to restore state before this step
```

Navigation steps (`NavigationStep`) are reversed automatically via `router.back()` — no `onBack` is needed or supported for them.

---

### 3. Highlight

Use for: pointing out specific UI elements, explaining features without leaving the page.

```markdown
## Step 5: Chat Input

**Title**: Type Your Messages Here
**Action Type**: Highlight
**Target**: Chat message input field at bottom of screen

**Message**:
```
Type messages here. Press Enter to send, Shift+Enter for new lines.
```
```

Rules:
- `Target` must be descriptive, not a CSS selector or ID
- Use positional context: "at top of navigation", "bottom right corner"
- Messages should explain one element/concept only

---

### 4. Navigation

Use for: moving to different pages as a silent automatic action.

```markdown
## Tech Step: Navigate to Assistants

**Action Type**: Navigation
**Navigate To**: Assistants page
```

Rules:
- No message, no title, no step number
- Use descriptive page names, not route paths (`Assistants page` not `/assistants`)

---

## Flow Registration

After writing the spec, the implementation flow object must be registered in `src/store/onboarding.ts`. The `OnboardingFlow` type (in `src/types/onboarding.ts`) contains:

```ts
interface OnboardingFlow {
  id: string
  name: string
  description: string
  triggers?: OnboardingFlowTriggers
  steps: OnboardingStep[]
}
```

Implemented flow files live in `src/config/onboarding/flows/`. See `firstTimeUser.ts` for a reference implementation.

---

## Step Sequencing Rules

| Position | Required | Notes |
|---|---|---|
| Step 1 | Modal (welcome) | Always |
| Step 2 | Often Code Execution | Setup/environment |
| Middle steps | Highlight or Navigation pairs | Logical user workflow order |
| Last step | Modal (completion + suggestions) | Always |

### Completion Step Structure

Final Modal must include:
1. Congratulations message + list of learnings (✓ bullets)
2. "Continue Learning" section with 3–4 suggested flows

Each suggestion: emoji + title + one-sentence description + duration estimate.

---

## Conditional Steps

Mark conditional steps with `(Conditional)` in the heading:

```markdown
## Step 4: Skills Overview (Conditional)

**Title**: Explore Skills
**Action Type**: Highlight
**Condition**: Only show if Skills feature is enabled
**Target**: Skills section in the sidebar

**Message**:
```
Skills extend what your assistant can do...
```
```

When a step has multiple message variants, list each labelled block:

```markdown
**Message (if assistants exist)**:
```
You have assistants ready to use...
```

**Message (if no assistants)**:
```
No assistants yet — create your first one...
```
```

---

## DO / DON'T Table

| Category | DON'T | DO |
|---|---|---|
| **Targets** | `[data-onboarding="chat-input"]` (CSS selector) | `'Chat message input field at bottom of screen'` |
| **Page names** | `/assistants` or `{ name: 'assistants' }` | `'Assistants page'` |
| **Code actions** | `toggleNavigation()` (function name) | `'Expand the navigation menu if collapsed'` |
| **Step numbering** | Number Tech Steps | Only number Modal and Highlight steps |
| **Action types** | Combine two types in one step | Create separate sequential steps |
| **Tech step content** | Add Title or Message to Code Execution / Navigation | These steps have no message or title |
| **Triggers** | Omit the `Triggers` field entirely | Always declare (even if `None (Help page only)`) |
| **First/last steps** | Start with Highlight or end with Code Execution | First step Modal; last step Modal |
| **Titles** | `'The Next Thing To Do'`, `'Understanding the feature'` | 3–6 words, Title Case, action-oriented |
| **Messages** | Long passive-voice paragraphs | Short bullets, active voice, ≤150 words |
| **Conditions** | Leave conditional steps unmarked | Add `(Conditional)` to heading |
| **onBack** | Add `onBack` to Navigation steps | Only Code Execution steps support `onBack` |
| **Broad tours** | Add `helpPanelPages` to tours relevant everywhere | Omit `triggers` entirely |

---

## Quick Validation Checklist

**Structure**
- [ ] `Triggers` section present (or explicitly `None (Help page only)`)
- [ ] Step 1 is Modal; last step is Modal
- [ ] Modal / Highlight use `## Step N:` format; Code Execution / Navigation use `## Tech Step:`
- [ ] User-visible step numbers sequential, no gaps

**Action Types**
- [ ] Each step has exactly one action type
- [ ] Code Execution and Navigation: no title, no message
- [ ] Highlight: has `Target` property
- [ ] Navigation: has `Navigate To` property

**Content**
- [ ] All titles 3–6 words, Title Case
- [ ] No CSS selectors or route paths in user-facing text
- [ ] Highlight targets are descriptive and positionally clear
- [ ] Conditional steps marked `(Conditional)` with condition described

**Completion**
- [ ] Completion modal summarises learnings with ✓ bullets
- [ ] 3–4 next-flow suggestions with emoji, title, description, duration
