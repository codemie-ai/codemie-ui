// Copyright 2026 EPAM Systems, Inc. ("EPAM")
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
//

import { HelpPageId } from '@/constants/helpLinks'
import { NEW_ASSISTANT } from '@/constants/routes'
import { assistantsStore } from '@/store'
import { OnboardingFlow } from '@/types/onboarding'
import { isMcpEnabled, isFeatureEnabled } from '@/utils/featureFlags'
import { collapseAccordion, expandAccordion, findOnboardingElement } from '@/utils/onboarding'

export const assistantsOverviewFlow: OnboardingFlow = {
  id: 'assistants-overview',
  name: 'Assistants Overview & Creation',
  description:
    'Explore the assistants catalog, understand capabilities, and create your first custom assistant',
  emoji: '🤖',
  duration: '4-5 min',
  triggers: { helpPanelPages: [{ id: HelpPageId.ASSISTANTS, firstTimePopup: true }] },
  steps: [
    // Step 1: Welcome
    {
      id: 'welcome',
      actionType: 'Modal',
      title: 'Welcome to Assistants',
      description: `Welcome to the Assistants tour!

Assistants are specialized AI agents that can be customized for specific tasks and purposes.

In this guide, you'll walk through the Create Assistant form and learn how to:
- Name and describe your assistant
- Write system instructions to shape its behavior
- Add tools that connect to external systems
- Save and share your assistant with your team

Let's open the Create Assistant form and get started!`,
    },

    // Tech Step: Navigate to Create Assistant Form
    {
      id: 'navigate-to-create-assistant',
      actionType: 'Navigation',
      route: { name: NEW_ASSISTANT },
      delay: 300,
    },

    // Step 2a: Highlight the Generate with AI popup if it auto-opened (first-time users)
    {
      id: 'gen-ai-popup-intro',
      actionType: 'Highlight',
      condition: () => assistantsStore.loadShowNewAssistantAIPopup(),
      title: 'Generate Assistant with AI',
      target: () => document.querySelector('.p-dialog') as HTMLElement | null,
      delay: 300,
      description: `This popup appears automatically to help you get started faster.

Describe your ideal assistant in plain language — for example "A code review assistant for TypeScript projects" — and AI will configure it for you: name, description, conversation starters, and system instructions.

Toggle "Include tools" to also let AI pick the most relevant integrations for your use case.

We'll close this dialog now and walk you through each field step by step so you can explore everything at your own pace.`,
    },

    // Tech Step 2b: Close the popup before walking through the form fields
    {
      id: 'close-gen-ai-popup',
      actionType: 'CodeExecution',
      condition: () => assistantsStore.loadShowNewAssistantAIPopup(),
      execute: () => {
        const closeBtn = document.querySelector('.p-dialog-header-close') as HTMLElement | null
        closeBtn?.click()
      },
    },

    // Step 2: Generate with AI — shown when the popup was already closed above (user saw it)
    {
      id: 'generate-with-ai-after-popup',
      actionType: 'Highlight',
      condition: () => assistantsStore.loadShowNewAssistantAIPopup(),
      title: 'Generate with AI',
      target: '[data-onboarding="assistant-generate-ai-btn"]',
      description: `This button reopens the dialog we just explored. Any time you want AI to build an assistant from a plain-language description, click it — name, description, conversation starters, system instructions, and tools all generated for you in seconds.

It's always available here, so you can use it on your next assistant too. For now, let's continue and explore the form fields manually.`,
    },

    // Step 2: Generate with AI — shown when the popup was not auto-opened (returning users)
    {
      id: 'generate-with-ai',
      actionType: 'Highlight',
      condition: () => !assistantsStore.loadShowNewAssistantAIPopup(),
      title: 'Generate with AI',
      target: '[data-onboarding="assistant-generate-ai-btn"]',
      description: `Not sure where to start? Click Generate with AI to describe your goal in plain language and let the platform configure the assistant for you — including its name, description, conversation starters, and system instructions.

This is the fastest way to get a working assistant up and running. You can always fine-tune the generated values afterwards.`,
    },

    // Step 3: Assistant Setup Section
    {
      id: 'assistant-setup-section',
      actionType: 'Highlight',
      title: 'Name and Configure Your Assistant',
      target: '[data-onboarding="assistant-basic-fields"]',
      description: `Fill in the core details that define your assistant:

- Name — a clear, descriptive name your team will recognise
- Project — the project this assistant belongs to
- Shared with Project — toggle on to let all team members use this assistant
- Description — explain the assistant's purpose so others can discover it easily`,
    },

    // Step 4: Conversation Starters
    {
      id: 'conversation-starters',
      actionType: 'Highlight',
      title: 'Add Conversation Starters',
      target: '[data-onboarding="assistant-conversation-starters-field"]',
      description: `Conversation starters are suggested prompts shown to users when they open a chat with this assistant.

They help users understand what the assistant can do and give them a quick way to get started — especially useful for shared or published assistants.

Tip: Keep starters short and action-oriented, like "Review my pull request" or "Generate a Jira ticket for this bug".`,
    },

    // Step 5: Categories
    {
      id: 'categories',
      actionType: 'Highlight',
      title: 'Organise with Categories',
      target: '[data-onboarding="assistant-categories-field"]',
      description: `Categories help you and your team organise and filter assistants in the catalog and Marketplace.

Assign one or more categories to your assistant so it's easy to discover — for example "Code Review", "QA", or "Project Management".

Tip: Categories are especially useful when publishing to the Marketplace, where users filter by category to find assistants for their use case.`,
    },

    // Step 6: System Instructions
    {
      id: 'system-instructions',
      actionType: 'Highlight',
      title: 'Define Assistant Behavior',
      target: '[data-onboarding="assistant-system-instructions-field"]',
      description: `System Instructions are the core prompt that shapes how your assistant thinks and responds.

- Set the assistant's role and tone (e.g. "You are a senior code reviewer…")
- Define rules and constraints it should follow
- Use built-in variables like {{current_user}} or {{date}} for dynamic context
- Click Manage Prompt Vars to create custom variables like {{jira_project}}

Good system instructions lead to consistent, high-quality responses.`,
    },

    // Tech Step: Expand Extra Configuration
    {
      id: 'expand-extra-configuration',
      actionType: 'CodeExecution',
      execute: () => expandAccordion('assistant-extra-config-accordion'),
      onBack: () => collapseAccordion('assistant-extra-config-accordion'),
    },

    // Step 7: Extra Configuration
    {
      id: 'extra-configuration',
      actionType: 'Highlight',
      title: 'Fine-Tune Advanced Settings',
      target: '[data-onboarding="assistant-extra-config-accordion"]',
      description: `The Extra configuration section gives you fine-grained control over how the assistant generates responses:

- LLM Model — choose a specific language model instead of the project default
- Temperature (0–2) — higher values make responses more creative; lower values make them more focused and deterministic
- Top P (0–1) — controls response diversity; lower values narrow the assistant to more likely outputs
- Slug — a unique, human-readable identifier used to build a shareable link to this assistant

These settings are optional — the defaults work well for most use cases.`,
    },

    // Tech Step: Expand Context & Data Sources
    {
      id: 'expand-context-data-sources',
      actionType: 'CodeExecution',
      execute: () => expandAccordion('assistant-context-datasources-accordion'),
      onBack: () => collapseAccordion('assistant-context-datasources-accordion'),
    },

    // Step 8: Data Source Context
    {
      id: 'data-source-context',
      actionType: 'Highlight',
      title: 'Connect Data Sources',
      target: '[data-onboarding="assistant-datasource-context-field"]',
      description: `Connect your assistant to project knowledge so it can answer questions grounded in your data.

Use the dropdown to attach any already-indexed data sources — such as documentation repositories or code repositories. When a user asks a question, the assistant retrieves relevant context from these sources before responding, making answers far more accurate and specific to your project.

Don't have a data source yet? Click "+ Create" to set one up right here — without leaving the assistant form. A quick creation dialog will open, and once the new data source finishes indexing it will become available to select.

Note: Only data sources that have fully completed indexing are available for selection. Full data source management (editing, re-indexing, deletion) lives on the dedicated Data Sources page.`,
    },

    // Step 9: Sub-Assistants
    {
      id: 'sub-assistants',
      actionType: 'Highlight',
      title: 'Add Sub-Assistants',
      target: '[data-onboarding="assistant-sub-assistants-field"]',
      description: `Turn this assistant into an orchestrator by adding other assistants as sub-assistants.

The orchestrator receives the user's request and intelligently delegates tasks to the right specialist — for example routing a code review request to a Code Reviewer assistant and a Jira update to a Project Management assistant.

Note: Sub-assistants must belong to the same project and cannot themselves have sub-assistants.`,
    },

    // Tech Step: Expand Skills Section (conditional — only runs when Skills feature is on)
    {
      id: 'expand-skills-section',
      actionType: 'CodeExecution',
      condition: () => isFeatureEnabled('skills'),
      execute: () => expandAccordion('assistant-skills-accordion'),
      onBack: () => collapseAccordion('assistant-skills-accordion'),
    },

    // Step 10: Skills (Conditional)
    {
      id: 'skills',
      actionType: 'Highlight',
      title: 'Supercharge with Skills',
      condition: () => isFeatureEnabled('skills'),
      target: '[data-onboarding="assistant-skills-accordion"]',
      description: `Skills are reusable sets of instructions you can attach to an assistant to give it specialised knowledge — without bloating the system prompt.

Unlike static system instructions, skills load on-demand: the assistant evaluates each incoming message and only activates the skills that are relevant. For example, a "JIRA Ticket Structure" skill loads when the user asks to create a ticket, but stays out of the way for unrelated requests.

Benefits:
- Modular — build one skill and reuse it across many assistants
- Efficient — only relevant skills consume tokens per request
- Collaborative — share skills across your project or publish them to the Skills Marketplace

Skills can also be attached dynamically per conversation in the chat interface, without editing the assistant. Full skill management lives on the dedicated Skills page.`,
    },

    // Tech Step: Expand Tools Configuration
    {
      id: 'expand-tools-configuration',
      actionType: 'CodeExecution',
      execute: () => expandAccordion('assistant-tools-configuration-accordion'),
      onBack: () => collapseAccordion('assistant-tools-configuration-accordion'),
    },

    // Tech Step: Expand Available Tools
    {
      id: 'expand-available-tools',
      actionType: 'CodeExecution',
      execute: () => expandAccordion('assistant-available-tools-accordion'),
      onBack: () => collapseAccordion('assistant-available-tools-accordion'),
    },

    // Step 11: Browse Toolkits
    {
      id: 'browse-toolkits',
      actionType: 'Highlight',
      title: 'Browse Toolkits',
      target: '[data-onboarding="assistant-toolkits-left-panel"]',
      description: `The left side of the Available Tools panel is a searchable list of all available toolkits.

Each toolkit represents an integration category — for example Jira, GitHub, Google Search, Confluence, or Kubernetes. Use the search bar at the top to filter by name if you already know what you're looking for.

Click any toolkit in the list to select it and see the tools it contains on the right.`,
    },

    // Step 12: Select Individual Tools
    {
      id: 'select-individual-tools',
      actionType: 'Highlight',
      title: 'Enable Specific Tools',
      target: '[data-onboarding="assistant-toolkits-right-panel"]',
      description: `The right side shows the individual tools within the selected toolkit. Toggle each one on or off independently.

This granularity matters — for example, you might want your assistant to "Create Jira Issue" and "Search Jira Issues" but not "Delete Jira Issue".

Tip: Only enable the tools your assistant genuinely needs. Selecting too many slows down responses, increases costs, and can confuse the assistant about which action to use for a given request.`,
    },

    // Tech Step: Expand MCP Servers Accordion
    {
      id: 'expand-mcp-servers-accordion',
      actionType: 'CodeExecution',
      condition: () => isMcpEnabled(),
      execute: () => expandAccordion('assistant-mcp-servers-section'),
      onBack: () => collapseAccordion('assistant-mcp-servers-section'),
    },

    // Step 13: MCP Servers (Conditional)
    {
      id: 'mcp-servers',
      actionType: 'Highlight',
      title: 'Extend with MCP Servers',
      condition: () => isMcpEnabled(),
      target: '[data-onboarding="assistant-mcp-servers-section"]',
      description: `MCP (Model Context Protocol) servers let you connect any external capability to your assistant — beyond the built-in toolkit library.

An MCP server is a small service that exposes tools to the assistant via a standard protocol. This means you can integrate with virtually any internal or third-party system, not just the ones natively supported by the platform.

There are two ways to add one: pick from the curated Catalog of pre-built servers, or configure your own with a Manual Setup.`,
    },

    // Tech Step: Open MCP Catalog
    {
      id: 'open-mcp-catalog',
      actionType: 'CodeExecution',
      condition: () => isMcpEnabled(),
      execute: () => {
        const btn = findOnboardingElement('assistant-mcp-servers-section')?.querySelector(
          'button[class*="primary"]'
        ) as HTMLElement | null
        btn?.click()
      },
      onBack: () => {
        const closeBtn = document.querySelector('.p-dialog-header-close') as HTMLElement | null
        closeBtn?.click()
      },
    },

    // Step 14: MCP Browse Catalog (Conditional)
    {
      id: 'mcp-browse-catalog',
      actionType: 'Highlight',
      title: 'Browse the MCP Catalog',
      condition: () => isMcpEnabled(),
      target: () => findOnboardingElement('mcp-catalog-first-card'),
      description: `The catalog is a curated collection of pre-configured MCP servers ready to plug in.

Each card shows the server's name, category, and a short description. Click Add on a card to select it, then fill in any required environment variables (API keys, tokens, etc.) and click Save.

Use the search bar at the top to find a server by name, or the category filter to narrow results by topic.

The platform handles all the wiring — no manual server configuration needed.`,
    },

    // Tech Step: Close Catalog and Open Custom MCP Form
    {
      id: 'close-catalog-open-custom-mcp',
      actionType: 'CodeExecution',
      condition: () => isMcpEnabled(),
      execute: () => {
        const closeBtn = document.querySelector('.p-dialog-header-close') as HTMLElement | null
        closeBtn?.click()
        setTimeout(() => {
          const manualBtn = findOnboardingElement('assistant-mcp-servers-section')?.querySelector(
            'button[class*="secondary"]'
          ) as HTMLElement | null
          manualBtn?.click()
        }, 300)
      },
      onBack: () => {
        const closeBtn = document.querySelector('.p-dialog-header-close') as HTMLElement | null
        closeBtn?.click()
      },
    },

    // Step 15: MCP Custom Setup (Conditional)
    {
      id: 'mcp-custom-setup',
      actionType: 'Highlight',
      title: 'Configure a Custom MCP Server',
      condition: () => isMcpEnabled(),
      target: () => findOnboardingElement('mcp-custom-form-fields'),
      delay: 300,
      description: `The custom form is a two-step wizard for connecting any MCP server.

Step 1 — Configure MCP Server: fill in the required fields:
- Name — a unique identifier for this server
- Command — the command used to invoke it (e.g. uvx)
- Arguments — any additional parameters, space-separated
- Environment variables — API keys or secrets the server needs

Prefer working with JSON? Switch to the JSON format tab and paste your configuration directly instead.

Step 2 — Select Tools: after configuring the server, choose exactly which of its tools to expose to the assistant.

Use Test Integration at any point to verify the server connection before saving.`,
    },

    // Tech Step: Close the custom MCP dialog before moving to Save
    {
      id: 'close-mcp-custom-dialog',
      actionType: 'CodeExecution',
      condition: () => isMcpEnabled(),
      execute: () => {
        const closeBtn = document.querySelector('.p-dialog-header-close') as HTMLElement | null
        closeBtn?.click()
      },
      onBack: () => {
        const manualBtn = findOnboardingElement('assistant-mcp-servers-section')?.querySelector(
          'button[class*="secondary"]'
        ) as HTMLElement | null
        manualBtn?.click()
      },
    },

    // Step 16: Save Your Assistant
    {
      id: 'save-assistant',
      actionType: 'Highlight',
      title: 'Save and Start Chatting',
      target: '[data-onboarding="assistant-save-btn"]',
      description: `Click Save to create your assistant.

After saving you can:
- Click the Chat icon to start a conversation immediately
- Edit at any time to refine instructions or tools
- Share with your project team via the Shared with Project toggle
- Publish to Marketplace to make it available to the wider community

Tip: Run a few test conversations after saving and iterate on the system instructions to improve quality.`,
    },

    // Step 17: Completion
    {
      id: 'complete',
      actionType: 'Modal',
      title: "You're All Set!",
      description: `Congratulations! You've completed the Assistants Overview tour.

You now know how to:
✓ Use Generate with AI to create an assistant instantly
✓ Fill in the setup fields — name, project, sharing, and description
✓ Add conversation starters to guide users
✓ Organise your assistant with categories
✓ Write system instructions that define assistant behavior
✓ Fine-tune advanced settings like LLM model and temperature
✓ Connect data sources to ground responses in your project knowledge
✓ Add sub-assistants to build an orchestrator that delegates tasks
✓ Attach reusable skills for on-demand specialised knowledge
✓ Browse toolkits on the left and enable specific tools on the right
✓ Add MCP servers from the catalog or configure a custom server manually
✓ Save and share your assistant with the team`,
      suggestedNextFlows: [
        {
          flowId: 'first-data-source',
          emoji: '📚',
          title: 'Add a Data Source',
          description:
            'Connect documentation or a code repository to give your assistant deep project knowledge.',
          duration: '3-4 minutes',
        },
        {
          flowId: 'first-integration',
          emoji: '🔌',
          title: 'Connect Your First Integration',
          description:
            'Link Jira, GitHub, or other tools so your assistant can act — not just answer.',
          duration: '3-4 minutes',
        },
        {
          flowId: 'chat-interface-basics',
          emoji: '📱',
          title: 'Master the Chat Interface',
          description:
            'Learn advanced chat features like file uploads, conversation starters, and chat history.',
          duration: '2-3 minutes',
        },
      ],
    },
  ],
}
