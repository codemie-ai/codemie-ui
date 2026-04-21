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
import { MCP_SETTINGS_TYPE } from '@/constants/settings'
import { OnboardingFlow } from '@/types/onboarding'
import { findOnboardingElement, setCredentialType as setType } from '@/utils/onboarding'

const CREDENTIAL_TYPES = {
  JIRA: 'jira',
  GIT: 'git',
  PLUGIN: 'plugin',
  MCP: MCP_SETTINGS_TYPE,
} as const

export const firstIntegrationFlow: OnboardingFlow = {
  id: 'first-integration',
  name: 'Connect Your First Integration',
  description: 'Walk through the integration form and configure Jira, Git, Plugin, and MCP types',
  emoji: '🔌',
  duration: '4-5 min',
  triggers: { helpPanelPages: [{ id: HelpPageId.INTEGRATIONS, firstTimePopup: true }] },
  steps: [
    // Step 1: Welcome
    {
      id: 'welcome',
      actionType: 'Modal',
      title: 'Welcome to Integrations',
      description: `Welcome to the Integrations tour!

Integrations give CodeMie secure, encrypted access to external systems — Jira, Git repositories, cloud services, databases, and more — so your assistants can act on your behalf without exposing credentials.

In this guide, you'll:
- Walk through every field on the integration creation form
- Learn the three integration scopes and when to use each
- See how Jira, Git, Plugin, and MCP integrations are configured

Let's open the form and get started!`,
    },

    // Tech: Navigate to the Create User Integration form
    {
      id: 'nav-create',
      actionType: 'Navigation',
      route: { name: 'new-user-integration' },
      delay: 300,
    },

    // Step 2: Project selector + Global toggle
    {
      id: 'project-scope-fields',
      actionType: 'Highlight',
      title: 'Choose Project and Scope',
      target: () => findOnboardingElement('integration-project-scope-fields'),
      description: `Every integration starts with these two fields:

- Project: assigns the integration to a specific project so its assistants and data sources can use it. Cannot be changed after saving.
- Global Integration: when enabled, this integration is available across all your projects. Ideal for credentials you reuse everywhere.

There are three integration scopes in total:
1. User — personal, scoped to one project
2. User Global — personal, usable across all your projects (this toggle)
3. Project — shared with all project members; requires admin role

When a tool needs an integration, CodeMie auto-selects the most specific one: User → User Global → Project.`,
    },

    // Step 3: Alias
    {
      id: 'alias-field',
      actionType: 'Highlight',
      title: 'Name Your Integration',
      target: () => findOnboardingElement('integration-alias-field'),
      description: `Give your integration a recognizable name — this is what appears in selectors when attaching it to an assistant or data source.

Good aliases are descriptive and include context:
✅ jira-my-project-prod
✅ github-personal
✅ plugin-local-dev
❌ test (not descriptive)
❌ integration1 (not specific)

The alias can be updated later from the integrations list.`,
    },

    // Step 4: Credential Type selector — announce the type walk-through
    {
      id: 'credential-type-field',
      actionType: 'Highlight',
      title: 'Pick Your Integration Type',
      target: () => findOnboardingElement('integration-credential-type-field'),
      description: `Select the external system you want to connect. The form adapts instantly — credential-specific fields appear right below once you choose a type.

We'll now walk through four examples to show the range of configurations:
- Jira — URL and API token
- Git — PAT or GitHub App authentication
- Plugin — a single generated key for the CodeMie Plugins CLI
- MCP — free-form environment variables for any MCP server`,
    },

    // Tech: Select Jira type
    {
      id: 'select-jira',
      actionType: 'CodeExecution',
      execute: () => setType(CREDENTIAL_TYPES.JIRA),
      onBack: () => setType(CREDENTIAL_TYPES.JIRA),
    },

    // Step 5: Jira fields
    {
      id: 'jira-fields',
      actionType: 'Highlight',
      title: 'Jira — URL and API Token',
      target: () => findOnboardingElement('integration-credential-fields'),
      description: `Connect to Jira Cloud or Jira Data Center / Server.

- URL: your Jira instance URL, e.g. https://yourcompany.atlassian.net/ (Cloud) or https://jira.yourcompany.com/ (Data Center)
- Is Jira Cloud: toggle on for Atlassian Cloud; off for self-hosted Data Center or Server
- Username / Email: required for Jira Cloud only (your Atlassian account email)
- Token: a Personal Access Token from your Jira account settings

Tip: Jira supports the Test Integration button — use it to verify credentials before saving.`,
    },

    // Tech: Select Git type
    {
      id: 'select-git',
      actionType: 'CodeExecution',
      execute: () => setType(CREDENTIAL_TYPES.GIT),
      onBack: () => setType(CREDENTIAL_TYPES.JIRA),
    },

    // Step 6: Git fields
    {
      id: 'git-fields',
      actionType: 'Highlight',
      title: 'Git — PAT or GitHub App Auth',
      target: () => findOnboardingElement('integration-credential-fields'),
      description: `Connect GitHub, GitLab, Bitbucket, or any self-hosted Git service.

- URL: your Git host root URL, e.g. https://github.com or https://gitlab.yourcompany.com
- Authentication Type: two options:
  · Personal Access Token — token name (e.g. oauth2) + token value; works with all providers
  · GitHub Application — App ID + Private Key (.pem) + optional Installation ID; preferred for GitHub organizations

Note: For Azure DevOps Server repositories over HTTPS, enable Use Header-Based Authentication — some on-premise servers require header auth rather than URL-embedded credentials.`,
    },

    // Tech: Select Plugin type
    {
      id: 'select-plugin',
      actionType: 'CodeExecution',
      execute: () => setType(CREDENTIAL_TYPES.PLUGIN),
      onBack: () => setType(CREDENTIAL_TYPES.GIT),
    },

    // Step 7: Plugin fields
    {
      id: 'plugin-fields',
      actionType: 'Highlight',
      title: 'Plugin — One Key, Full Local Access',
      target: () => findOnboardingElement('integration-credential-fields'),
      description: `The Plugin integration bridges your AI assistant to tools running on your local machine or remote environment via the CodeMie Plugins CLI.

- Plugin Key: a unique key generated by running the following command in your local environment:
  uvx codemie-plugins config generate-key

Once configured, the Plugin tool lets assistants read files, list directories, run shell commands, and host MCP servers — all executed locally on your machine.

Note: Copy and save the generated key immediately — it cannot be retrieved again after closing the terminal.`,
    },

    // Tech: Select MCP type
    {
      id: 'select-mcp',
      actionType: 'CodeExecution',
      execute: () => setType(CREDENTIAL_TYPES.MCP),
      onBack: () => setType(CREDENTIAL_TYPES.PLUGIN),
    },

    // Step 8: MCP fields
    {
      id: 'mcp-fields',
      actionType: 'Highlight',
      title: 'MCP — Free-Form Environment Variables',
      target: () => findOnboardingElement('integration-credential-fields'),
      description: `MCP (Model Context Protocol) is the only type that doesn't use fixed fields. Instead it exposes a free-form key-value editor for environment variables that the MCP server needs at runtime.

- Click Add Environment Variable to add a new row
- Enter the variable Key and its Value — values are stored encrypted and masked
- Add as many variables as your MCP server requires (e.g. API_KEY, BASE_URL, ORG_ID)

Once saved, this integration is available when configuring MCP server tools inside an assistant — select it to inject these variables into the MCP runtime without hardcoding secrets.`,
    },

    // Step 9: Save and Test actions
    {
      id: 'save-actions',
      actionType: 'Highlight',
      title: 'Verify and Save',
      target: () => findOnboardingElement('integration-save-actions'),
      description: `Before saving, click Test Integration (available for Jira, Confluence, AWS, Kubernetes, and others) to run a quick connectivity check against the external service.

Click Save to store your integration. Sensitive values — tokens, passwords, private keys, environment variable values — are encrypted at rest and always displayed in masked format. When editing later, leave masked fields unchanged if you only need to update non-sensitive values.

Once saved, your integration is ready to be selected in data sources and assistant tools.`,
    },

    // Step 10: Completion
    {
      id: 'completion',
      actionType: 'Modal',
      title: "You're All Set!",
      description: `Congratulations! You've completed the Integrations tour.

You now know how to:
✓ Understand the three integration scopes — User, User Global, and Project
✓ Fill in the common fields — project, global toggle, credential type, and alias
✓ Configure a Jira integration with URL, cloud toggle, and API token
✓ Set up a Git integration using Personal Access Token or GitHub App authentication
✓ Connect the Plugin integration with a locally generated Plugin Key
✓ Store MCP server environment variables securely with the free-form key-value editor`,
      suggestedNextFlows: [
        {
          flowId: 'assistants-overview',
          emoji: '🤖',
          title: 'Create Assistants with Integration Access',
          description:
            'Build an assistant and attach your new integration to enable tool-powered conversations',
          duration: '4-5 minutes',
        },
        {
          flowId: 'first-data-source',
          emoji: '📚',
          title: 'Add Your First Data Source',
          description:
            "Use your Git, Jira, or Confluence integration to index your organisation's knowledge",
          duration: '6-8 minutes',
        },
      ],
    },
  ],
}
