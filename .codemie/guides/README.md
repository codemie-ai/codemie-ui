# CodeMie UI Development Guides

> 📚 Comprehensive development guides for AI agents and developers

## Quick Start

1. Read the main [CLAUDE.md](../../CLAUDE.md) in the project root
2. Use the **intent-based Task Classifier** to identify which guides you need
3. Load P0 (required) guides first, then P1 (optional) if needed

---

## Guide Categories

### 🏗️ Architecture
- [Project Architecture](./architecture/project-architecture.md) - System layers, design decisions, data flow ✅
- [Routing Patterns](./architecture/routing-patterns.md) - React Router navigation, route params ✅

### 🧩 Components
- [Component Patterns](./components/component-patterns.md) - React component patterns and templates ✅
- [Reusable Components](./components/reusable-components.md) - Available components catalog ✅
- [Component Organization](./components/component-organization.md) - File structure and organization ✅

### 🔧 Patterns (5 guides)
- [Modal Patterns](./patterns/modal-patterns.md) - **CRITICAL** - Always use Popup ✅
- [Form Patterns](./patterns/form-patterns.md) - React Hook Form + Yup ✅
- [State Management](./patterns/state-management.md) - Valtio stores ✅
- [Custom Hooks](./patterns/custom-hooks.md) - Creating custom hooks ✅
- [Accessibility Patterns](./patterns/accessibility-patterns.md) - ARIA, keyboard nav ✅

### 🎨 Styling
- [Styling Guide](./styling/styling-guide.md) - **CRITICAL** - Tailwind CSS only ✅
- [Theme Management](./styling/theme-management.md) - Theme colors and customization ✅

### 💻 Development
- [API Integration](./development/api-integration.md) - **CRITICAL** - Fetch wrapper usage ✅
- [Code Organization](./development/code-organization.md) - File structure and best practices ✅
- [Refactoring Patterns](./development/refactoring-patterns.md) - Splitting large components ✅
- [Constants Usage](./development/constants-usage.md) - Extracting magic values ✅
- [Workflow Editor Patterns](./development/workflow-editor-patterns.md) - React Flow, visual editor ✅
- [Error Handling Patterns](./development/error-handling-patterns.md) - Boundaries, API, validation ✅
- [Performance Patterns](./development/performance-patterns.md) - Optimization strategies ✅

### ✅ Testing
- [Testing Patterns](./testing/testing-patterns.md) - Vitest + Testing Library ✅

---

## Critical Rules

Always remember these rules:

1. 🚨 **Tailwind Only** - No custom CSS, only Tailwind classes
2. 🚨 **Popup Component** - Never use Dialog directly, always use Popup
3. 🚨 **API Client** - Custom fetch wrapper, must call `.json()` on response
4. 🚨 **State Management** - Use Valtio stores for API calls, not components
5. 🚨 **Component Size** - Keep under 300 lines, extract if approaching

---

## Guide Status (All Complete)

| Category | Guides | Status |
|----------|--------|--------|
| **Architecture** | 2 guides | ✅ Complete |
| **Components** | 3 guides | ✅ Complete |
| **Patterns** | 5 guides | ✅ Complete |
| **Styling** | 3 guides | ✅ Complete |
| **Development** | 7 guides | ✅ Complete |
| **Testing** | 1 guide | ✅ Complete |
| **TOTAL** | **18 guides** | **✅ 100% Complete** |

---

## How to Use These Guides

### For AI Agents (Intent-Based Approach)

1. **Understand Intent** - What does the user want to accomplish?
2. **Map to Category** - Use Task Classifier in CLAUDE.md
3. **Load P0 Guide** - Required guide for that intent
4. **Apply Patterns** - Follow patterns from guide
5. **Validate** - Check against checklists before delivery

**Example**:
- User: "Create a form for adding assistants"
- Intent: Forms with validation
- Category: Forms
- P0 Guide: `patterns/form-patterns.md`
- P1 Guide: `components/component-patterns.md`

### For Developers

1. Start with [Project Architecture](./architecture/project-architecture.md) for system overview
2. Check [Component Patterns](./components/component-patterns.md) for component basics
3. Check [Reusable Components](./components/reusable-components.md) before creating new components
4. Follow [Styling Guide](./styling/styling-guide.md) for all styling
5. Use [Modal Patterns](./patterns/modal-patterns.md) for any modals/dialogs
6. Reference [State Management](./patterns/state-management.md) for global state
7. Use [Workflow Editor Patterns](./development/workflow-editor-patterns.md) for visual editor work

---

## Common Use Cases → Guide Mapping

| What You Want to Do | P0 Guide | P1 Guide |
|---------------------|----------|----------|
| Create new component | `components/component-patterns.md` | `components/reusable-components.md` |
| Add form with validation | `patterns/form-patterns.md` | `components/component-patterns.md` |
| Show modal/dialog | `patterns/modal-patterns.md` | - |
| Manage global state | `patterns/state-management.md` | `development/api-integration.md` |
| Call API | `development/api-integration.md` | `patterns/state-management.md` |
| Style component | `styling/styling-guide.md` |
| Add navigation | `architecture/routing-patterns.md` | - |
| Edit workflows | `development/workflow-editor-patterns.md` | - |
| Handle errors | `development/error-handling-patterns.md` | `patterns/form-patterns.md` |
| Extract constants | `development/constants-usage.md` | - |
| Create custom hook | `patterns/custom-hooks.md` | - |
| Refactor large component | `development/refactoring-patterns.md` | `components/component-organization.md` |
| Make accessible | `patterns/accessibility-patterns.md` | - |
| Optimize performance | `development/performance-patterns.md` | - |

---

## Contributing to Guides

When adding new patterns:

1. Create guide in appropriate category folder
2. Follow existing guide structure (Table of Contents, sections, examples)
3. Include code examples (good vs bad with ✅/❌)
4. Keep guides 200-400 lines maximum
5. Add cross-references to related guides
6. Update this README
7. Update CLAUDE.md Task Classifier

---

## Changelog

### 2026-02-03 - Major Update
- ✅ Added 6 new guides (Architecture, Workflow Editor, Error Handling, Constants, Responsive Design)
- ✅ All 18 guides now complete
- ✅ Switched to intent-based classification (from keyword-based)
- ✅ Added use case mapping table
- ✅ Updated all guide cross-references

### 2025-12-04 - Initial Release
- ✅ Created 12 initial guides
- ✅ Established guide structure and patterns

---

**Last Updated**: 2026-02-03
**Total Guides**: 18
**Status**: 100% Complete
