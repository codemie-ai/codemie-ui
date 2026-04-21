# Assistants Overview & Creation

**Name**: Assistants Overview & Creation
**Description**: Explore the assistants catalog, understand capabilities, and create your first custom assistant
**Target Audience**: Users ready to create custom AI assistants
**Estimated Duration**: 4-5 minutes
**Triggers**:
  - Help Panel Pages: assistants (firstTimePopup: true)
  - Show on Welcome: false
  - Release Versions: none

---

## Step 1: Welcome

**Title**: Welcome to Assistants
**Action Type**: Modal

**Message**:
```
Welcome to the Assistants tour!

Assistants are specialized AI agents that can be customized for specific tasks and purposes.

In this guide, you'll walk through the Create Assistant form and learn how to:
- Name and describe your assistant
- Write system instructions to shape its behavior
- Add tools that connect to external systems
- Save and share your assistant with your team

Let's open the Create Assistant form and get started!
```

---

## Tech Step: Navigate to Create Assistant Form

**Action Type**: Navigation
**Navigate To**: Create Assistant form page

---

## Step 2: Generate with AI

**Title**: Generate with AI
**Action Type**: Highlight
**Target**: "Generate with AI" button in the top-right header of the Create Assistant form

**Message**:
```
Not sure where to start? Click **Generate with AI** to describe your goal in plain language and let the platform configure the assistant for you — including its name, description, conversation starters, and system instructions.

This is the fastest way to get a working assistant up and running. You can always fine-tune the generated values afterwards.
```

---

## Step 3: Assistant Setup Section

**Title**: Name and Configure Your Assistant
**Action Type**: Highlight
**Target**: "Assistant Setup" accordion section at the top of the Create Assistant form

**Message**:
```
Fill in the core details that define your assistant:

- **Name** — a clear, descriptive name your team will recognise
- **Project** — the project this assistant belongs to
- **Shared with Project** — toggle on to let all team members use this assistant
- **Description** — explain the assistant's purpose so others can discover it easily
```

---

## Step 4: Conversation Starters

**Title**: Add Conversation Starters
**Action Type**: Highlight
**Target**: Conversation Starters field inside the Assistant Setup section

**Message**:
```
Conversation starters are suggested prompts shown to users when they open a chat with this assistant.

They help users understand what the assistant can do and give them a quick way to get started — especially useful for shared or published assistants.

Tip: Keep starters short and action-oriented, like "Review my pull request" or "Generate a Jira ticket for this bug".
```

---

## Step 5: Categories

**Title**: Organise with Categories
**Action Type**: Highlight
**Target**: Categories field inside the Assistant Setup section

**Message**:
```
Categories help you and your team organise and filter assistants in the catalog and Marketplace.

Assign one or more categories to your assistant so it's easy to discover — for example "Code Review", "QA", or "Project Management".

Tip: Categories are especially useful when publishing to the Marketplace, where users filter by category to find assistants for their use case.
```

---

## Step 6: System Instructions

**Title**: Define Assistant Behavior
**Action Type**: Highlight
**Target**: System Instructions text area inside the Assistant Setup section

**Message**:
```
System Instructions are the core prompt that shapes how your assistant thinks and responds.

- Set the assistant's role and tone (e.g. "You are a senior code reviewer…")
- Define rules and constraints it should follow
- Use built-in variables like `{{current_user}}` or `{{date}}` for dynamic context
- Click **Manage Prompt Vars** to create custom variables like `{{jira_project}}`

Good system instructions lead to consistent, high-quality responses.
```

---

## Tech Step: Expand Extra Configuration

**Action Type**: Code Execution
**Code Action**: Expand the "Extra configuration" accordion inside the Assistant Setup section if it is currently collapsed
**Back Action**: Collapse the "Extra configuration" accordion to restore its state before this step

---

## Step 7: Extra Configuration

**Title**: Fine-Tune Advanced Settings
**Action Type**: Highlight
**Target**: "Extra configuration" accordion section inside the Assistant Setup section

**Message**:
```
The Extra configuration section gives you fine-grained control over how the assistant generates responses:

- **LLM Model** — choose a specific language model instead of the project default
- **Temperature** (0–2) — higher values make responses more creative; lower values make them more focused and deterministic
- **Top P** (0–1) — controls response diversity; lower values narrow the assistant to more likely outputs
- **Slug** — a unique, human-readable identifier used to build a shareable link to this assistant

These settings are optional — the defaults work well for most use cases.
```

---

## Tech Step: Expand Context & Data Sources

**Action Type**: Code Execution
**Code Action**: Expand the "Context & Data Sources" accordion in the Create Assistant form if it is currently collapsed
**Back Action**: Collapse the "Context & Data Sources" accordion to restore its state before this step

---

## Step 8: Data Source Context

**Title**: Connect Data Sources
**Action Type**: Highlight
**Target**: "Datasource Context" selector and "+ Create" button inside the "Context & Data Sources" accordion

**Message**:
```
Connect your assistant to project knowledge so it can answer questions grounded in your data.

Use the dropdown to attach any already-indexed data sources — such as documentation repositories or code repositories. When a user asks a question, the assistant retrieves relevant context from these sources before responding, making answers far more accurate and specific to your project.

Don't have a data source yet? Click **+ Create** to set one up right here — without leaving the assistant form. A quick creation dialog will open, and once the new data source finishes indexing it will become available to select.

Note: Only data sources that have fully completed indexing are available for selection. Full data source management (editing, re-indexing, deletion) lives on the dedicated **Data Sources** page.
```

---

## Step 9: Sub-Assistants

**Title**: Add Sub-Assistants
**Action Type**: Highlight
**Target**: Sub-assistants selector field inside the "Context & Data Sources" accordion

**Message**:
```
Turn this assistant into an orchestrator by adding other assistants as sub-assistants.

The orchestrator receives the user's request and intelligently delegates tasks to the right specialist — for example routing a code review request to a Code Reviewer assistant and a Jira update to a Project Management assistant.

Note: Sub-assistants must belong to the same project and cannot themselves have sub-assistants.
```

---

## Tech Step: Expand Skills Section

**Action Type**: Code Execution
**Code Action**: Expand the "Skills" accordion in the Create Assistant form if it is currently collapsed
**Back Action**: Collapse the "Skills" accordion to restore its state before this step

---

## Step 10: Skills (Conditional)

**Title**: Supercharge with Skills
**Action Type**: Highlight
**Target**: "Skills" accordion section in the Create Assistant form
**Condition**: Only show if the Skills feature flag is enabled

**Message**:
```
Skills are reusable sets of instructions you can attach to an assistant to give it specialised knowledge — without bloating the system prompt.

Unlike static system instructions, skills load on-demand: the assistant evaluates each incoming message and only activates the skills that are relevant. For example, a "JIRA Ticket Structure" skill loads when the user asks to create a ticket, but stays out of the way for unrelated requests.

Benefits:
- **Modular** — build one skill and reuse it across many assistants
- **Efficient** — only relevant skills consume tokens per request
- **Collaborative** — share skills across your project or publish them to the Skills Marketplace

Skills can also be attached dynamically per conversation in the chat interface, without editing the assistant. Full skill management lives on the dedicated **Skills** page.
```

---

## Tech Step: Expand Tools Configuration

**Action Type**: Code Execution
**Code Action**: Expand the "Tools configuration" accordion in the Create Assistant form if it is currently collapsed
**Back Action**: Collapse the "Tools configuration" accordion to restore its state before this step

---

## Step 11: Browse Toolkits

**Title**: Browse Toolkits
**Action Type**: Highlight
**Target**: Left panel of the "Available Tools" sub-section inside the Tools configuration accordion

**Message**:
```
The left side of the Available Tools panel is a searchable list of all available toolkits.

Each toolkit represents an integration category — for example Jira, GitHub, Google Search, Confluence, or Kubernetes. Use the search bar at the top to filter by name if you already know what you're looking for.

Click any toolkit in the list to select it and see the tools it contains on the right.
```

---

## Step 12: Select Individual Tools

**Title**: Enable Specific Tools
**Action Type**: Highlight
**Target**: Right panel of the "Available Tools" sub-section inside the Tools configuration accordion

**Message**:
```
The right side shows the individual tools within the selected toolkit. Toggle each one on or off independently.

This granularity matters — for example, you might want your assistant to "Create Jira Issue" and "Search Jira Issues" but not "Delete Jira Issue".

Tip: Only enable the tools your assistant genuinely needs. Selecting too many slows down responses, increases costs, and can confuse the assistant about which action to use for a given request.
```

---

## Tech Step: Expand MCP Servers Accordion

**Action Type**: Code Execution
**Code Action**: Expand the "MCP Servers" accordion inside the Tools configuration accordion if it is currently collapsed
**Condition**: Only run if the MCP feature flag is enabled
**Back Action**: Collapse the "MCP Servers" accordion to restore its state before this step

---

## Step 13: MCP Servers (Conditional)

**Title**: Extend with MCP Servers
**Action Type**: Highlight
**Target**: "MCP Servers" sub-section inside the Tools configuration accordion
**Condition**: Only show if the MCP feature flag is enabled

**Message**:
```
MCP (Model Context Protocol) servers let you connect any external capability to your assistant — beyond the built-in toolkit library.

An MCP server is a small service that exposes tools to the assistant via a standard protocol. This means you can integrate with virtually any internal or third-party system, not just the ones natively supported by the platform.

There are two ways to add one: pick from the curated **Catalog** of pre-built servers, or configure your own with a **Custom** setup.
```

---

## Tech Step: Open MCP Catalog

**Action Type**: Code Execution
**Code Action**: Click the "Browse Catalog" button in the MCP Servers section to open the Browse MCP Servers popup
**Back Action**: Close the Browse MCP Servers popup

---

## Step 14: MCP Browse Catalog (Conditional)

**Title**: Browse the MCP Catalog
**Action Type**: Highlight
**Target**: First server card in the "Browse MCP Servers" popup grid (`data-onboarding="mcp-catalog-first-card"`)
**Condition**: Only show if the MCP feature flag is enabled

**Message**:
```
The catalog is a curated collection of pre-configured MCP servers ready to plug in.

Each card shows the server's name, category, and a short description. Click **Add** on a card to select it, then fill in any required environment variables (API keys, tokens, etc.) and click **Save**.

Use the **search bar** at the top to find a server by name, or the **category filter** to narrow results by topic.

The platform handles all the wiring — no manual server configuration needed.
```

---

## Tech Step: Close Catalog and Open Custom MCP Form

**Action Type**: Code Execution
**Code Action**: Close the Browse MCP Servers popup if open, then click "Add Custom" to open the custom MCP server configuration form
**Back Action**: Close the custom MCP server configuration form

---

## Step 15: MCP Custom Setup (Conditional)

**Title**: Configure a Custom MCP Server
**Action Type**: Highlight
**Target**: Form fields section inside the custom MCP server popup — Name, Command, Arguments, and environment variables fields (`data-onboarding="mcp-custom-form-fields"`)
**Condition**: Only show if the MCP feature flag is enabled

**Message**:
```
The custom form is a two-step wizard for connecting any MCP server.

**Step 1 — Configure MCP Server**: fill in the required fields:
- **Name** — a unique identifier for this server
- **Command** — the command used to invoke it (e.g. `uvx`)
- **Arguments** — any additional parameters, space-separated
- **Environment variables** — API keys or secrets the server needs

Prefer working with JSON? Switch to the JSON format tab and paste your configuration directly instead.

**Step 2 — Select Tools**: after configuring the server, choose exactly which of its tools to expose to the assistant.

Use **Test Integration** at any point to verify the server connection before saving.
```

---

## Step 16: Save Your Assistant

**Title**: Save and Start Chatting
**Action Type**: Highlight
**Target**: "Save" button in the top-right header of the Create Assistant form

**Message**:
```
Click **Save** to create your assistant.

After saving you can:
- Click the **Chat** icon to start a conversation immediately
- **Edit** at any time to refine instructions or tools
- **Share** with your project team via the Shared with Project toggle
- **Publish to Marketplace** to make it available to the wider community

Tip: Run a few test conversations after saving and iterate on the system instructions to improve quality.
```

---

## Step 17: Completion

**Title**: You're All Set!
**Action Type**: Modal

**Completion Message**:
```
Congratulations! You've completed the Assistants Overview tour.

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
✓ Save and share your assistant with the team
```

**Next Steps Suggestions**:
```
Continue your learning journey with these guided tours:

1. 📚 Add a Data Source
   Connect documentation or a code repository to give your assistant deep project knowledge.
   Duration: 3-4 minutes

2. 🔌 Connect Your First Integration
   Link Jira, GitHub, or other tools so your assistant can act — not just answer.
   Duration: 3-4 minutes

3. ⚡ Automate Tasks with Workflows
   Chain assistants and actions together into repeatable automated workflows.
   Duration: 4-5 minutes

4. 📱 Master the Chat Interface
   Learn advanced chat features like file uploads, conversation starters, and chat history.
   Duration: 2-3 minutes

You can skip these tours and start exploring on your own, or restart any tour from Help > Onboarding Tours.
```

---

**Last Updated**: 2026-04-10
**Version**: 1.3
