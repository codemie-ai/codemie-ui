# CodeMie UI

[![License](https://img.shields.io/badge/License-Apache%202.0-blue.svg)](LICENSE)
[![Website](https://img.shields.io/badge/website-codemie.ai-informational)](https://codemie.ai)
[![Docs](https://img.shields.io/badge/docs-docs.codemie.ai-informational)](https://docs.codemie.ai)

**The web interface for CodeMie — Platform for AI-Native Delivery, Modernization, and Business.**

**This repository — `codemie-ui` — is the web interface component of the CodeMie platform.** Built with React and TypeScript, it is the browser application where teams interact with AI assistants, design multi-agent workflows, manage integrations, configure knowledge bases, and monitor platform activity. It connects to the `codemie` backend via REST API.

**What the platform enables:**

- 🚀 **AI-Native SDLC & Delivery** — AI agents covering every phase: discovery, architecture, development, testing, and deployment.
- 🔄 **AI Migration & Modernization** — Legacy system and mainframe modernization powered by AI-driven code analysis and transformation.
- 💼 **AI for Business & Operations** — AI assistants for finance, HR, sales, support, and other business functions.

🌐 **Website:** [codemie.ai](https://codemie.ai)
📖 **Documentation:** [docs.codemie.ai](https://docs.codemie.ai)
🖥️ **CLI tool:** [codemie-code](https://github.com/codemie-ai/codemie-code)

## Description 🗒

The CodeMie web application — built with React, TypeScript, and Vite ⚡

### Technology Stack 🛠

1. **Framework**: [React 18](https://react.dev/) with [TypeScript](https://www.typescriptlang.org/)
2. **Build Tool**: [Vite 5](https://vitejs.dev/)
3. **Styling**: [Tailwind CSS 3](https://tailwindcss.com/)
4. **UI Components**: [PrimeReact](https://primereact.org/) with Tailwind preset
5. **State Management**: [Valtio](https://github.com/pmndrs/valtio)
6. **Form Handling**: [React Hook Form](https://react-hook-form.com/) + [Yup](https://github.com/jquense/yup)
7. **Routing**: [React Router 6](https://reactrouter.com/)
8. **Testing**: [Vitest](https://vitest.dev/) + [React Testing Library](https://testing-library.com/react)


## Project Setup ⚙️

1. Install Node.js
2. `npm install`
3. Update .env VITE_API_URL to match your local server

## Development Commands 🚀

### Start Development Server

```bash
npm run dev
```

Starts the Vite dev server with hot module replacement.

### Build for Production

```bash
npm run build        # Production build
npm run build:prod   # Production build (explicit)
npm run preview      # Preview production build locally
```

### Testing

```bash
npm test                # Run all tests
npm test -- --watch     # Run tests in watch mode
npm run test:coverage   # Run tests with coverage report
```

### Code Quality

```bash
npm run lint        # Check code with ESLint
npm run lint:fix    # Auto-fix ESLint issues
npm run format      # Format code with Prettier
```

## Docker Support 🐳

### Run with Docker Compose

```bash
docker-compose up --build
```

### Prerequisites for DHI Dockerfiles
To build `Dockerfile` or `multistage.Dockerfile`, you must have a Docker Hub account and be authenticated to `dhi.io`.

1. Ensure you have an account at [Docker Hub](https://hub.docker.com/).
2. Authenticate using your username and password (**Google Login will not work**):
    ```bash
    docker login dhi.io
    ```

### Build Multistage Docker Image

```bash
docker build . -t codemie-ui:0.12.0 -f multistage.Dockerfile
```

### Keycloak Theme Development

Building or running the Keycloak theme locally (`build:keycloak`, `start:keycloak`) requires **Java 17+** and **Maven 3.8+**.

**macOS:**
```bash
brew install openjdk maven
```

**Linux (Debian/Ubuntu):**
```bash
sudo apt install default-jdk maven
```

> **Note:** These are NOT required for regular development (`npm run dev`) or production builds (`npm run build`). Only for Keycloak theme commands.

### Local Keycloak with SSO (Identity Provider)

The local Keycloak instance uses a realm template file at `.keycloakify/realm-kc-26.template.json` with `${KC_ENTRA_*}` placeholders for the SSO identity provider ("Login with EPAM SSO" button). The `start:keycloak` script sources `.env`, replaces the placeholders via `sed`, and generates `.keycloakify/realm-kc-26.json` (gitignored) before starting Keycloak.

#### How to get Azure Entra ID credentials

1. Go to [Azure Portal](https://portal.azure.com/) → **Microsoft Entra ID** → **App registrations**
2. Click **New registration**, name it (e.g. "CodeMie Keycloak Integration"), leave redirect URI blank, click **Register**
3. Copy the **Application (client) ID** → this is your `KC_ENTRA_CLIENT_ID`
4. Copy the **Directory (tenant) ID** → this is your `KC_ENTRA_TENANT_ID`
5. Go to **Certificates & secrets** → **New client secret** → add a description (e.g. "Keycloak Secret") → click **Add**
6. **Copy the secret value immediately** (it is shown only once) → this is your `KC_ENTRA_CLIENT_SECRET`
7. Go to **API permissions** → verify that **User.Read** (Microsoft Graph, Delegated) is present (enabled by default)

#### Environment variables

Add the following to your `.env` file (required for SSO):

| Environment Variable | Description |
|---------------------|-------------|
| `KC_ENTRA_TENANT_ID` | Azure Entra ID tenant (organization) ID |
| `KC_ENTRA_CLIENT_ID` | Azure Entra ID application (client) ID |
| `KC_ENTRA_CLIENT_SECRET` | Azure Entra ID client secret |

```env
# Keycloak SSO (Azure Entra ID)
KC_ENTRA_TENANT_ID=your-tenant-id
KC_ENTRA_CLIENT_ID=your-client-id
KC_ENTRA_CLIENT_SECRET=your-client-secret
```

The `prestart:keycloak` script automatically derives all OAuth2 URLs from the tenant ID (authorization, token, issuer, JWKS, logout, metadata).

#### Usage

```bash
source .env && npm run start:keycloak
```

## Project Structure 📁

```
src/
├── components/       # Reusable React components
├── pages/           # Application pages (route components)
├── hooks/           # Custom React hooks
├── store/           # Valtio state management
├── utils/           # Utility functions
├── types/           # TypeScript type definitions
├── constants/       # Application constants
├── assets/          # Static assets (images, fonts, icons)
├── styles/          # Global styles
├── App.tsx          # Root component
├── main.tsx         # Application entry point
└── router.tsx       # React Router configuration
```

## Contribution Guidelines 🌳

We use **trunk-based development** - all pull requests go directly to the `main` branch.

### Branch Naming Convention

```
EPMCDME-XX_short-description
```

Example: `EPMCDME-123_add-user-profile`

### Commit Message Format

```
EPMCDME-XX: Description of the change
```

Example: `EPMCDME-123: Add user profile page with settings`

### Development Guidelines

- **Use React + TypeScript** for all new features
- **Follow Tailwind CSS** for styling (no custom CSS)
- **Write tests** for new components and features
- **Use existing components** from `src/components/` when possible
- **Keep components under 300 lines** - extract to smaller components if needed
- See [CLAUDE.md](./CLAUDE.md) for comprehensive development guidelines

## Documentation 📚

- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive development guide for AI agents and developers
- **[Component Library](./src/components/)** - Browse available React components
- **[Hooks](./src/hooks/)** - Custom React hooks documentation

## Environment Configuration 🔧

Create a `.env` file in the root directory:

```env
VITE_API_URL=http://localhost:8080
VITE_SUFFIX=/app
```

## Contributing 🤝

We welcome contributions! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md) before submitting a pull request.

## License 📄

CodeMie UI is licensed under the [Apache License 2.0](LICENSE).
