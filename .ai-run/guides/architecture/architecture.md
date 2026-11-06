# Architecture Guide

**Project**: CodeMie UI · **Stack**: TypeScript React · **Scope**: where code belongs under `src/`, the store/page/util boundaries and the registration points new code extends; routes live in `.ai-run/guides/architecture/routing-patterns.md`, store internals in `.ai-run/guides/patterns/state-management.md`

## Structure and boundaries

### Rules
- R1. Call `api.get/post/put/patch/delete` from a store method under `src/store/`, never from a page, component, hook or util (the store owns the parse, loading and error state). Allowed exceptions: `src/utils/mcpAuthStatus.ts`, `src/hooks/useMCPAuthPrompt.ts`. Evidence: `src/store/assistants.ts::assistantsStore.indexAssistants`
- R6. Read framework versions from `package.json`; a guide never restates them (React is 19, not 18). Evidence: `package.json::react`
- R8. Import a store from its own module (`@/store/<name>`); `src/store/index.ts` re-exports a fixed legacy subset and a new store is not added to it. Evidence: `src/store/index.ts::premiumModelTipStore`
- R9. Keep a new component under 300 lines; extract a hook or sub-component when approaching it. Known debt, to fix: `src/pages/settings/administration/projectsManagement/ProjectMembersManager.tsx`, `src/pages/assistants/components/AssistantForm/AssistantForm.tsx`, `src/pages/dataSources/components/DataSourceDetails.tsx`, `src/pages/integrations/components/SettingsForm/SettingsForm.tsx`. Evidence: `src/pages/assistants/components/AssistantForm/AssistantForm.tsx::AssistantForm`
- R11. Change the Keycloak login theme under `src/authentication/keycloak-theme/`; it is a separate Vite entry (`VITE_ENTRY=keycloakify`, `index-keycloak.html`) that renders `KcPage` with no router. Evidence: `src/authentication/keycloak-theme/keycloakify.tsx::KcPage`

## Patterns in use

### Rules
- R4. Gate enterprise-only UI with `isEnterpriseEdition()`, which reads the `ENTERPRISE_EDITION` feature flag; `routes` spreads every route array unconditionally. Evidence: `src/utils/enterpriseEdition.ts::isEnterpriseEdition`
- R10. Override an A2UI catalog component in `OWN_COMPONENTS`; every other basic-catalog component is wrapped with `withAccessibility` by `A2UI_COMPONENTS`. Evidence: `src/a2ui/registry.tsx::A2UI_COMPONENTS`
- R12. Regenerate `src/types/generated/marketplaceManagement.ts` with `npm run generate:types` from the committed OpenAPI snapshot; never hand-edit it (`check:generated-types` diffs it). Evidence: `scripts/generate-marketplace-types.mjs::specPath`

## Request flow

### Rules
- R2. Parse a response with `await response.json()`; `api.*` resolves a native fetch `Response`, so there is no `.data` (axios is installed but no module imports it). Evidence: `src/utils/api.ts::API.makeRequest`
- R3. Build path-based links; the router is `createBrowserRouter` with `basename` from `BASE_URL`, and `redirectHashRoutes` only rewrites a legacy `#/` URL once at startup. Evidence: `src/router.tsx::router`

## Extension points

### Rules
- R5. Register a federated remote in the `remotes` map of the `federation()` plugin in `vite.config.ts` and load it from a page under `src/pages/applications/`; the config declares no `shared` list. Evidence: `vite.config.ts::federation`
- R7. Put an onboarding flow definition in `src/configs/onboarding/` and export it from its `index.ts`. Evidence: `src/configs/onboarding/index.ts::navigationIntroductionFlow`
