# Project Architecture

> **CodeMie UI system architecture and design decisions**

## Table of Contents
1. [Overview](#overview)
2. [Architecture Layers](#architecture-layers)
3. [Data Flow](#data-flow)
4. [Key Design Decisions](#key-design-decisions)
5. [Feature Organization](#feature-organization)
6. [Module Federation](#module-federation)

---

## Overview

CodeMie UI is a React-based AI assistant platform with a micro-frontend architecture.

### Core Principles

- **Component-Driven**: Reusable UI components
- **State Management**: Centralized Valtio stores
- **Type Safety**: TypeScript throughout
- **Styling**: Tailwind CSS exclusively
- **Testing**: Vitest + React Testing Library

---

## Architecture Layers

### 1. Presentation Layer (`src/pages/`, `src/components/`)

**Purpose**: UI rendering and user interaction

- **Pages**: Route-level components (one per route)
- **Components**: Reusable UI components
- **Responsibilities**:
  - Render UI using Tailwind classes
  - Handle user input
  - Display data from stores
  - Local UI state only

**Example**:
```typescript
// src/pages/assistants/AssistantsListPage.tsx
function AssistantsListPage() {
  const { assistants, loading } = useSnapshot(assistantsStore)

  useEffect(() => {
    assistantsStore.fetchAssistants()
  }, [])

  return <AssistantList assistants={assistants} loading={loading} />
}
```

---

### 2. State Management Layer (`src/store/`)

**Purpose**: Global state and business logic

- **Stores**: Valtio proxies for each domain
- **Responsibilities**:
  - Manage application state
  - Handle API calls
  - Transform API data
  - Coordinate multiple data sources

**Example**:
```typescript
// src/store/assistants.ts
export const assistantsStore = proxy({
  assistants: [],
  loading: false,

  async fetchAssistants() {
    this.loading = true
    const response = await api.get('assistants')
    this.assistants = await response.json()
    this.loading = false
  }
})
```

---

### 3. Integration Layer (`src/utils/api.ts`)

**Purpose**: External system communication

- **API Client**: Custom fetch wrapper
- **Responsibilities**:
  - HTTP communication
  - Request/response handling
  - Error handling
  - Authentication headers

**Example**:
```typescript
// src/utils/api.ts
const api = {
  async get(endpoint: string) {
    return fetch(`${API_BASE}/${endpoint}`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  }
}
```

---

### 4. Utility Layer (`src/utils/`, `src/hooks/`)

**Purpose**: Shared logic and helpers

- **Utils**: Pure functions, helpers
- **Hooks**: Reusable React logic
- **Responsibilities**:
  - Data transformations
  - Validation logic
  - Custom React hooks
  - Shared utilities

---

## Data Flow

### Standard Flow (Component → Store → API)

```
User Action
    ↓
Component (onClick handler)
    ↓
Store Method (async function)
    ↓
API Call (fetch wrapper)
    ↓
Backend API
    ↓
Response Data
    ↓
Store State Update
    ↓
Component Re-render (via useSnapshot)
```

### Example Implementation

```typescript
// 1. Component - User triggers action
function CreateAssistantButton() {
  const navigate = useNavigate()

  const handleCreate = async () => {
    const id = await assistantsStore.createAssistant(formData)
    navigate(`/assistants/${id}`)
  }

  return <Button onClick={handleCreate}>Create</Button>
}

// 2. Store - Business logic and API call
async createAssistant(data: AssistantData) {
  this.loading = true
  try {
    const response = await api.post('assistants', data)
    const newAssistant = await response.json()
    this.assistants.push(newAssistant)
    return newAssistant.id
  } finally {
    this.loading = false
  }
}

// 3. API Client - HTTP communication
async post(endpoint: string, data: any) {
  return fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify(data)
  })
}
```

---

## Key Design Decisions

### 1. Valtio for State Management

**Why**: Simple, minimal API, automatic reactivity

```typescript
// Define store
const store = proxy({ count: 0 })

// Use in component (automatically tracks changes)
const { count } = useSnapshot(store)

// Update state (triggers re-render)
store.count++
```

### 2. Tailwind CSS Only

**Why**: Consistency, maintainability, theme support

- No custom CSS files
- Theme-based colors only
- Utility-first approach

### 3. Custom Fetch Wrapper (Not Axios)

**Why**: Simpler, smaller bundle, native browser API

```typescript
// ✅ Custom wrapper
const response = await api.get('endpoint')
const data = await response.json()

// ❌ Not Axios
const { data } = await axios.get('endpoint')
```

### 4. Component-Scoped Files

**Why**: Colocation, easier refactoring

```
AssistantForm/
├── AssistantForm.tsx       # Main component
├── components/             # Sub-components
│   ├── FormSection.tsx
│   └── SystemPrompt/       # Nested feature
│       └── ...
├── utils/                  # Component utilities
└── __tests__/              # Component tests
```

---

## Feature Organization

### Feature Structure

Each major feature has consistent organization:

```
src/pages/[feature]/
├── [Feature]Page.tsx          # Main page component
├── [Feature]ListPage.tsx      # List view
├── [Feature]DetailsPage.tsx   # Detail view
├── New[Feature]Page.tsx       # Create form
├── Edit[Feature]Page.tsx      # Edit form
├── components/                # Feature components
│   ├── [Feature]Form/
│   ├── [Feature]List/
│   └── [Feature]Details/
├── utils/                     # Feature utilities
└── __tests__/                 # Feature tests
```

### Example: Assistants Feature

```
src/pages/assistants/
├── AssistantsListPage.tsx
├── AssistantDetailsPage.tsx
├── NewAssistantPage.tsx
├── EditAssistantPage.tsx
├── components/
│   ├── AssistantForm/
│   ├── AssistantList/
│   └── AssistantDetails/
└── utils/
    └── getAssistantLink.tsx
```

---

## Module Federation

### Purpose

Enable micro-frontend architecture for external applications.

### Configuration

```javascript
// vite.config.js
federation({
  name: 'codemie-ui',
  remotes: {
    // External micro-frontends can be loaded here
  },
  shared: ['react', 'react-dom', 'react-router']
})
```

### Integration Points

```typescript
// src/pages/applications/ApplicationFederationPage.tsx
// Loads external React apps dynamically
<RemoteApp name="external-app" module="./App" />
```

---

## Workflow Editor Architecture

### Special Case: Visual Editor

The workflow editor is a complex feature with specialized architecture:

```
src/pages/workflows/
├── EditWorkflowPage.tsx          # Editor page
├── components/
│   ├── WorkflowCanvas/           # React Flow canvas
│   ├── NodeTypes/                # Custom node components
│   └── Toolbar/                  # Editor controls
└── utils/
    └── workflowEditor/           # Editor logic
        ├── actions/              # State mutations
        │   ├── nodes/
        │   ├── connections/
        │   └── states/
        ├── build/                # Graph construction
        ├── serialization/        # Save/load
        └── helpers/              # Utilities
```

**Pattern**: Complex editor logic is extracted to `utils/workflowEditor/` to keep components focused on rendering.

---

## Cross-Cutting Concerns

### Error Handling

```typescript
// Store level - Catch and store errors
async fetchData() {
  try {
    const response = await api.get('endpoint')
    this.data = await response.json()
  } catch (error) {
    this.error = error.message
    toaster.error('Failed to fetch data')
  }
}

// Component level - Display error state
if (error) {
  return <ErrorMessage message={error} />
}
```

### Loading States

```typescript
// Store provides loading state
this.loading = true
await apiCall()
this.loading = false

// Component shows spinner
if (loading) {
  return <Spinner />
}
```

### Authentication

```typescript
// src/store/user.ts
export const userStore = proxy({
  user: null,
  isAuthenticated: false,

  async login(credentials) {
    const response = await api.post('auth/login', credentials)
    const data = await response.json()
    this.user = data.user
    this.isAuthenticated = true
    localStorage.setItem('token', data.token)
  }
})
```

---

## Best Practices

### Layer Responsibilities

| Layer | Handles | Doesn't Handle |
|-------|---------|----------------|
| **Component** | Rendering, user events, local UI state | API calls, business logic, data transformation |
| **Store** | Global state, API calls, business logic | UI rendering, routing, local UI state |
| **API** | HTTP communication, headers | State management, data transformation |
| **Utils** | Pure functions, calculations | State mutations, side effects |

### When to Extract Logic

| Pattern | When to Extract | Where to Extract |
|---------|----------------|------------------|
| Component > 300 lines | Always | Sub-components |
| Complex calculations | > 20 lines | Utils function |
| Reusable logic | Used in 2+ places | Custom hook |
| Complex editor logic | > 100 lines | Utils directory |
| Business rules | Domain-specific | Store methods |

---

## Technology Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Build Tool | Vite | 5.x |
| Framework | React | 18.3.x |
| Language | TypeScript | 5.4.x |
| Styling | Tailwind CSS | 3.4.x |
| State | Valtio | 2.1.x |
| Forms | React Hook Form | 7.x |
| Routing | React Router | 6.x |
| Testing | Vitest | Latest |
| UI Library | PrimeReact | 10.9.x |

---

## Migration History

### Vue.js → React (Completed)

✅ All components migrated to React
✅ Vue Router → React Router
✅ Pinia → Valtio
✅ Vue templates → JSX/TSX

**Result**: 100% React codebase as of version 0.4.6

---

## Authentication

### Overview

The project has two authentication approaches:

**1. Local Auth Pages** (standalone email/password authentication)

Routes `/auth/sign-in` and `/auth/sign-up` provide built-in login and registration pages without Keycloak. Components live in `src/authentication/local/` (`SignInPage`, `SignUpPage`) with shared form components in `src/authentication/components/`. These pages use `StandaloneLayout` (no sidebar/nav) for a clean, standalone authentication experience.

**2. Keycloak Theme** (SSO authentication via Keycloak)

The project uses [Keycloakify](https://www.keycloakify.dev/) to build a custom Keycloak login theme as a separate entry point. When deployed, Keycloak serves these themed pages for login/registration. The theme renders SSO buttons (e.g. "Sign in with EPAM SSO" via Azure Entra ID) with a collapsible email/password form underneath.

**How the Keycloak theme entry point works:**

- The main app uses `src/main.tsx` as its entry point (renders the full React app)
- For Keycloak theme builds, a Vite plugin (`keycloak-entry` in `vite.config.ts`) swaps the entry to `src/keycloakify.tsx` when `VITE_ENTRY=keycloakify` is set
- `keycloakify.tsx` reads `window.kcContext` (injected by Keycloak's FTL templates) and renders only the `KcPage` component — no router, no app shell
- This means `main.tsx` stays clean with zero Keycloak code

**How authentication works in production:**

- Keycloak runs as a separate service, serving the custom theme JAR
- Users hit the Keycloak login page → authenticate via SSO or credentials → Keycloak redirects back to the app with a session cookie
- The app's API client (`src/utils/api.ts`) sends requests with the Keycloak JWT cookie automatically
- `userStore` manages the authenticated user state within the app

### Key Files

| File | Purpose |
|------|---------|
| `src/authentication/keycloak-theme/` | Custom Keycloak login theme (React components) |
| `src/authentication/keycloak-theme/login/pages/Login.tsx` | Main login page with SSO buttons + email/password form |
| `src/authentication/keycloak-theme/login/Template.tsx` | Page layout template for Keycloak pages |
| `src/authentication/keycloak-theme/kc.gen.tsx` | Auto-generated by Keycloakify (commit to git) |
| `src/keycloakify.tsx` | Separate entry point for Keycloak builds |
| `src/authentication/local/` | Local auth pages (SignInPage, SignUpPage) |
| `src/authentication/components/` | Shared auth form components (SignInForm, SignUpForm) |
| `.keycloakify/realm-kc-26.template.json` | Realm config template with `${KC_ENTRA_*}` placeholders |
| `.keycloakify/realm-kc-26.json` | Generated realm config (gitignored) |
| `vite.config.ts` → `keycloakify()` | Keycloakify plugin configuration |
| `vite.config.ts` → `keycloak-entry` | Vite plugin that swaps entry point for Keycloak builds |

### Local Keycloak Startup Flow

```
npm run start:keycloak
        │
        ├─ 1. source .env (loads KC_ENTRA_TENANT_ID, KC_ENTRA_CLIENT_ID, KC_ENTRA_CLIENT_SECRET)
        │
        ├─ 2. sed replaces ${KC_ENTRA_*} placeholders in realm-kc-26.template.json
        │     └─ Writes .keycloakify/realm-kc-26.json (gitignored)
        │
        ├─ 3. npx keycloakify start-keycloak
        │     ├─ Builds project (npm run build:prod + keycloakify build)
        │     └─ Starts Keycloak in Docker container
        │           ├─ Mounts realm-kc-26.json → imports realm with SSO identity provider
        │           ├─ Mounts custom theme JAR
        │           └─ Runs on port 8888
        │
        └─ Result: Keycloak at http://localhost:8888 with "Login with EPAM SSO" button
```

### SSO Identity Provider

The realm JSON configures an OIDC identity provider (`entra-id`) connected to Azure Entra ID (Microsoft) for EPAM SSO. Configuration is in the `identityProviders` section of the realm template (~line 1625).

### How to Get Azure Entra ID Credentials

1. Go to [Azure Portal](https://portal.azure.com/) → **Microsoft Entra ID** → **App registrations**
2. Click **New registration**, name it (e.g. "CodeMie Keycloak Integration"), leave redirect URI blank, click **Register**
3. Copy the **Application (client) ID** → `KC_ENTRA_CLIENT_ID`
4. Copy the **Directory (tenant) ID** → `KC_ENTRA_TENANT_ID`
5. Go to **Certificates & secrets** → **New client secret** → add description → click **Add**
6. **Copy the secret value immediately** (shown only once) → `KC_ENTRA_CLIENT_SECRET`
7. Go to **API permissions** → verify **User.Read** (Microsoft Graph, Delegated) is present

### Environment Variables (`.env`)

Only 3 variables needed:

| Variable | Description |
|----------|-------------|
| `KC_ENTRA_TENANT_ID` | Azure Entra ID tenant (organization) ID |
| `KC_ENTRA_CLIENT_ID` | Azure Entra ID application (client) ID |
| `KC_ENTRA_CLIENT_SECRET` | Azure Entra ID client secret |

The template JSON contains full OAuth2 URLs with `${KC_ENTRA_TENANT_ID}` inline (e.g. `https://login.microsoftonline.com/${KC_ENTRA_TENANT_ID}/oauth2/v2.0/authorize`). The `sed` command in the npm script replaces all 3 placeholders before Keycloak starts.

### Commands

| Command | Purpose |
|---------|---------|
| `source .env && npm run start:keycloak` | Start local Keycloak with custom theme + SSO |
| `npm run build:keycloak` | Build Keycloak theme JAR for deployment |

> **Note:** `build:keycloak` and `start:keycloak` require **Java 17+** and **Maven 3.8+**. These are NOT required for regular `npm run dev`.

---

**Related Guides**:
- [State Management](../patterns/state-management.md) - Store patterns
- [Component Patterns](../components/component-patterns.md) - UI layer
- [API Integration](../development/api-integration.md) - Integration layer
- [Routing Patterns](./routing-patterns.md) - Navigation

**Last Updated**: 2026-02-16
