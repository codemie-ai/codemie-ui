# Onboarding Flow Creation Guide

**Purpose**: Guide for AI agents to create new onboarding flow specifications in markdown format
**Audience**: AI agents, developers creating onboarding content
**Last Updated**: 2026-03-24

---

## Overview

This guide explains how to create onboarding flow specifications that will later be implemented in the CodeMie UI. Flows are written as high-level markdown specifications focusing on user experience, not implementation details.

---

## Source Files to Check

Before creating a flow, review these files to understand the application structure:

### 1. Routes and Pages
**File**: `src/constants/routes.ts`
- Route name constants
- Available pages in the application

**File**: `src/router.tsx`
- Route configurations
- Page components and their paths

### 2. Onboarding Types
**File**: `src/types/onboarding.ts`
- TypeScript interfaces for onboarding system
- Available action types and properties
- Step structure and capabilities

### 3. Existing Flows
**File**: `src/config/onboarding/flows/firstTimeUser.ts`
- Example of implemented flow
- Shows how markdown specs translate to code

### 4. Feature-Specific Components
Depending on the flow topic, check relevant component files:
- **Chat**: `src/pages/chat/` - Chat interface components
- **Assistants**: `src/pages/assistants/` - Assistant management
- **Workflows**: `src/pages/workflows/` - Workflow editor
- **Integrations**: `src/pages/integrations/` - Integration management
- **Data Sources**: `src/pages/dataSources/` - Data source management

### 5. Stores (State Management)
**Directory**: `src/store/`
- Check relevant stores for available actions
- Understand data structure and state
- Examples: `chatsStore.ts`, `assistantsStore.ts`, `workflowsStore.ts`

---

## Flow Markdown Structure

### File Naming Convention
- Format: `##-descriptive-name.md`
- Numbering: Sequential (01, 02, 03, etc.)
- Examples: `01-navigation-introduction.md`, `02-chat-basics.md`

### Header Section

```markdown
# Flow Name

**Name**: User-friendly flow name
**Description**: Brief description of what the flow teaches (1-2 sentences)
**Target Audience**: Who this flow is for (e.g., new users, advanced users)
**Estimated Duration**: Time estimate (e.g., 3-4 minutes)
**Triggers**:
  - Help Panel Pages: [HelpPageId values with optional firstTimePopup: true, or "None"]
  - Show on Welcome: [true | false]
  - Release Versions: [version strings, or "none"]

---

## Overview (Optional)

Additional context about the flow, prerequisites, or learning objectives.
```

### Triggers Field

**`Triggers`** controls where the flow is surfaced in the UI **beyond the Help page**.
All flows are always accessible from the Help page (Interactive Tours section) regardless of triggers.

The `triggers` field maps directly to the `OnboardingFlowTriggers` interface in `src/types/onboarding.ts`:

```ts
triggers?: {
  helpPanelPages?: Array<{
    id: HelpPageId        // page where the flow appears in the HelpPanel popup
    firstTimePopup?: boolean  // show popup automatically on user's first visit to this page
  }>
  showOnWelcome?: boolean     // FirstTimeUserPopup for new SSO users
  releaseVersions?: string[]  // NewReleasePopup for specific app versions
}
```

Omit `triggers` entirely for broad/general tours (e.g. the full navigation walkthrough) that should only be accessible from the Help page.

#### `helpPanelPages` — HelpPanel Popup & First-Time Page Popup

Controls whether the flow appears in the `?` help button popup fixed to the bottom-right of a page.
Only add page IDs where the flow is **directly relevant** to what the user is doing on that page.

Optionally add `firstTimePopup: true` to also surface this flow in a **FirstTimePagePopup** — a one-time popup shown the first time the user visits that page. Use this for flows that introduce a feature the user has never seen before.

**Available `HelpPageId` values** (defined in `src/constants/helpLinks.ts`):

| Value | Pages shown on |
|---|---|
| `chat` | Chat page (home / `/chats`) |
| `assistants` | Assistants list, detail, and form pages |
| `workflows` | Workflows list, view, and editor pages |
| `integrations` | Integrations list and form pages |
| `datasources` | Data Sources list, detail, and form pages |
| `katas` | Katas list and detail pages |

#### `showOnWelcome` — FirstTimeUserPopup

Set to `true` to surface this flow in the **FirstTimeUserPopup** — the welcome dialog shown once to new SSO users on their first login. Use this for foundational tours that are ideal as a starting point.

#### `releaseVersions` — NewReleasePopup

An array of app version strings (e.g. `['0.4.7']`). The flow will appear in the **NewReleasePopup** whenever the user sees the release notification for any of the listed versions. Use this to highlight guided tours that showcase features introduced in a specific release.

**Examples**:
```markdown
# Focused flow — only relevant on the Assistants pages
**Triggers**:
  - Help Panel Pages: assistants
  - Show on Welcome: false
  - Release Versions: none

# Flow with first-time page popup — shown automatically the first time user visits Integrations
**Triggers**:
  - Help Panel Pages: integrations (firstTimePopup: true)
  - Show on Welcome: false
  - Release Versions: none

# Welcome flow — shown to new users AND accessible from Help page only
**Triggers**:
  - Help Panel Pages: None
  - Show on Welcome: true
  - Release Versions: none

# Release-specific flow — shown when user first sees the v0.4.7 release popup
**Triggers**:
  - Help Panel Pages: None
  - Show on Welcome: false
  - Release Versions: 0.4.7

# Combined — shown in release popup AND in help panel on integrations page
**Triggers**:
  - Help Panel Pages: integrations
  - Show on Welcome: false
  - Release Versions: 0.5.0

# Broad/general tour — Help page only, no popup triggers
**Triggers**: None (Help page only)
```

---

### Step Structure

**IMPORTANT NUMBERING RULE**:
- **User-Visible Steps** (Modal and Highlight): Use numbered format `## Step [NUMBER]: [Step Name]`
- **Technical Steps** (Code Execution and Navigation): Use format `## Tech Step: [Step Name]` (no number)

This distinction helps separate user-facing interactive steps from automatic background operations.

**User-Visible Step Format** (Modal and Highlight):

```markdown
## Step [NUMBER]: [Step Name]

**Title**: Short, user-friendly title shown in UI
**Action Type**: [Modal | Highlight]
**[Additional Properties]**: Based on action type

**Message**:
```
User-facing message content
Multiple lines allowed
```

---
```

**Technical Step Format** (Code Execution and Navigation):

```markdown
## Tech Step: [Step Name]

**Action Type**: [Code Execution | Navigation]
**[Additional Properties]**: Based on action type

**Note**: No message or title needed - these steps run automatically
---
```

**Numbering Example**:
- Step 1: Welcome (Modal)
- Tech Step: Expand Navigation (Code Execution)
- Step 2: Navigation Overview (Highlight)
- Tech Step: Navigate to Page (Navigation)
- Step 3: Feature Explanation (Highlight)

---

## Available Action Types

**IMPORTANT RULE**: Each step must have **exactly ONE** action type. You cannot combine multiple action types in a single step (e.g., "Highlight + Code Execution"). If you need to perform multiple actions, create separate sequential steps.

### 1. Modal

**When to Use**:
- Welcome messages
- Completion messages
- Information that doesn't relate to specific UI elements
- Major transitions between flow sections

**Properties**:
- `Title`: Required - Modal header
- `Message`: Required - Modal content

**Example**:
```markdown
## Step 1: Welcome

**Title**: Welcome to Chat Interface
**Action Type**: Modal

**Message**:
```
Welcome! This tour will teach you how to use the chat interface effectively.
```
```

**Rules**:
- Always use Modal for first step (welcome)
- Always use Modal for last step (completion)
- Modal messages should be concise (max 150 words)
- Use clear, friendly language

---

### 2. Code Execution

**When to Use**:
- Performing actions automatically for the user
- Setting up the environment for demonstration
- Toggling UI states
- Creating demo data

**Properties**:
- `Action Type`: "Code Execution"
- `Code Action`: Description of what code should execute
- **NO Message** - Code execution is silent
- **NO Number** - Use "Tech Step:" format

**Example**:
```markdown
## Tech Step: Expand Navigation

**Action Type**: Code Execution
**Code Action**: Expand the navigation menu if it's currently collapsed

---
```

**Rules**:
- Code execution steps are SILENT (no message to user)
- Must describe WHAT to do, not HOW (no implementation details)
- Use present tense, imperative form
- Keep action descriptions clear and unambiguous

**Common Code Actions**:
- "Expand the navigation menu if it's currently collapsed"
- "Create a new chat with default assistant"
- "Toggle theme to dark mode"
- "Clear all form inputs"
- "Scroll to element [description]"

**Back Navigation (`onBack`)**:

Code Execution steps support an optional `onBack` handler that is called when the user
navigates backward past this step using the "Back" button (or `ArrowLeft` keyboard shortcut).

- `onBack` is **optional** — omit it when the side effect is harmless to leave in place
  (e.g., a panel that stays open does not break earlier steps).
- Provide `onBack` when your `execute` mutates visible UI state that would confuse the user
  if they saw it while revisiting an earlier step (e.g., a toggle demo, an open dropdown).
- `onBack` describes the **reverse operation** of `execute`.

Example spec format when the back reversal is needed:
```markdown
## Tech Step: Toggle Navigation Demo

**Action Type**: Code Execution
**Code Action**: Toggle the navigation width to demonstrate expand/collapse
**Back Action**: Toggle navigation width again to restore the state before this step
```

> **Note**: Navigation steps (`NavigationStep`) are reversed automatically via the browser
> history (`router.back()`) — no back action is required or supported for them.

---

### 3. Highlight

**When to Use**:
- Drawing attention to specific UI elements
- Explaining features without navigation
- Pointing out buttons, inputs, or sections

**Properties**:
- `Title`: Required - Short title for tooltip
- `Target`: Required - Descriptive name of element (not CSS selector)
- `Message`: Required - Explanation of the element

**Example**:
```markdown
## Step 5: Chat Input

**Title**: Type Your Messages Here
**Action Type**: Highlight
**Target**: Chat message input field at bottom of screen

**Message**:
```
Type your messages in this input field. Press Enter to send, or Shift+Enter for new lines.
```
```

**Rules**:
- Target descriptions must be clear and unambiguous
- Use positional context (e.g., "at top of navigation", "bottom right corner")
- Messages should explain what the element does and how to use it
- Keep messages focused on one element/concept

**Target Description Guidelines**:
- ✅ GOOD: "Chat message input field at bottom of screen"
- ✅ GOOD: "Send button next to the message input"
- ✅ GOOD: "Assistants navigation item in the sidebar"
- ❌ BAD: `[data-onboarding="chat-input"]` (CSS selector)
- ❌ BAD: "The input" (not specific enough)
- ❌ BAD: "Button" (which button?)

---

### 4. Navigation

**When to Use**:
- Moving to different pages
- Showing features that require page changes
- Demonstrating navigation patterns

**Properties**:
- `Navigate To`: Required - Descriptive page name
- **NO Title** - Navigation is automatic
- **NO Message** - Navigation happens silently
- **NO Number** - Use "Tech Step:" format

**Example**:
```markdown
## Tech Step: Navigate to Assistants

**Action Type**: Navigation
**Navigate To**: Assistants page

---
```

**Rules**:
- Use descriptive page names, not route paths
- Navigation steps are always technical/automatic
- Can be preceded by Highlight step to explain where user is going
- Always allow time for page to load before next step

**Page Name Guidelines**:
- ✅ GOOD: "Assistants page", "Chat interface", "Workflow editor"
- ❌ BAD: `/assistants`, `{ name: 'assistants' }` (route details)

---

## Conditional Steps

Some steps should only appear based on feature flags or data availability.

### Structure

```markdown
## Step [N]: [Name] (Conditional)

**Title**: Title
**Action Type**: [Type]
**Condition**: Clear description of when to show this step
**[Other Properties]**

**Message**:
```
Message content
```

**Note**: Additional implementation notes about the condition
```

### Common Conditions

1. **Feature Flags**:
   ```markdown
   **Condition**: Only show if Skills feature is enabled
   ```

2. **Data Availability**:
   ```markdown
   **Condition**: Only show if applications are configured
   ```

3. **User State**:
   ```markdown
   **Condition**: Only show if user has no previous chats
   ```

4. **Multiple Conditions**:
   ```markdown
   **Condition**: Show based on which pre-built assistants are available

   **Note**: Message should be dynamically generated based on which assistants are actually present. If no assistants exist, skip this step entirely.
   ```

### Conditional Messages

When a step has multiple message variants:

```markdown
**Message (if [condition A])**:
```
Message for condition A
```

**Message (if [condition B])**:
```
Message for condition B
```

**Message (if [condition C])**:
```
Default message or message for condition C
```
```

---

## Step Sequencing Rules

### 1. Flow Opening
- **Step 1 MUST be Modal**: Welcome message
- **Step 2**: Often Code Execution to set up environment
- **Step 3+**: Begin actual flow content

### 2. Step Ordering
- Logical progression: Follow user's natural workflow
- Setup before demo: Code execution before highlighting
- Context before action: Explain before navigating

### 3. Flow Closing
- Second-to-last or last few steps: Wrap up with key UI elements
- **Final step MUST be Modal**: Completion + suggestions

---

## Completion Step Structure

The final step should always follow this structure:

```markdown
## Step [N]: Completion

**Title**: You're All Set!
**Action Type**: Modal

**Completion Message**:
```
Congratulations! You've completed [flow name].

You now know how to:
✓ [Key learning 1]
✓ [Key learning 2]
✓ [Key learning 3]
✓ [Key learning 4]
```

**Next Steps Suggestions**:

The modal should display a "Continue Learning" or "What's Next?" section with the following suggested flows:

```
Continue your learning journey with these guided tours:

1. [Emoji] [Flow Title]
   [One sentence description of what user will learn]
   Duration: [X-Y minutes]

2. [Emoji] [Flow Title]
   [One sentence description]
   Duration: [X-Y minutes]

[3-4 suggestions total]

You can skip these tours and start exploring on your own, or restart any tour from Help > Onboarding Tours.
```

**Suggestion Structure** (for reuse in other flows):

Each suggestion should follow this format:
- **Icon/Emoji** (visual identifier)
- **Title** (clear, action-oriented)
- **Description** (one sentence explaining what the user will learn/do)
- **Duration** (estimated time to complete)

**Implementation Note**: These suggestions should be clickable and start the respective onboarding flow when selected. Allow users to:
- Click a suggestion to start that flow immediately
- Dismiss the modal to explore on their own
- Access "Skip for now" option
```

### Suggested Flow Format

Use these emojis consistently:
- 📱 Chat/Communication features
- 🤖 Assistants/AI features
- ⚡ Workflows/Automation
- 🔌 Integrations
- 📚 Data Sources/Knowledge
- ⚙️ Settings/Configuration
- 📊 Analytics/Reports
- 🎓 Learning/Tutorials

---

## Content Guidelines

### Message Writing

1. **Tone**:
   - Friendly and encouraging
   - Professional but approachable
   - Use "you" and "your" (second person)
   - Active voice, present tense

2. **Length**:
   - Highlight messages: 50-100 words
   - Modal messages: 75-150 words
   - Navigation messages: 30-75 words
   - Each step should be digestible in 10-15 seconds

3. **Structure**:
   - Start with the key point
   - Use bullet points for lists
   - Use short paragraphs (2-3 sentences max)
   - Include "Tips" or "Note" sections for extra info

4. **Examples**:
   ✅ GOOD:
   ```
   Click the Send button or press Enter to send your message.

   Tip: Use Shift+Enter to add line breaks without sending.
   ```

   ❌ BAD:
   ```
   The Send button can be clicked, or alternatively, the Enter key may be pressed
   in order to transmit the message to the system for processing.
   ```

### Title Writing

1. **Keep Short**: 3-6 words maximum
2. **Be Specific**: Avoid generic titles like "Next Step"
3. **Use Title Case**: Capitalize Major Words
4. **Be Action-Oriented**: When possible, use verbs

Examples:
- ✅ "Create Your First Chat"
- ✅ "Browse Available Assistants"
- ✅ "Configure Data Source"
- ❌ "The Next Thing To Do"
- ❌ "Understanding the feature"

---

## Flow Planning Checklist

Before writing a flow, answer these questions:

### Scope & Audience
- [ ] Who is this flow for? (new users, advanced users, specific role)
- [ ] What prerequisite knowledge is required?
- [ ] What will users be able to do after completing this flow?
- [ ] How long should this flow take? (aim for 2-6 minutes)
- [ ] Should this flow appear in the HelpPanel popup on specific pages? If yes, set `triggers.helpPanelPages`. If it's a broad/general tour, omit or set to "None".
- [ ] Should this flow pop up automatically the first time a user visits a page? If yes, add `firstTimePopup: true` to the relevant entry in `triggers.helpPanelPages`.
- [ ] Should this flow appear in the FirstTimeUserPopup for new users? If yes, set `triggers.showOnWelcome: true`.
- [ ] Should this flow appear in the NewReleasePopup for a specific version? If yes, set `triggers.releaseVersions: ['x.y.z']`.

### Content Planning
- [ ] What are the 3-5 key concepts to teach?
- [ ] What UI elements need to be highlighted?
- [ ] What pages need to be visited?
- [ ] Are there any prerequisite conditions? (features enabled, data present)
- [ ] What code actions are needed to set up demonstrations?

### Flow Structure
- [ ] Does it start with a welcome modal?
- [ ] Are code execution steps used to set up environment?
- [ ] Do highlight steps have clear, descriptive targets?
- [ ] Is the progression logical and easy to follow?
- [ ] Does it end with completion modal + suggestions?
- [ ] Are conditional steps clearly marked?

### Quality Check
- [ ] Are all messages clear and concise?
- [ ] Are titles short and action-oriented?
- [ ] Are target descriptions unambiguous?
- [ ] Is the estimated duration accurate?
- [ ] Are suggestions for next flows relevant and helpful?

---

## Example Flow Templates

### Template 1: Feature Introduction Flow

```markdown
# [Feature Name] Introduction

**Name**: [Feature] Basics
**Description**: Learn the fundamentals of [feature] in CodeMie
**Target Audience**: New users
**Estimated Duration**: 3-4 minutes

---

## Step 1: Welcome

**Title**: Welcome to [Feature]
**Action Type**: Modal

**Message**:
```
Welcome message explaining what this flow covers and what users will learn.
```

---

## Tech Step: [Setup Action]

**Action Type**: Code Execution
**Code Action**: [Description of setup action]

---

## Step 2: [Main UI Element]

**Title**: [Element Title]
**Action Type**: Highlight
**Target**: [Descriptive target]

**Message**:
```
Explanation of the element and how to use it.
```

---

[Additional steps...]

---

## Step N: Completion

**Title**: You're All Set!
**Action Type**: Modal

**Completion Message**:
```
Congratulations message and summary of learnings.
```

**Next Steps Suggestions**:
[Suggested flows in standard format]
```

### Template 2: Task-Based Flow

```markdown
# [Task Name] Guide

**Name**: [Task] Step-by-Step
**Description**: Complete your first [task] in CodeMie
**Target Audience**: Users ready to [do task]
**Estimated Duration**: 4-5 minutes

---

## Step 1: Welcome

**Title**: Let's [Do Task]
**Action Type**: Modal

**Message**:
```
Introduction to the task and what will be accomplished.
```

---

## Tech Step: Navigate to [Page]

**Action Type**: Navigation
**Navigate To**: [Page name]

---

## Step 2: [First Action]

**Title**: [Action Title]
**Action Type**: Highlight
**Target**: [Element description]

**Message**:
```
Explanation of this step in the task.
```

---

[Continue through task steps...]

---

## Step N: Completion

**Title**: Task Complete!
**Action Type**: Modal

**Completion Message**:
```
Congratulations on completing [task].

You've learned:
✓ [Learning 1]
✓ [Learning 2]
✓ [Learning 3]
```

**Next Steps Suggestions**:
[Related task flows]
```

---

## Common Patterns

### Pattern 1: Menu Exploration
- Step 1: Welcome modal
- Tech Step: Expand menu (if needed) [Code Execution]
- Step 2: Menu overview [Highlight]
- Steps 3-N: Highlight each menu item [Highlight loop]
- Step N+1: Completion modal

### Pattern 2: Feature Creation
- Step 1: Welcome modal
- Tech Step: Navigate to creation page [Navigation]
- Step 2: Creation button [Highlight]
- Tech Step: Open creation form [Code Execution]
- Steps 3-N: Highlight each form field [Highlight loop]
- Step N+1: Submit/Create button [Highlight]
- Step N+2: Completion modal

### Pattern 3: Workflow Demonstration
- Step 1: Welcome modal
- Tech Step: Set up demo environment [Code Execution]
- Tech Step: Navigate to feature page [Navigation]
- Step 2: Start action button [Highlight]
- Tech Step: Perform action [Code Execution]
- Step 3: Result/outcome [Highlight]
- Step 4: Completion modal

---

## Validation Rules

Before finalizing a flow, verify:

### Structure
- ✅ `Triggers` section is present (either specific `helpPanelPages` / `showOnWelcome` values, or explicitly "None (Help page only)")
- ✅ Step 1 is Modal (welcome)
- ✅ Last step is Modal (completion with suggestions)
- ✅ Modal and Highlight steps use numbered format: "Step 1:", "Step 2:", etc.
- ✅ Code Execution and Navigation steps use "Tech Step:" format (no numbers)
- ✅ User-visible step numbers are sequential with no gaps
- ✅ Tech steps don't break the numbering sequence

### Action Types
- ✅ Each step has EXACTLY ONE action type (no combining)
- ✅ Modal and Highlight steps are numbered (Step 1, Step 2, etc.)
- ✅ Code Execution and Navigation steps use "Tech Step:" (no numbers)
- ✅ Code Execution and Navigation steps have NO message or title
- ✅ Modal and Highlight steps HAVE message and title
- ✅ Highlight steps have Target property
- ✅ Navigation steps have Navigate To property
- ✅ Modal steps have clear, formatted messages

### Content
- ✅ All titles are short (3-6 words)
- ✅ All messages are clear and concise
- ✅ Target descriptions are descriptive, not technical
- ✅ No CSS selectors or code in user-facing content
- ✅ Consistent tone throughout

### Conditional Logic
- ✅ Conditional steps clearly marked "(Conditional)"
- ✅ Conditions clearly described
- ✅ Multiple message variants included when needed
- ✅ Implementation notes added for complex conditions

### Completion
- ✅ Completion message summarizes learnings
- ✅ 3-4 next flow suggestions included
- ✅ Each suggestion has emoji, title, description, duration
- ✅ Suggestions are relevant to completed flow

---

## Anti-Patterns (Avoid These)

### ❌ Implementation Details
Don't include:
- CSS selectors: `[data-onboarding="element"]`
- Route paths: `/assistants` or `{ name: 'assistants' }`
- Function names: `toggleNavigation()`
- Technical IDs: `#nav-item-123`

### ❌ Vague Descriptions
Avoid:
- "The button" → Which button?
- "Click here" → Where?
- "This section" → Which section?
- "That area" → Be specific

### ❌ Over-Complicated Messages
Don't:
- Write paragraphs (use bullets)
- Use jargon without explanation
- Include multiple concepts per step
- Write passive voice sentences

### ❌ Inconsistent Formatting
Keep consistent:
- Message code blocks with triple backticks
- Title capitalization (Title Case)
- Step numbering (sequential, no gaps)
- Property order (Title, Action Type, other properties, Message)

---

## Reference: Standard Suggestions

### For Navigation Flow
1. 📱 Chat Interface & First Conversation
2. 🤖 Assistants Overview & Creation
3. 🔌 Connect Your First Integration
4. 📚 Add a Data Source

### For Chat Flow
1. 🤖 Creating Your First Assistant
2. 🔌 Connect Integrations for Enhanced Chats
3. ⚡ Automate Tasks with Workflows
4. 📚 Add Knowledge with Data Sources

### For Assistant Flow
1. 📱 Master the Chat Interface
2. 📚 Connect Data Sources to Assistants
3. ⚡ Use Assistants in Workflows
4. 🔌 Enable Integrations for Assistants

### For Integration Flow
1. 🤖 Create Assistants with Integration Access
2. ⚡ Build Workflows with Integrations
3. 📚 Connect Integrated Data Sources
4. 📊 Track Usage in Analytics

### For Data Source Flow
1. 🤖 Attach Data Sources to Assistants
2. 📱 Query Data Sources in Chats
3. ⚡ Use Data Sources in Workflows
4. 📊 Monitor Data Source Usage

---

**Remember**: Focus on user experience and learning outcomes, not technical implementation. Write for humans who are learning, not for machines that are executing.

---

**Last Updated**: 2026-03-24
**Version**: 1.4
