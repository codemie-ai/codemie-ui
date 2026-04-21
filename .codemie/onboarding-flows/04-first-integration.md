# Connect Your First Integration

**Name**: Connect Your First Integration
**Description**: Walk through the integration creation form field by field, then explore four credential types — Jira, Git, Plugin, and MCP
**Target Audience**: Users ready to connect external tools and services to CodeMie
**Estimated Duration**: 4-5 minutes
**Triggers**:
  - Help Panel Pages: integrations (firstTimePopup: true)
  - Show on Welcome: false
  - Release Versions: none

---

## Step 1: Welcome

**Title**: Welcome to Integrations
**Action Type**: Modal

**Message**:
```
Welcome to the Integrations tour!

Integrations give CodeMie secure, encrypted access to external systems — Jira, Git repositories, cloud services, databases, and more — so your assistants can act on your behalf without exposing credentials.

In this guide, you'll:
- Walk through every field on the integration creation form
- Learn the three integration scopes and when to use each
- See how Jira, Git, Plugin, and MCP integrations are configured

Let's open the form and get started!
```

---

## Tech Step: Navigate to Create User Integration Form

**Action Type**: Navigation
**Navigate To**: Create User Integration form

---

## Step 2: Project and Global Toggle

**Title**: Choose Project and Scope
**Action Type**: Highlight
**Target**: Project selector at the top of the Create User Integration form, and the Global Integration toggle with its description below it

**Message**:
```
Every integration starts with these two fields:

- **Project** — assigns the integration to a specific project so its assistants and data sources can use it. Cannot be changed after saving.
- **Global Integration** — when enabled, this integration is available across all your projects. Ideal for personal credentials you reuse everywhere.

There are three integration scopes in total:
1. **User** — personal, scoped to one project
2. **User Global** — personal, usable across all your projects (this toggle)
3. **Project** — shared with all project members; requires admin role

When a tool needs an integration, CodeMie auto-selects the most specific one: User → User Global → Project.
```

---

## Step 3: Alias

**Title**: Name Your Integration
**Action Type**: Highlight
**Target**: Alias input field in the Create User Integration form

**Message**:
```
Give your integration a recognizable name — this is what appears in selectors when attaching it to an assistant or data source.

Good aliases are descriptive and include context:
✅ `jira-my-project-prod`
✅ `github-personal`
✅ `plugin-local-dev`
❌ `test` (not descriptive)
❌ `integration1` (not specific)

The alias can be updated later from the integrations list.
```

---

## Step 4: Credential Type

**Title**: Pick Your Integration Type
**Action Type**: Highlight
**Target**: Credential Type dropdown in the Create User Integration form

**Message**:
```
Select the external system you want to connect. The form adapts instantly — credential-specific fields appear right below once you choose a type.

We'll now walk through four examples to show the range of configurations:
- **Jira** — URL and API token
- **Git** — PAT or GitHub App authentication
- **Plugin** — a single generated key for the CodeMie Plugins CLI
- **MCP** — free-form environment variables for any MCP server
```

---

## Tech Step: Select Jira Type

**Action Type**: Code Execution
**Code Action**: Select "Jira" in the Credential Type dropdown to reveal the Jira-specific credential fields
**Back Action**: Reset the Credential Type dropdown to its default (first available) selection

---

## Step 5: Jira — URL and API Token

**Title**: Jira — URL and API Token
**Action Type**: Highlight
**Target**: Jira-specific credential fields below the Alias input — URL field, Is Jira Cloud toggle, Username/email field, and Token field

**Message**:
```
Connect to Jira Cloud or Jira Data Center / Server.

- **URL** — your Jira instance URL, e.g. `https://yourcompany.atlassian.net/` (Cloud) or `https://jira.yourcompany.com/` (Data Center)
- **Is Jira Cloud** — toggle on for Atlassian Cloud; off for self-hosted Data Center or Server
- **Username / Email** — required for Jira Cloud only (your Atlassian account email)
- **Token** — a Personal Access Token from your Jira account settings

Tip: Jira supports the Test Integration button — click it to verify your credentials before saving.
```

---

## Tech Step: Select Git Type

**Action Type**: Code Execution
**Code Action**: Select "Git" in the Credential Type dropdown
**Back Action**: Select "Jira" in the Credential Type dropdown

---

## Step 6: Git — PAT or GitHub App

**Title**: Git — PAT or GitHub App Auth
**Action Type**: Highlight
**Target**: Git-specific credential fields — URL field, Authentication Type selector, and the fields that appear below it (Token Name and Token for PAT; App ID, Private Key, and Installation ID for GitHub Application)

**Message**:
```
Connect GitHub, GitLab, Bitbucket, or any self-hosted Git service.

- **URL** — your Git host root URL, e.g. `https://github.com` or `https://gitlab.yourcompany.com`
- **Authentication Type** — two options:
  - **Personal Access Token** — token name (e.g. `oauth2`) + token value; works with all providers
  - **GitHub Application** — App ID + Private Key (.pem contents) + optional Installation ID; preferred for GitHub organizations

Note: For Azure DevOps Server repositories over HTTPS, enable **Use Header-Based Authentication** — some on-premise servers require header auth rather than URL-embedded credentials.
```

---

## Tech Step: Select Plugin Type

**Action Type**: Code Execution
**Code Action**: Select "Plugin" in the Credential Type dropdown
**Back Action**: Select "Git" in the Credential Type dropdown

---

## Step 7: Plugin — Local Development Bridge

**Title**: Plugin — One Key, Full Local Access
**Action Type**: Highlight
**Target**: Plugin Key field revealed below the Alias input after selecting the Plugin credential type

**Message**:
```
The Plugin integration bridges your AI assistant to tools running on your local machine or remote environment via the CodeMie Plugins CLI.

- **Plugin Key** — a unique key generated by running `uvx codemie-plugins config generate-key` in your local environment

Once configured, the Plugin tool lets assistants read files, list directories, run shell commands, and host MCP servers — all executed locally on your machine.

Note: Copy and save the generated key immediately; it cannot be retrieved again after closing the terminal.
```

---

## Tech Step: Select MCP Type

**Action Type**: Code Execution
**Code Action**: Select "MCP" in the Credential Type dropdown
**Back Action**: Select "Plugin" in the Credential Type dropdown

---

## Step 8: MCP — Environment Variables

**Title**: MCP — Free-Form Environment Variables
**Action Type**: Highlight
**Target**: Environment Variables key-value input area revealed below the Alias input after selecting the MCP credential type — including the Add Environment Variable button

**Message**:
```
MCP (Model Context Protocol) is the only type that doesn't use fixed fields. Instead it exposes a free-form key-value editor for environment variables that the MCP server needs at runtime.

- Click **Add Environment Variable** to add a new row
- Enter the variable **Key** and its **Value** — values are stored encrypted and masked
- Add as many variables as your MCP server requires (e.g. `API_KEY`, `BASE_URL`, `ORG_ID`)

Once saved, this integration is available when configuring MCP server tools inside an assistant — select it to inject these variables into the MCP runtime without hardcoding secrets.
```

---

## Step 9: Save and Test

**Title**: Verify and Save
**Action Type**: Highlight
**Target**: Test Integration button and Save button in the top-right corner of the New User Integration page header

**Message**:
```
Before saving, click **Test Integration** (available for Jira, Confluence, AWS, Kubernetes, and others) to run a quick connectivity check against the external service.

Click **Save** to store your integration. Sensitive values — tokens, passwords, private keys, environment variable values — are encrypted at rest and always displayed in masked format. When editing later, leave masked fields unchanged if you only need to update non-sensitive values.

Once saved, your integration is ready to be selected in data sources and assistant tools.
```

---

## Step 10: Completion

**Title**: You're All Set!
**Action Type**: Modal

**Completion Message**:
```
Congratulations! You've completed the Integrations tour.

You now know how to:
✓ Understand the three integration scopes — User, User Global, and Project
✓ Fill in the common fields — project, global toggle, type, and alias
✓ Configure a Jira integration with URL, cloud toggle, and API token
✓ Set up a Git integration using Personal Access Token or GitHub App authentication
✓ Connect the Plugin integration with a locally generated Plugin Key
✓ Store MCP server environment variables securely with the free-form key-value editor
```

**Next Steps Suggestions**:

The modal should display a "Continue Learning" or "What's Next?" section with the following suggested flows:

```
Continue your learning journey with these guided tours:

1. 🤖 Create Assistants with Integration Access
   Build an assistant and attach your new integration to enable tool-powered conversations.
   Duration: 4-5 minutes

2. ⚡ Build Workflows with Integrations
   Automate multi-step tasks that read from Jira, commit to Git, or trigger cloud operations.
   Duration: 4-5 minutes

3. 📚 Add Your First Data Source
   Use your Git, Jira, or Confluence integration to index your organisation's knowledge.
   Duration: 6-8 minutes

4. 📊 Track Usage in Analytics
   Monitor how your integrations are being used across assistants and workflows.
   Duration: 2-3 minutes

You can skip these tours and start exploring on your own, or restart any tour from Help > Onboarding Tours.
```

**Implementation Note**: These suggestions should be clickable and start the respective onboarding flow when selected. Allow users to:
- Click a suggestion to start that flow immediately
- Dismiss the modal to explore on their own
- Access "Skip for now" option

---

**Last Updated**: 2026-04-15
**Version**: 1.1
