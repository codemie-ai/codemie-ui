# CLAUDE.md

**Purpose**: AI-optimized execution guide for Claude Code agents working with the CodeMie UI codebase

---

## ⚡ INSTANT START (Read First)

### 1. Critical Rules (MANDATORY - Always Check)

| Rule | Trigger | Action Required |
|------|---------|-----------------|
| 🚨 **Tailwind Only** | ANY styling task | ONLY use Tailwind classes → [Styling Guide](#styling-guide) |
| 🚨 **Popup Component** | Modal/dialog task | NEVER use Dialog directly → [Modal Patterns](#modal-patterns) |
| 🚨 **API Client** | API call task | Use fetch wrapper (NOT Axios) → [API Integration](#api-integration) |
| 🚨 **State Management** | Global state task | Use Valtio stores → [State Management](#state-management) |
| 🚨 **Code Review** | "do code review" request | Invoke skill directly → `Skill("code-reviewer")` — skill collects context itself |
| 🚨 **Onboarding Guide** | ANY change to onboarding types, store, flows, or UI entry points | Update `.codemie/onboarding-flows/FLOW-CREATION-GUIDE.md` to reflect the change |

**Emergency Recovery**: If imports fail → Check [Troubleshooting](#-troubleshooting-quick-reference)

### 2. Task Classifier (What am I doing?)

**Understand user intent → Map to category → Load guides → Execute**

**Match user's intent/goal to category, then load corresponding guides:**

| Category | User Intent / Purpose | Example Requests | P0 Guide (Required) | P1 Guide (Optional) |
|----------|----------------------|------------------|---------------------|---------------------|
| **Architecture** | System structure, feature planning, design decisions | "How should I structure...?", "Where should this go?", "Plan new feature" | `architecture/project-architecture.md` | `architecture/routing-patterns.md` |
| **UI Components** | Creating/modifying components, UI elements | "Create component", "Add button", "Build card" | `components/component-patterns.md` | `components/reusable-components.md` |
| **Forms** | Forms with validation, input handling | "Create form", "Add validation", "Handle input" | `patterns/form-patterns.md` | `components/component-patterns.md` |
| **Modals/Dialogs** | Modal windows, popups, dialogs | "Show modal", "Create popup", "Add dialog" | `patterns/modal-patterns.md` | `components/component-patterns.md` |
| **State** | Global state, data management | "Manage state", "Store data", "Share data between components" | `patterns/state-management.md` | `development/api-integration.md` |
| **API/Backend** | API calls, backend integration | "Fetch data", "Call API", "Save to server" | `development/api-integration.md` | `patterns/state-management.md` |
| **Styling** | CSS, styling, theming | "Style component", "Change colors" | `styling/styling-guide.md` | `styling/theme-management.md` |
| **Routing** | Navigation, routes, links | "Add route", "Navigate to", "Create link" | `architecture/routing-patterns.md` | `patterns/state-management.md` |
| **Workflows** | Visual workflow editor, React Flow | "Edit workflow", "Add node", "Connect states" | `development/workflow-editor-patterns.md` | `patterns/state-management.md` |
| **Onboarding** | Onboarding flows, types, store, UI entry points | "Add onboarding flow", "Change triggers", "Add welcome step" | `.codemie/onboarding-flows/FLOW-CREATION-GUIDE.md` | `src/types/onboarding.ts` |
| **Errors** | Error handling, validation, error states | "Handle errors", "Show error", "Validate input" | `development/error-handling-patterns.md` | `patterns/form-patterns.md` |
| **Constants** | Extract magic values, configuration | "Remove magic numbers", "Extract constants" | `development/constants-usage.md` | `development/code-organization.md` |
| **Custom Hooks** | Extract logic, create reusable hooks | "Create hook", "Extract logic", "Reuse code" | `patterns/custom-hooks.md` | `components/component-patterns.md` |
| **Refactoring** | Split components, clean up code | "Split component", "Refactor", "Clean up" | `development/refactoring-patterns.md` | `components/component-organization.md` |
| **Accessibility** | ARIA, keyboard nav, screen readers | "Make accessible", "Add ARIA", "Keyboard support" | `patterns/accessibility-patterns.md` | `components/component-patterns.md` |
| **Performance** | Optimization, memoization, lazy loading | "Optimize", "Speed up", "Reduce re-renders" | `development/performance-patterns.md` | `patterns/custom-hooks.md` |
| **Testing** | Write tests, fix tests | "Test component", "Write test", "Fix failing test" | `testing/testing-patterns.md` | `components/component-patterns.md` |
| **Code Review** | AI code review with verifiable commit markers | "Do code review", "Review my changes", "Run code reviewer" | `.claude/agents/code-reviewer.md` | N/A |

**Guide Path**: All guides in `.codemie/guides/<category>/` (Code Review: `.claude/skills/code-reviewer/SKILL.md`)

**How to Use**:
1. Read user's request and understand **what they want to accomplish** (intent)
2. Map intent to category above
3. Load P0 guide (required for that intent)
4. If still unclear, load P1 guide (optional)
5. Apply patterns from guides

**Complexity Guide**:
- **Simple**: 1-2 files, < 5 min, obvious pattern → Use direct tools (Read/Edit)
- **Medium**: 2-5 files, 5-15 min, standard patterns → Use guides + direct tools
- **High**: 6+ files, 15+ min, architectural decisions → Consider EnterPlanMode

### 3. Self-Check Before Starting

Before any action:
- [ ] Which critical rules apply? (styling/modal/api/state)
- [ ] What keywords did I identify?
- [ ] What's the complexity level?
- [ ] Which guides do I need to load (P0 first)?
- [ ] Am I 80%+ confident about approach?

**Decision Gates**:
- ❌ **NO to any above** → ASK USER or READ MORE before proceeding
- ❌ **Confidence < 80%** → Load P0 guides, then re-assess
- ✅ **YES to all + Confidence 80%+** → Proceed to execution

---

## 🔄 EXECUTION WORKFLOW (Step-by-Step)

Follow this sequence for every task:

```
START
  │
  ├─> STEP 1: Parse Request
  │   ├─ Identify task keywords (see Task Classifier above)
  │   ├─ Check which Critical Rules apply
  │   ├─ Assess complexity level
  │   └─ Gate: Can I identify 1+ relevant guides? NO → Ask user | YES → Continue
  │
  ├─> STEP 2: Confidence Check
  │   ├─ Am I 80%+ confident about approach?
  │   ├─ YES → Continue | NO → Load P0 guides
  │   └─ Gate: After reading, confidence 80%+? NO → Load P1 guides or ask user | YES → Continue
  │
  ├─> STEP 3: Load Documentation (Selective, Not Everything)
  │   ├─ Load P0 guides from Task Classifier (REQUIRED for Medium/High complexity)
  │   ├─ Scan P1 guides - load only if confidence still < 80% (OPTIONAL)
  │   └─ Gate: Do I have enough context? NO → Load more or ask user | YES → Continue
  │
  ├─> STEP 4: Pattern Match (Use Quick References)
  │   ├─ Check Pattern Tables below (components, styling, state)
  │   ├─ Check Common Pitfalls table
  │   └─ Gate: Do I know the correct pattern? NO → Read guide detail | YES → Continue
  │
  ├─> STEP 5: Execute (Apply Patterns)
  │   ├─ Apply patterns from loaded guides
  │   ├─ Follow Critical Rules (tailwind/popup/api/state)
  │   ├─ Track progress with success indicators
  │   └─ Cross-check with Quick Validation (below)
  │
  └─> STEP 6: Validate (Before Delivery)
      ├─ Run through Quick Validation checklist
      ├─ Check Success Indicators
      ├─ Gate: All checks pass? NO → Fix issues | YES → Deliver
      └─ END
```

### Success Indicators (Am I on track?)

| Stage | Good Signs | Warning Signs |
|-------|-----------|---------------|
| **Parse Request** | Keywords match Task Classifier | No matching keywords → ask user |
| **Confidence Check** | 80%+ confident after reading | Still confused after P0 guides → need clarification |
| **Load Docs** | Patterns clear, examples match task | Multiple conflicting patterns → ask user preference |
| **Pattern Match** | Found exact pattern in quick ref | No matching pattern → read full guide |
| **Execute** | Code compiles, follows patterns | Errors, missing imports → check guide again |
| **Validate** | All checks pass, tests work | Any check fails → fix before delivery |

### Quick Validation (Run Before Delivery)

| Priority | Check | How to Verify | Fix If Failed |
|----------|-------|---------------|---------------|
| 🚨 | **Functionality** | Does it meet user request? | Re-read requirements |
| 🚨 | **Critical Rules** | Did I follow styling/modal/api/state rules? | Review policies below |
| 🚨 | **Tailwind Only** | No custom CSS? Only defined colors? | See [Styling Guide](#styling-guide) |
| 🚨 | **Component Size** | Under 300 lines? | See [Refactoring Patterns](#refactoring-patterns) |
| 🚨 | **Type Safety** | All TypeScript types defined? | Add interfaces/types |
| ⚠️ | **State Management** | Using Valtio stores? Not direct API calls? | See [State Management](#state-management) |
| ⚠️ | **Accessibility** | ARIA labels? Keyboard nav? | See [Accessibility Guide](#accessibility) |
| ✅ | **Code Quality** | No magic strings? Using constants? | Extract to constants files |
| ✅ | **Cleanup** | Debounced functions cleaned up? | Add cleanup in useEffect |

---

## 📊 PATTERN QUICK REFERENCE

### Component Patterns (Use These)

| Pattern | When to Use | Import From | Guide Reference |
|---------|-------------|-------------|-----------------|
| Basic Functional Component | New component | `React` | [Component Patterns](./.codemie/guides/components/component-patterns.md) |
| Form Component | Forms with validation | `react-hook-form`, `yup` | [Form Patterns](./.codemie/guides/patterns/form-patterns.md) |
| Modal/Popup | Any dialog/modal | `@/components/Popup` | [Modal Patterns](./.codemie/guides/patterns/modal-patterns.md) |
| Custom Hook | Extract complex logic | Create in `@/hooks/` | [Custom Hooks](./.codemie/guides/patterns/custom-hooks.md) |

**Detail**: See individual guide files in `.codemie/guides/`

### Styling Patterns (MANDATORY)

| ✅ DO | ❌ DON'T | Why | Guide |
|-------|----------|-----|-------|
| Use Tailwind classes only | Custom CSS, inline styles | Project standard | [Styling Guide](./.codemie/guides/styling/styling-guide.md) |
| Use defined colors | Arbitrary hex values | Theme consistency | [Theme Colors](./.codemie/guides/styling/theme-management.md) |
| Use `cn()` utility | Manual className concatenation | Cleaner code | [Styling Guide](./.codemie/guides/styling/styling-guide.md#cn-utility) |
| Predefined spacing scale | Arbitrary values like `p-[18px]` | Consistency | [Styling Guide](./.codemie/guides/styling/styling-guide.md#spacing) |

**Detail**: `.codemie/guides/styling/styling-guide.md`

### State Management Patterns (Core Rules)

| Layer | Responsibility | Example Path | Guide |
|-------|----------------|--------------|-------|
| **Component** | UI rendering, local state | `src/components/` | [Component Patterns](./.codemie/guides/components/component-patterns.md) |
| **Store** | Global state, API calls | `src/store/` | [State Management](./.codemie/guides/patterns/state-management.md) |
| **Hook** | Complex logic extraction | `src/hooks/` | [Custom Hooks](./.codemie/guides/patterns/custom-hooks.md) |

**Flow**: `Component → Store → API` (Never skip layers)

**Detail**: `.codemie/guides/patterns/state-management.md`

### API Integration (CRITICAL)

| Rule | Implementation | Guide |
|------|----------------|-------|
| Use custom fetch wrapper | `import api from '@/utils/api'` | [API Integration](./.codemie/guides/development/api-integration.md) |
| Call `.json()` on response | `const data = await response.json()` | [API Integration](./.codemie/guides/development/api-integration.md#response-pattern) |
| API calls in stores only | Never in components directly | [State Management](./.codemie/guides/patterns/state-management.md) |
| Handle loading/error states | Always include in store | [State Management](./.codemie/guides/patterns/state-management.md#best-practices) |

**Detail**: `.codemie/guides/development/api-integration.md`

### Common Pitfalls (Avoid These)

| Category | 🚨 Never Do This | ✅ Do This Instead | Guide Reference |
|----------|------------------|---------------------|-----------------|
| **Modals** | Import `Dialog` from PrimeReact | Use `Popup` component | [Modal Patterns](./.codemie/guides/patterns/modal-patterns.md) |
| **Styling** | Custom CSS, inline styles | Tailwind classes only | [Styling Guide](./.codemie/guides/styling/styling-guide.md) |
| **API** | Use `.data` (Axios pattern) | Call `.json()` on response | [API Integration](./.codemie/guides/development/api-integration.md) |
| **State** | Direct API calls in components | Use Valtio stores | [State Management](./.codemie/guides/patterns/state-management.md) |
| **Forms** | Manual validation | React Hook Form + Yup | [Form Patterns](./.codemie/guides/patterns/form-patterns.md) |
| **Constants** | Magic strings/numbers | Extract to constants files | [Code Organization](./.codemie/guides/development/code-organization.md) |
| **Cleanup** | Forget to cleanup debounced functions | Always cleanup in useEffect | [Custom Hooks](./.codemie/guides/patterns/custom-hooks.md#cleanup) |
| **Defaults** | Use `||` for default values | Use `??` (nullish coalescing) | [Code Organization](./.codemie/guides/development/code-organization.md#nullish-coalescing) |
| **Component Size** | Components over 300 lines | Extract to sub-components/hooks | [Refactoring Patterns](./.codemie/guides/development/refactoring-patterns.md) |
| **String Quotes** | Double quotes `"string"` | Single quotes `'string'` | ESLint rule (auto-fixable) |

---

## 🏗️ PROJECT CONTEXT

### Project Overview

**CodeMie UI** is an AI-powered assistant platform built with modern web technologies using React and TypeScript.

### Key Information
- **Project Name**: codemie-ui-next
- **Version**: 0.4.6
- **Development Server**: `npm run dev`
- **Build**: `npm run build`
- **Test**: `npm test` / `npm run test-react`
- **Branching Model**: Trunk-based development (PRs to `main`)
- **Branch Pattern**: `EPMCDME-XX_short-description`
- **Commit Pattern**: `EPMCDME-XX: Capital sentence` — enforced by Tekton CI (blocks pipeline on violation)
  - Full regex: `^((EPMCDME)-(?!0+)\d+:\s[A-Z][a-z]*.*|Generate release notes for version \d+\.\d+\.\d+|Revert "(EPMCDME)-(?!0+)\d+:\s[A-Z][a-z]*.*")$`
  - ✅ Valid: `EPMCDME-123: Fix authentication bug`
  - ❌ Invalid: `EPMCDME-123: fix bug` (lowercase), `EPMCDME-0: Fix bug` (zero ID), `feat: add feature` (wrong format)

---

## Architecture & Technology Stack

### Core Technologies
- **Build Tool**: Vite 5.x
- **Frontend Framework**: React 18.3.x
- **Language**: TypeScript 5.4.x
- **Styling**:
    - Tailwind CSS 3.4.x (primary)
    - SCSS (minimal usage for specific cases)
    - TailwindCSS Themer (for theme management)
- **UI Library**: PrimeReact 10.9.x
- **State Management**: Valtio 2.1.x
- **Form Handling**: React Hook Form 7.x + Yup
- **Testing**: Vitest + React Testing Library
- **HTTP Client**: Custom fetch wrapper (not Axios)
- **Routing**: React Router 6.x

### Module Federation
- **Plugin**: `@originjs/vite-plugin-federation`
- **Purpose**: Micro-frontend architecture support
- **Remote Applications**: Can integrate external micro-frontends

---

## Technology Migration Status

### **React-Only Codebase**

> ✅ **The Vue.js to React migration has been completed. All code is now React-based.**

The project has successfully migrated from Vue.js to React. All components, pages, and functionality are now implemented using React 18.3.x and TypeScript.

### Current Architecture
- **All Components**: React functional components with TypeScript
- **All Pages**: React-based routing with React Router 6.x
- **State Management**: Valtio for global state
- **Form Handling**: React Hook Form + Yup validation
- **Styling**: Tailwind CSS exclusively

---

## Project Structure

```
codemie-ui-next/
├── .codemie/                      # CodeMie configuration
│   ├── guides/                    # 📚 Development guides (YOU ARE HERE)
│   │   ├── components/            # Component-related guides
│   │   ├── patterns/              # Design patterns guides
│   │   ├── styling/               # Styling guides
│   │   ├── development/           # Development practices
│   │   ├── testing/               # Testing guides
│   │   └── architecture/          # Architecture guides
│   ├── reviews/                   # 🔒 Local code review specs (gitignored)
│   └── virtual_assistants/        # AI assistant definitions (.yaml)
├── src/
│   ├── components/               # ⭐ Global React components
│   │   ├── Button/              # Reusable UI components
│   │   ├── form/                # Form input components
│   │   ├── Layout/              # Layout components
│   │   ├── Popup/               # Modal/dialog components
│   │   └── ...                  # Other shared components
│   ├── pages/                   # ⭐ Application pages (route components)
│   │   ├── assistants/          # Assistant management pages
│   │   ├── chat/                # Chat interface pages
│   │   ├── workflows/           # Workflow editor pages
│   │   ├── dataSources/         # Data source pages
│   │   ├── integrations/        # Integration pages
│   │   ├── settings/            # Settings pages
│   │   └── ...
│   ├── hooks/                   # Custom React hooks
│   ├── store/                   # Valtio state management
│   ├── utils/                   # Utility functions
│   ├── types/                   # TypeScript type definitions
│   ├── constants/               # Application constants
│   ├── assets/                  # Static assets
│   ├── styles/                  # Global styles
│   ├── App.tsx                  # Root application component
│   ├── main.tsx                 # Application entry point
│   └── router.tsx               # React Router configuration
├── tailwind.config.ts           # Tailwind CSS configuration
├── vite.config.js               # Vite build configuration
├── .eslintrc.cjs                # ESLint rules
├── tsconfig.json                # TypeScript configuration
└── package.json                 # Dependencies and scripts
```

---

## 🛠️ DEVELOPMENT COMMANDS

### Common Commands

| Task | Command | Notes |
|------|---------|-------|
| **Dev Server** | `npm run dev` | Start development server (port 5173) |
| **Build** | `npm run build` | Production build |
| **Preview** | `npm run preview` | Preview production build |
| **Test** ⚠️ | `npm test` | Run all tests |
| **Test Watch** | `npm test -- --watch` | Run tests in watch mode |
| **Lint** | `npm run lint` | Check code quality |
| **Lint + Fix** | `npm run lint:fix` | Fix auto-fixable issues |
| **Format** | `npm run format` | Format code with Prettier |

**API Docs**: http://localhost:5173 (after server starts)

---

## 📖 GUIDE DIRECTORY

All guides located in `.codemie/guides/<category>/`

### Architecture
- `architecture/project-architecture.md` - System architecture, layers, design decisions ✅
- `architecture/routing-patterns.md` - React Router patterns, navigation, route params ✅

### Components
- `components/component-patterns.md` - React component patterns and templates ✅
- `components/reusable-components.md` - Available reusable components catalog ✅
- `components/component-organization.md` - File structure and organization ✅

### Patterns
- `patterns/modal-patterns.md` - Modal/popup patterns (CRITICAL - always use Popup) ✅
- `patterns/form-patterns.md` - Form handling with React Hook Form ✅
- `patterns/state-management.md` - Valtio state management patterns ✅
- `patterns/custom-hooks.md` - Custom hooks creation and best practices ✅
- `patterns/accessibility-patterns.md` - ARIA, keyboard navigation, screen readers ✅

### Styling
- `styling/styling-guide.md` - Tailwind CSS styling (MANDATORY reading) ✅
- `styling/theme-management.md` - Theme colors and customization ✅

### Development
- `development/api-integration.md` - API client usage (fetch wrapper) ✅
- `development/code-organization.md` - Code organization and best practices ✅
- `development/refactoring-patterns.md` - Refactoring large components ✅
- `development/constants-usage.md` - Constants extraction and usage ✅
- `development/workflow-editor-patterns.md` - Visual workflow editor with React Flow ✅
- `development/error-handling-patterns.md` - Error boundaries, API errors, validation ✅
- `development/performance-patterns.md` - Performance optimization strategies ✅

### Testing
- `testing/testing-patterns.md` - Vitest + Testing Library patterns ✅

### Onboarding
- `.codemie/onboarding-flows/FLOW-CREATION-GUIDE.md` - Flow creation guide, triggers (`helpPanelPageIds`, `showOnWelcome`), step types, and content rules ✅
- `src/types/onboarding.ts` - `OnboardingFlow`, `OnboardingFlowTriggers`, step type definitions
- `src/store/onboarding.ts` - Flow registry, `getFlowsForPage`, `getFlowsForWelcome`
- `src/config/onboarding/flows/` - Individual flow implementations

> 🚨 **Keep the guide in sync**: Any change to `OnboardingFlow`, `OnboardingFlowTriggers`, the store's lookup methods, or UI entry points (HelpPanel, FirstTimeUserPopup) **must** be reflected in `FLOW-CREATION-GUIDE.md`.

---

## 🎯 REMEMBER

### Critical Workflow
1. ⚡ Read [Instant Start](#-instant-start-read-first) (60 seconds)
2. ✅ Run [Self-Check](#3-self-check-before-starting) (check confidence level)
3. 🔄 Follow [Execution Workflow](#-execution-workflow-step-by-step) (step-by-step with gates)
4. 📊 Use [Pattern Quick Reference](#-pattern-quick-reference) (fast lookups)
5. 🔍 Track [Success Indicators](#success-indicators-am-i-on-track) (am I on track?)
6. ✅ [Validate before delivery](#quick-validation-run-before-delivery) (all checks must pass)

### Critical Rules (Check EVERY Time)
- 🚨 **Tailwind Only**: No custom CSS, only Tailwind classes
- 🚨 **Popup Component**: Never use Dialog directly
- 🚨 **API Client**: Custom fetch wrapper, not Axios
- 🚨 **State Management**: Use Valtio stores for global state
- 🚨 **Component Size**: Keep under 300 lines, extract if approaching

### Decision Making Framework
1. **Parse**: Use Task Classifier to identify keywords → guides → complexity
2. **Confidence**: Am I 80%+ confident? NO → Load P0 guides
3. **Load**: P0 (required) first, then P1 (optional) only if needed
4. **Execute**: Apply patterns, follow critical rules, track success indicators
5. **Validate**: All checks must pass before delivery
6. **Stuck?**: Check [Troubleshooting](#-troubleshooting-quick-reference), load more guides, or ask user

### Quality Standards (Non-Negotiable)
- No custom CSS or inline styles (Tailwind only)
- No placeholders/TODOs in delivered code
- Always use Popup component for modals (never Dialog)
- API calls must use `.json()` to parse response
- State management through Valtio stores
- Forms must use React Hook Form + Yup
- Type hints on all functions
- Extract all magic strings/numbers to constants
- Components under 300 lines
- Cleanup debounced functions in useEffect
- **String Quotes**: Always use single quotes for strings (enforced by ESLint)

### When to Ask User
- **Ambiguous requirements**: Multiple valid approaches possible
- **Low confidence**: < 80% after reading P0+P1 guides
- **Missing information**: Need clarification on scope/approach
- **High complexity**: Task involves architectural decisions

### Confidence Calibration
- **90%+ confident**: Proceed with execution, minimal guide lookup
- **80-89% confident**: Review quick reference tables, proceed
- **70-79% confident**: Load P0 guides, then re-assess
- **< 70% confident**: Load P0+P1 guides, ask user if still unclear

**Production Ready**: Deliver complete, tested, accessible solutions without shortcuts.

**Questions?** Always better to ask than assume - ask for clarification when unsure.

---

## 🔧 TROUBLESHOOTING QUICK REFERENCE

### Common Issues & Fixes

| Symptom | Likely Cause | Fix | Prevention |
|---------|--------------|-----|------------|
| Module not found | Incorrect import path | Check import aliases (@/) | Use correct aliases |
| Styles not applying | Not using Tailwind classes | Convert to Tailwind | Always use Tailwind |
| Store not updating | Not using `useSnapshot` | Wrap with `useSnapshot()` | Follow state patterns |
| Form validation not working | Missing Yup schema | Add validation schema | Use React Hook Form |
| Modal not showing | Not using Popup component | Replace Dialog with Popup | Always use Popup |
| API response undefined | Using `.data` instead of `.json()` | Call `.json()` on response | Read API guide |

### Diagnostic Steps

| Need to Check | Action | What to Look For |
|---------------|--------|------------------|
| Component patterns | Read `component-patterns.md` | Correct component structure |
| Styling approach | Read `styling-guide.md` | Tailwind classes only |
| State management | Read `state-management.md` | Valtio store usage |
| Modal implementation | Read `modal-patterns.md` | Using Popup component |
| API integration | Read `api-integration.md` | Using `.json()` on response |

---

**Last Updated**: 2026-02-03
**Version**: 0.4.6

---

## 📋 CHANGELOG

### 2026-02-03 - Major Documentation Update
- ✅ Added intent-based Task Classifier (replaces keyword-based)
- ✅ Added Architecture guides (project-architecture, routing-patterns)
- ✅ Added Workflow Editor guide (React Flow patterns)
- ✅ Added Error Handling guide (boundaries, API, validation)
- ✅ Added Constants Usage guide (extraction, organization)
- ✅ Added Responsive Design guide (Tailwind responsive patterns)
- ✅ Updated guide directory with all 18 guides
- ✅ Improved task routing based on user intent vs keywords
