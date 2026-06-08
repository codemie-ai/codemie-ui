# AGENTS.md

**Purpose**: AI-optimized execution guide for agents working with the CodeMie backend repository.

Detailed project guidance lives under `.ai-run/guides/`, which is the source of truth for AI-assisted development in this repo.

## Guide Imports

<!-- ai-run-init:guide-imports start -->
| Category | Guide Path | Purpose |
|---|---|---|
| Project | `.ai-run/guides/project.md` | Project identity, tracker, source control, and MR adapter context |
| Quality Gates | `.ai-run/guides/quality-gates.md` | Exact validation commands and gate policy |
| Agents | `.ai-run/guides/agents/langchain-agent-patterns.md` | LangChain agent runtime patterns |
| Agent Tools | `.ai-run/guides/agents/agent-tools.md` | Agent-facing tool patterns |
| Custom Tools | `.ai-run/guides/agents/custom-tool-creation.md` | Tool creation workflow |
| Tool Overview | `.ai-run/guides/agents/tool-overview.md` | Toolkit layering overview |
| API | `.ai-run/guides/api/rest-api-patterns.md` | FastAPI router patterns |
| Endpoint Conventions | `.ai-run/guides/api/endpoint-conventions.md` | Route and response conventions |
| Architecture | `.ai-run/guides/architecture/layered-architecture.md` | Layered architecture |
| Project Structure | `.ai-run/guides/architecture/project-structure.md` | Package boundaries |
| Service Layer | `.ai-run/guides/architecture/service-layer-patterns.md` | Service orchestration |
| Database | `.ai-run/guides/data/database-patterns.md` | SQLModel and session patterns |
| Repository | `.ai-run/guides/data/repository-patterns.md` | Repository access patterns |
| Database Optimization | `.ai-run/guides/data/database-optimization.md` | Pagination and batching |
| Elasticsearch | `.ai-run/guides/data/elasticsearch-integration.md` | Elasticsearch repository patterns |
| Error Handling | `.ai-run/guides/development/error-handling.md` | Typed exceptions and handlers |
| Logging | `.ai-run/guides/development/logging-patterns.md` | Safe contextual logging |
| Security | `.ai-run/guides/development/security-patterns.md` | Auth, validation, and secrets |
| Performance | `.ai-run/guides/development/performance-patterns.md` | Async and batching patterns |
| Configuration | `.ai-run/guides/development/configuration-patterns.md` | Config and environment patterns |
| Setup | `.ai-run/guides/development/setup-guide.md` | Local setup |
| Local Testing | `.ai-run/guides/development/local-testing.md` | Local validation flow |
| External Services | `.ai-run/guides/integration/external-services.md` | Integration boundaries |
| Cloud | `.ai-run/guides/integration/cloud-integrations.md` | Cloud provider integrations |
| LLM Providers | `.ai-run/guides/integration/llm-providers.md` | Model provider configuration |
| Confluence | `.ai-run/guides/integration/confluence-integration.md` | Confluence integration |
| Jira | `.ai-run/guides/integration/jira-integration.md` | Jira integration |
| X-ray | `.ai-run/guides/integration/xray-integration.md` | X-ray integration |
| Google Docs | `.ai-run/guides/integration/google-docs-integration.md` | Google Docs integration |
| MCP | `.ai-run/guides/integration/mcp-integration.md` | MCP configuration and tools |
| Code Quality | `.ai-run/guides/standards/code-quality.md` | Python and Ruff standards |
| Git Workflow | `.ai-run/guides/standards/git-workflow.md` | Branch, commit, and review conventions |
| Testing | `.ai-run/guides/testing/testing-patterns.md` | pytest policy and patterns |
| API Testing | `.ai-run/guides/testing/testing-api-patterns.md` | API test patterns |
| Service Testing | `.ai-run/guides/testing/testing-service-patterns.md` | Service test patterns |
| Workflows | `.ai-run/guides/workflows/langgraph-workflows.md` | LangGraph workflow patterns |
<!-- ai-run-init:guide-imports end -->

## Task Classifier

<!-- ai-run-init:task-classifier start -->
| Category | User Intent | Example Requests | P0 Guide | P1 Guide |
|---|---|---|---|---|
| Architecture | system structure, boundaries, where code belongs | where should this go?; refactor service boundaries | `.ai-run/guides/architecture/layered-architecture.md` | `.ai-run/guides/architecture/project-structure.md` |
| Agents & Tools | agents, tools, toolkits, callbacks | add tool; modify agent; tool schema | `.ai-run/guides/agents/langchain-agent-patterns.md` | `.ai-run/guides/agents/agent-tools.md` |
| API | FastAPI routes, models, validation | add endpoint; change response model | `.ai-run/guides/api/rest-api-patterns.md` | `.ai-run/guides/api/endpoint-conventions.md` |
| Database | SQLModel, repositories, PostgreSQL | add query; change model; optimize DB | `.ai-run/guides/data/database-patterns.md` | `.ai-run/guides/data/repository-patterns.md` |
| Search | Elasticsearch, vector or hybrid search | index stats; ES query; search bug | `.ai-run/guides/data/elasticsearch-integration.md` | `.ai-run/guides/data/database-optimization.md` |
| Development | errors, logging, config, performance | handle error; add logging; config var | `.ai-run/guides/development/error-handling.md` | `.ai-run/guides/development/logging-patterns.md` |
| Security | auth, permissions, validation, secrets | auth bug; sanitize input; secret handling | `.ai-run/guides/development/security-patterns.md` | `.ai-run/guides/development/configuration-patterns.md` |
| Integrations | cloud, Jira, Confluence, X-ray, GDocs, MCP | add integration; fix provider call | `.ai-run/guides/integration/external-services.md` | `.ai-run/guides/integration/llm-providers.md` |
| Testing | only when user explicitly asks tests | write tests; run tests; fix failing test | `.ai-run/guides/testing/testing-patterns.md` | `.ai-run/guides/testing/testing-api-patterns.md` |
| Git | only when user explicitly asks git ops | commit; push; create MR | `.ai-run/guides/standards/git-workflow.md` | `.ai-run/guides/quality-gates.md` |
| Workflows | LangGraph workflows and execution | workflow node; transition; interrupt | `.ai-run/guides/workflows/langgraph-workflows.md` | `.ai-run/guides/architecture/service-layer-patterns.md` |
<!-- ai-run-init:task-classifier end -->

## Critical Rules

<!-- ai-run-init:critical-rules start -->
| Rule | Trigger | Action |
|---|---|---|
| Check Guides First | ANY task | Match request to category, load the P0 `.ai-run/guides/` guide before broad code search. |
| Testing | User asks to write, run, or fix tests | Only then work on tests; load `.ai-run/guides/testing/testing-patterns.md` first. |
| Git Operations | User asks to commit, push, create MR, or similar | Only then perform git side effects; load `.ai-run/guides/standards/git-workflow.md` first. |
| Python Environment | Python, Poetry, or tool commands | Load `.ai-run/guides/development/setup-guide.md` or `.ai-run/guides/quality-gates.md` before running. |
| Shell | ANY shell command | Use bash/Linux syntax and report commands actually run. |
| Project Conventions | Any project-specific convention | Load the relevant guide; do not infer exact values from this entrypoint. |
<!-- ai-run-init:critical-rules end -->

## Commands

<!-- ai-run-init:commands start -->
| Need | Source Guide | Source Evidence | Notes |
|---|---|---|---|
| Setup and local environment | `.ai-run/guides/development/setup-guide.md` | README, Makefile, pyproject | Load before dependency or environment commands. |
| Run the application | `.ai-run/guides/development/setup-guide.md` | README, Makefile | Load before starting local services. |
| Lint, format, build, and verification | `.ai-run/guides/quality-gates.md` | Makefile, pyproject | Use the guide for exact commands and skip policy. |
| Tests and coverage | `.ai-run/guides/testing/testing-patterns.md` | Makefile, pytest config | Only run or write tests when explicitly requested. |
| Security and secret checks | `.ai-run/guides/development/security-patterns.md` | Quality gates guide, Makefile | Check environment prerequisites before running. |
<!-- ai-run-init:commands end -->

## Pre-Delivery Checklist

- Requirements handled and scoped to the user request.
- Relevant `.ai-run/guides/` P0 guide was checked first.
- Project-specific exact values came from a guide, not from this entrypoint.
- Validation commands actually run are reported exactly in the final response.
- Tests are only run or written when explicitly requested.
- Git operations are only performed when explicitly requested.

## Conflict Handling

| Conflict | Action |
|---|---|
| A guide conflicts with source code | Trust current source, then update guidance only if the task owns that documentation change. |
| README and Makefile disagree on a command | Prefer the Makefile target and note the README mismatch in the response. |
| User asks for tests but scope is unclear | Ask for the intended scope or run the narrowest relevant test. |
| User asks for git work without a required work item | Ask for the missing work item before committing. |
| Existing host-specific skills disagree with `.ai-run/guides/` | Follow `.ai-run/guides/` unless the user explicitly selects the host-specific workflow. |

## Source Evidence Priority

| Evidence type | Priority |
|---|---|
| Current source files | Highest for implementation behavior. |
| `Makefile` and manifests | Highest for commands and dependencies. |
| README and contribution docs | Useful for workflow context. |
| `.ai-run/guides/` | Primary AI guidance source. |
| Host-specific skill files | Use only when that skill is explicitly invoked. |
