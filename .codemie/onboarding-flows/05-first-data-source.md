# Add Your First Data Source

**Name**: Add Your First Data Source
**Description**: Walk through every data source type on the creation form, then learn to monitor indexing status on the list page
**Target Audience**: Users ready to connect their organisation's knowledge to assistants
**Estimated Duration**: 6-8 minutes
**Triggers**:
  - Help Panel Pages: datasources (firstTimePopup: true)
  - Show on Welcome: false
  - Release Versions: none

---

## Step 1: Welcome

**Title**: Welcome to Data Sources
**Action Type**: Modal

**Message**:
```
Welcome to the Data Sources tour!

Data sources give your assistants access to your organisation's knowledge — source code, documentation, project tickets, uploaded files, and more.

In this guide, you'll:
- Walk through the creation form field by field
- See the specific configuration for every supported data source type
- Set an automatic reindex schedule
- Learn to monitor indexing progress on the data sources list

Let's open the creation form and explore each type!
```

---

## Tech Step: Navigate to Create Data Source Form

**Action Type**: Navigation
**Navigate To**: Create Data Source form

---

## Step 2: Common Fields

**Title**: Set Up the Basics
**Action Type**: Highlight
**Target**: Project selector, Shared with Project toggle, Name field, and Description textarea at the top of the Create Data Source form

**Message**:
```
Every data source starts with these fields regardless of type:

- **Project** — assigns the data source to a project so its assistants can use it
- **Shared with Project** — when on, all project members can attach this source to their assistants
- **Name** — 4–25 characters, lowercase only; hyphens (-) and underscores (_) allowed; no spaces; cannot be changed after creation
- **Description** — a short note about the content

Next we'll select a type in the Type selector below — the form then reveals the type-specific fields. Let's walk through each one.
```

---

## Tech Step: Select Git Type

**Action Type**: Code Execution
**Code Action**: Select "Git" in the Data Source Type dropdown to reveal Git-specific configuration fields
**Back Action**: Reset the Data Source Type dropdown to no selection

---

## Step 3: Git — Code Repository

**Title**: Git — Index a Code Repository
**Action Type**: Highlight
**Target**: Git-specific configuration fields revealed below the type selector — Indexing Type, Repository Link, Branch, Files Filter, Integration, and Embedding Model

**Message**:
```
Index source code from GitHub, GitLab, or Bitbucket. Requires a Git integration.

- **Indexing Type** — choose how code is chunked: whole codebase, per-file summarization, or chunk-based summarization
- **Repository Link** — the HTTPS or SSH URL of the repository
- **Branch** — the branch to index (defaults to the repository default)
- **Files Filter** — `*.py` to whitelist, `!*.nupkg` to blacklist, or leave empty for everything
- **Integration** — the connected Git account for authentication
- **Embedding Model** — model used to generate vector embeddings
```

---

## Tech Step: Select Confluence Type

**Action Type**: Code Execution
**Code Action**: Select "Confluence" in the Data Source Type dropdown
**Back Action**: Select "Git" in the Data Source Type dropdown

---

## Step 4: Confluence — Documentation Pages

**Title**: Confluence — Index Wiki Pages
**Action Type**: Highlight
**Target**: Confluence-specific fields — CQL Query input, Integration selector, and Embedding Model

**Message**:
```
Index Confluence pages using CQL (Confluence Query Language). Requires a Confluence integration with a personal access token.

- **CQL Query** — filters which pages to index, for example:
  `space = CODEMIE AND type = page AND ancestor = 1593803553`
- **Integration** — the Confluence integration that provides authentication
- **Embedding Model** — model used for semantic search

Tip: Start with a narrow query (one space or parent page) to validate your setup, then expand the scope.
```

---

## Tech Step: Select Jira Type

**Action Type**: Code Execution
**Code Action**: Select "Jira" in the Data Source Type dropdown
**Back Action**: Select "Confluence" in the Data Source Type dropdown

---

## Step 5: Jira — Project Issues

**Title**: Jira — Index Issues with JQL
**Action Type**: Highlight
**Target**: Jira-specific fields — JQL Query input, Integration selector, and Embedding Model

**Message**:
```
Index Jira issues filtered by JQL (Jira Query Language). Requires a Jira integration with an API token.

- **JQL Query** — filters which issues to index, for example:
  `project = "MY_PROJECT" AND assignee = "John Doe"`
- **Integration** — the Jira integration that provides authentication
- **Embedding Model** — model used for semantic search

Jira is the only type that supports **incremental indexing** — re-runs fetch only issues changed since the last run, making large project re-indexes much faster.
```

---

## Tech Step: Select X-ray Type

**Action Type**: Code Execution
**Code Action**: Select "X-ray" in the Data Source Type dropdown
**Back Action**: Select "Jira" in the Data Source Type dropdown

---

## Step 6: X-ray — Test Cases

**Title**: X-ray — Index Test Cases
**Action Type**: Highlight
**Target**: X-ray-specific fields — JQL Query input, X-ray Integration selector, and Embedding Model

**Message**:
```
Index X-ray test cases filtered by JQL. Requires X-ray API credentials (Client ID + Client Secret), not a standard Jira token.

- **JQL Query** — filters test cases, for example:
  `project = "WEB" AND issuetype = "Test"`
- **X-ray Integration** — the integration holding your X-ray API credentials
- **Embedding Model** — model used for semantic search

What gets indexed: test case details, test type, metadata, custom fields, and issue links.
```

---

## Tech Step: Select File Type

**Action Type**: Code Execution
**Code Action**: Select "File" in the Data Source Type dropdown
**Back Action**: Select "X-ray" in the Data Source Type dropdown

---

## Step 7: File — Direct Upload

**Title**: File — Upload Documents Directly
**Action Type**: Highlight
**Target**: File upload area and file-type-specific configuration fields (Separator, Start Row, Rows Per Document for CSV; content structure note for JSON)

**Message**:
```
Upload documents without any external integration. Maximum 100 MB per file.

Supported formats: PDF, DOCX, XLSX, PPTX, CSV, JSON, XML, YAML/YML, TXT

Extra options by format:
- **CSV** — configure separator (`;`, `,`, or Tab), start row, and rows per document
- **JSON** — recommended structure: `{ "content": "...", "metadata": { ... } }`

Note: File sources have no automatic reindex schedule — re-upload when content changes.
```

---

## Tech Step: Select Google Docs Type

**Action Type**: Code Execution
**Code Action**: Select "Google" in the Data Source Type dropdown
**Back Action**: Select "File" in the Data Source Type dropdown

---

## Step 8: Google Docs

**Title**: Google Docs — Index a Document
**Action Type**: Highlight
**Target**: Google Docs-specific fields — Document URL, Embedding Model, and Integration selector

**Message**:
```
Index a single Google document shared with the CodeMie service account.

- **Document URL** — the full URL of the Google Doc to index
- **Embedding Model** — model used for semantic search

Two requirements before creating:
1. The document must use triple-numeration headings (1.1.1. style) with Heading 3 formatting
2. The document must be shared with: `codemie-kb-crawler@or2-msq-epmd-edp-anthos-t1iylu.iam.gserviceaccount.com`
```

---

## Tech Step: Select Azure DevOps Wiki Type

**Action Type**: Code Execution
**Code Action**: Select "Azure DevOps Wiki" in the Data Source Type dropdown
**Back Action**: Select "Google" in the Data Source Type dropdown

---

## Step 9: Azure DevOps Wiki

**Title**: Azure DevOps Wiki — Index Wiki Pages
**Action Type**: Highlight
**Target**: Azure DevOps Wiki-specific fields — Integration selector, Wiki Name, Page Path Query, and Embedding Model

**Message**:
```
Index Azure DevOps wiki pages, inline comments, and attachments (including OCR for images). Requires an Azure DevOps integration with a PAT that has read access to wiki, comments, and attachments.

- **Integration** — the Azure DevOps integration for authentication
- **Wiki Name** — optional; leave empty to index all wikis in the project
- **Page Path Query** — optional path filter starting from the page level (not the breadcrumb prefix)
- **Embedding Model** — model used for semantic search
```

---

## Tech Step: Select Azure DevOps Work Item Type

**Action Type**: Code Execution
**Code Action**: Select "Azure DevOps Work Item" in the Data Source Type dropdown
**Back Action**: Select "Azure DevOps Wiki" in the Data Source Type dropdown

---

## Step 10: Azure DevOps Work Item

**Title**: Azure DevOps Work Item — Index Work Items
**Action Type**: Highlight
**Target**: Azure DevOps Work Item-specific fields revealed below the type selector — Integration selector, query or filter fields, and Embedding Model

**Message**:
```
Index work items (tasks, bugs, user stories) from Azure DevOps. Uses the same Azure DevOps integration as the Wiki type.

- **Integration** — the Azure DevOps integration for authentication
- **Embedding Model** — model used for semantic search

Use this type to give assistants context about your team's planned and in-progress work — complementing the Wiki type which covers documentation.
```

---

## Tech Step: Select SharePoint Type

**Action Type**: Code Execution
**Code Action**: Select "SharePoint" in the Data Source Type dropdown
**Back Action**: Select "Azure DevOps Work Item" in the Data Source Type dropdown

---

## Step 11: SharePoint

**Title**: SharePoint — Index SharePoint Content
**Action Type**: Highlight
**Target**: SharePoint-specific configuration fields revealed below the type selector, including Microsoft sign-in and content type selectors

**Message**:
```
Index content from SharePoint sites using Microsoft 365 authentication.

Authentication uses an interactive Microsoft sign-in flow (device code) rather than a stored integration — follow the on-screen instructions to authorise access.

- Select which **content types** to index (pages, documents, lists)
- Configure the **site URL** and any path filters

Note: SharePoint does not support automatic reindex schedules — trigger re-indexing manually from the data sources list.
```

---

## Tech Step: Select AWS Knowledge Bases Type

**Action Type**: Code Execution
**Code Action**: Select "AWS Knowledge Bases" in the Data Source Type dropdown
**Back Action**: Select "SharePoint" in the Data Source Type dropdown

---

## Step 12: AWS Knowledge Bases

**Title**: AWS Knowledge Bases — Connect Amazon Bedrock
**Action Type**: Highlight
**Target**: AWS Knowledge Bases-specific fields — Knowledge Base ID, AWS Integration selector, and Embedding Model

**Message**:
```
Connect an existing Amazon Bedrock Knowledge Base rather than indexing raw content — CodeMie queries it directly.

- **Knowledge Base ID** — the ID from your AWS Bedrock console
- **AWS Integration** — an AWS integration configured with an IAM user that has `bedrock:Retrieve` and `bedrock:GetKnowledgeBase` permissions
- **Embedding Model** — model used for semantic search

Supports automatic reindex schedules, like most other integration-based types.
```

---

## Tech Step: Select Provider Type

**Action Type**: Code Execution
**Code Action**: Select the first available Provider type in the Data Source Type dropdown
**Back Action**: Select "AWS Knowledge Bases" in the Data Source Type dropdown

---

## Step 13: Provider — External Analysis Toolkit

**Title**: Provider — Connect an Analysis Toolkit
**Action Type**: Highlight
**Target**: Provider-specific fields revealed below the type selector — optional Graph DB credentials and Code Analysis Datasources selector
**Condition**: Only show if at least one Provider type is registered in the system (visible in the type dropdown)

**Message**:
```
Provider connects an indexed code repository to an external analysis toolkit registered by an admin.

- **Graph DB** — optional credentials for graph-based code analysis
- **Code Analysis Datasources** — link to an already-indexed data source (e.g. a Git source) that the provider toolkit will analyse

Provider tools are then added to an assistant's External Tools section — they can be used with or without a data source context.

Note: Provider is admin-configured and has no automatic reindex schedule.
```

---

## Tech Step: Select Git Type for Scheduler Demo

**Action Type**: Code Execution
**Code Action**: Select "Git" in the Data Source Type dropdown to reveal the Reindex Schedule field
**Back Action**: Restore the type selector to the Provider type

---

## Step 14: Reindex Schedule

**Title**: Keep Your Data Fresh Automatically
**Action Type**: Highlight
**Target**: Reindex Schedule / Cron Schedule input field near the bottom of the Create Data Source form

**Message**:
```
Set an automatic reindex schedule so your data stays up to date without manual effort.

Options: No schedule · Every hour · Daily at midnight · Weekly · Monthly · Custom cron

Available for: Git, Confluence, Jira, Google Docs, Azure DevOps Wiki, X-ray, AWS Knowledge Bases
Not available for: File (manual re-upload only), SharePoint (manual only), Provider (no scheduler)

How it works on schedule:
- Most types run a Full Reindex — all content is re-fetched and re-embedded
- Jira runs an Incremental Reindex — only fetches issues changed since the last run
```

---

## Step 15: Completion

**Title**: You're All Set!
**Action Type**: Modal

**Completion Message**:
```
Congratulations! You've completed the Data Source Types tour.

You now know how to:
✓ Fill in the common fields — project, sharing, name, and description
✓ Configure Git repositories with indexing modes and file filters
✓ Write CQL queries for Confluence and JQL queries for Jira and X-ray
✓ Upload files directly without any integration
✓ Set up Google Docs, Azure DevOps, SharePoint, and AWS Knowledge Bases sources
✓ Connect Provider sources to external analysis toolkits
✓ Set a reindex schedule to keep data automatically up to date
```

**Next Steps Suggestions**:

The modal should display a "Continue Learning" or "What's Next?" section with the following suggested flows:

```
Continue your learning journey with these guided tours:

1. 📚 Manage Your Data Sources
   Learn to track indexing status, trigger re-indexes, and filter your sources on the data sources list.
   Duration: 2-3 minutes

2. 🤖 Attach Data Sources to Assistants
   Open the Create Assistant form and connect your indexed data source to ground responses in your project knowledge.
   Duration: 4-5 minutes

3. ⚡ Use Data Sources in Workflows
   Chain data source lookups into automated multi-step workflows for knowledge-driven automation.
   Duration: 4-5 minutes

4. 🔌 Connect Your First Integration
   Set up a Git, Jira, or Confluence integration so your query-based and code sources can authenticate.
   Duration: 3-4 minutes

You can skip these tours and start exploring on your own, or restart any tour from Help > Onboarding Tours.
```

**Implementation Note**: These suggestions should be clickable and start the respective onboarding flow when selected. Allow users to:
- Click a suggestion to start that flow immediately
- Dismiss the modal to explore on their own
- Access "Skip for now" option

---

**Last Updated**: 2026-04-15
**Version**: 1.3
