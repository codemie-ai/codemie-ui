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

import { INDEX_TYPES } from '@/constants/dataSources'
import { HelpPageId } from '@/constants/helpLinks'
import { dataSourceStore } from '@/store/dataSources'
import { OnboardingFlow } from '@/types/onboarding'
import { findOnboardingElement, setIndexType as setType } from '@/utils/onboarding'

export const firstDataSourceFlow: OnboardingFlow = {
  id: 'first-data-source',
  name: 'Add Your First Data Source',
  description: "Connect a data source to give assistants access to your organization's knowledge",
  emoji: '📚',
  duration: '6-8 min',
  triggers: { helpPanelPages: [{ id: HelpPageId.DATASOURCES, firstTimePopup: true }] },
  steps: [
    // Step 1: Welcome
    {
      id: 'welcome',
      actionType: 'Modal',
      title: 'Welcome to Data Sources',
      description: `Welcome to the Data Sources tour!

Data Sources provide your AI assistants with access to your organization's knowledge, documents, and information.

In this guide, you'll discover how to:
- Understand different data source types
- Connect your first data source
- Index and manage content
- Attach data sources to assistants

Let's add your first knowledge base and make your assistants smarter!`,
    },

    // Tech: Navigate to create page
    {
      id: 'nav-create',
      actionType: 'Navigation',
      route: { name: 'create-data-source' },
      delay: 300,
    },

    // Step 2: Common fields
    {
      id: 'common-fields',
      actionType: 'Highlight',
      title: 'Common Data Source Fields',
      target: () => findOnboardingElement('datasource-common-fields'),
      description: `Every data source starts with these common fields:

- Project: select the project this data source belongs to
- Shared with project: toggle to share the data source with all project members
- Name: a unique identifier for this data source (4-25 characters)
- Description: describe the content — used by the AI for smarter retrieval

A clear description helps assistants understand when to use this data source.`,
    },

    // Step 3: Type selector intro
    {
      id: 'type-selector',
      actionType: 'Highlight',
      title: 'Data Source Type',
      target: () => findOnboardingElement('datasource-type-selector-section'),
      description: `Choose the type of data source you want to connect.

CodeMie supports a wide range of connectors — code repositories, wikis, issue trackers, file uploads, and more.

In the next steps we will walk through each available type so you can see what fields each one requires.`,
    },

    // Tech: Select Git type
    {
      id: 'select-git',
      actionType: 'CodeExecution',
      execute: () => setType(INDEX_TYPES.GIT),
      onBack: () => setType(''),
    },

    // Step 3: Git fields
    {
      id: 'git-fields',
      actionType: 'Highlight',
      title: 'Git / Code Repository',
      target: () => findOnboardingElement('datasource-git-fields'),
      description: `The Git type indexes source code repositories from GitHub, GitLab, Bitbucket, and more.

Key fields:
- Summarization Method: how to index the codebase — Whole codebase (raw file chunks), Summarization per file (AI summary per file), or Summarization per chunks (AI summary per chunk)
- Repository Link: full URL of the repository (e.g. https://gitlab.example.com/codemie)
- Branch: branch to index (e.g. main)
- Files Filter: glob-style patterns to include or exclude files (e.g. *.py to include only Python files, !*.nupkg to exclude a type). Leave empty to index everything
- Model used for embeddings: embedding model for semantic search
- Model used for summary generation: LLM used when a summarization method is selected
- Select integration for Git: integration with stored credentials for private repos

Git data sources are great for codebase Q&A, code reviews, and documentation lookups.`,
    },

    // Tech: Select Confluence type
    {
      id: 'select-confluence',
      actionType: 'CodeExecution',
      execute: () => setType(INDEX_TYPES.CONFLUENCE),
      onBack: () => setType(INDEX_TYPES.GIT),
    },

    // Step 4: Confluence fields
    {
      id: 'confluence-fields',
      actionType: 'Highlight',
      title: 'Confluence',
      target: () => findOnboardingElement('datasource-confluence-fields'),
      description: `The Confluence type indexes pages from your Atlassian Confluence workspace.

Key fields:
- CQL Query: Confluence Query Language to select which pages to index (e.g. space = "MYSPACE")
- Integration: select your configured Confluence integration
- Embedding Model: model used to generate vector embeddings for semantic search

Confluence data sources are ideal for team wikis, documentation, and knowledge bases.`,
    },

    // Tech: Select Jira type
    {
      id: 'select-jira',
      actionType: 'CodeExecution',
      execute: () => setType(INDEX_TYPES.JIRA),
      onBack: () => setType(INDEX_TYPES.CONFLUENCE),
    },

    // Step 5: Jira fields
    {
      id: 'jira-fields',
      actionType: 'Highlight',
      title: 'Jira',
      target: () => findOnboardingElement('datasource-jira-fields'),
      description: `The Jira type indexes issues, epics, and stories from your Jira project.

Key fields:
- JQL Query: Jira Query Language to filter issues (e.g. project = "MYPROJECT" AND status != Done)
- Integration: select your configured Jira integration

Jira data sources let assistants answer questions about project status, sprint progress, and ticket details.`,
    },

    // Tech: Select Xray type
    {
      id: 'select-xray',
      actionType: 'CodeExecution',
      execute: () => setType(INDEX_TYPES.XRAY),
      onBack: () => setType(INDEX_TYPES.JIRA),
    },

    // Step 6: Xray fields
    {
      id: 'xray-fields',
      actionType: 'Highlight',
      title: 'Xray (Test Management)',
      target: () => findOnboardingElement('datasource-xray-fields'),
      description: `The Xray type indexes test cases, test plans, and test executions from Xray for Jira.

Key fields:
- JQL Query: filter which Xray test issues to index
- Integration: select your configured Jira/Xray integration

Xray data sources allow assistants to help with test coverage analysis, test case generation, and QA reporting.`,
    },

    // Tech: Select File type
    {
      id: 'select-file',
      actionType: 'CodeExecution',
      execute: () => setType(INDEX_TYPES.FILE),
      onBack: () => setType(INDEX_TYPES.XRAY),
    },

    // Step 7: File fields
    {
      id: 'file-fields',
      actionType: 'Highlight',
      title: 'File Upload',
      target: () => findOnboardingElement('datasource-file-fields'),
      description: `The File type indexes documents you upload directly.

Supported formats:
- PDF documents
- Word (.docx) and PowerPoint (.pptx) files
- Text files (.txt, .md)
- CSV data files (up to 100 MB)

File data sources are perfect for indexing internal policies, reports, and documents that aren't hosted on an external service.`,
    },

    // Tech: Select Google type
    {
      id: 'select-google',
      actionType: 'CodeExecution',
      execute: () => setType(INDEX_TYPES.GOOGLE),
      onBack: () => setType(INDEX_TYPES.FILE),
    },

    // Step 8: Google Docs fields
    {
      id: 'google-fields',
      actionType: 'Highlight',
      title: 'Google Docs',
      target: () => findOnboardingElement('datasource-google-fields'),
      description: `The Google Docs type indexes documents from Google Drive.

Key fields:
- Google Doc URL: URL of a specific Google Doc to index
- Integration: select your configured Google integration

Use Google Docs data sources to index meeting notes, specifications, and any documents stored in Google Drive.`,
    },

    // Tech: Select Azure DevOps Wiki type
    {
      id: 'select-azure-wiki',
      actionType: 'CodeExecution',
      execute: () => setType(INDEX_TYPES.AZURE_DEVOPS_WIKI),
      onBack: () => setType(INDEX_TYPES.GOOGLE),
    },

    // Step 9: Azure DevOps Wiki fields
    {
      id: 'azure-wiki-fields',
      actionType: 'Highlight',
      title: 'Azure DevOps Wiki',
      target: () => findOnboardingElement('datasource-azure-wiki-fields'),
      description: `The Azure DevOps Wiki type indexes wiki pages from Azure DevOps projects.

Key fields:
- Wiki Name: name of the Azure DevOps wiki to index
- Integration: select your configured Azure DevOps integration

Azure DevOps Wiki data sources are useful for development documentation, architectural decisions, and project guidelines.`,
    },

    // Tech: Select Azure DevOps Work Item type
    {
      id: 'select-azure-workitem',
      actionType: 'CodeExecution',
      execute: () => setType(INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM),
      onBack: () => setType(INDEX_TYPES.AZURE_DEVOPS_WIKI),
    },

    // Step 10: Azure DevOps Work Item fields
    {
      id: 'azure-workitem-fields',
      actionType: 'Highlight',
      title: 'Azure DevOps Work Items',
      target: () => findOnboardingElement('datasource-azure-workitem-fields'),
      description: `The Azure DevOps Work Items type indexes work items (tasks, bugs, user stories) from Azure DevOps.

Key fields:
- WIQL Query: Work Item Query Language to filter which items to index
- Integration: select your configured Azure DevOps integration

Work Item data sources enable assistants to help with sprint planning, backlog analysis, and project status tracking.`,
    },

    // Tech: Select SharePoint type
    {
      id: 'select-sharepoint',
      actionType: 'CodeExecution',
      execute: () => setType(INDEX_TYPES.SHAREPOINT),
      onBack: () => setType(INDEX_TYPES.AZURE_DEVOPS_WORK_ITEM),
    },

    // Step 11: SharePoint fields
    {
      id: 'sharepoint-fields',
      actionType: 'Highlight',
      title: 'SharePoint',
      target: () => findOnboardingElement('datasource-sharepoint-fields'),
      description: `The SharePoint type indexes documents and pages from Microsoft SharePoint.

Key fields:
- Site URL: URL of the SharePoint site to index
- Authentication Type: choose between Integration (service account), OAuth (user consent), or Custom OAuth
- Integration: select your configured SharePoint integration

SharePoint data sources are ideal for enterprise document management, intranet content, and company policies.`,
    },

    // Tech: Select Bedrock type
    {
      id: 'select-bedrock',
      actionType: 'CodeExecution',
      execute: () => setType(INDEX_TYPES.BEDROCK),
      onBack: () => setType(INDEX_TYPES.SHAREPOINT),
    },

    // Step 12: Bedrock (AWS Knowledge Bases)
    {
      id: 'bedrock-fields',
      actionType: 'Highlight',
      title: 'AWS Knowledge Bases (Bedrock)',
      target: () => findOnboardingElement('datasource-type-selector-section'),
      description: `The AWS Knowledge Bases type connects to pre-built Amazon Bedrock Knowledge Bases.

This type uses your existing AWS Bedrock infrastructure, so there are no additional field-level configurations needed here. The connection is managed entirely through your AWS credentials and the Bedrock Knowledge Base ID configured at the platform level.

Use this type to leverage AWS Bedrock's managed RAG pipeline alongside CodeMie.`,
    },

    // Tech: Select Provider type (conditional on provider schemas being available)
    {
      id: 'select-provider',
      actionType: 'CodeExecution',
      condition: () => dataSourceStore.indexProviderSchemas.length > 0,
      execute: () => {
        const firstName = dataSourceStore.indexProviderSchemas[0]?.name
        if (firstName) setType(firstName)
      },
      onBack: () => setType(INDEX_TYPES.BEDROCK),
    },

    // Step 13: Provider fields (conditional)
    {
      id: 'provider-fields',
      actionType: 'Highlight',
      title: 'Custom Providers',
      target: () => findOnboardingElement('datasource-provider-fields'),
      condition: () => dataSourceStore.indexProviderSchemas.length > 0,
      description: `Your platform has custom data source providers installed.

Custom providers extend CodeMie with additional data source types specific to your organization — for example, internal databases, proprietary document systems, or industry-specific data pipelines.

Each provider has its own set of configuration fields defined by your platform administrator.`,
    },

    // Tech: Switch back to Git for schedule demonstration
    {
      id: 'select-git-for-schedule',
      actionType: 'CodeExecution',
      execute: () => setType(INDEX_TYPES.GIT),
      onBack: () => {
        const hasProviders = dataSourceStore.indexProviderSchemas.length > 0
        const backType = hasProviders
          ? dataSourceStore.indexProviderSchemas[0]?.name ?? INDEX_TYPES.BEDROCK
          : INDEX_TYPES.BEDROCK
        setType(backType)
      },
    },

    // Step 14: Schedule field
    {
      id: 'schedule-field',
      actionType: 'Highlight',
      title: 'Automatic Reindexing Schedule',
      target: () => findOnboardingElement('datasource-schedule-field'),
      description: `Set up an automatic reindexing schedule so your data source stays up to date.

Options:
- Leave blank for manual-only reindexing
- Enter a cron expression for recurring updates (e.g. 0 2 * * * for daily at 2 AM)
- Use the schedule builder for a visual setup

Scheduled reindexing ensures your assistants always have access to the latest version of your data without manual intervention.

Manual reindexing is always available from the data sources list.`,
    },

    // Step 15: Completion
    {
      id: 'completion',
      actionType: 'Modal',
      title: "You're Ready to Connect Data Sources!",
      description: `Congratulations! You've completed the Data Sources tour.

You now know how to configure:
✓ Common fields: project, name, and description
✓ Git repositories for code and documentation
✓ Confluence, Jira, and Xray for Atlassian tools
✓ File uploads for static documents
✓ Google Docs for Drive content
✓ Azure DevOps Wiki and Work Items
✓ SharePoint for enterprise documents
✓ AWS Knowledge Bases (Bedrock)
✓ Automatic reindexing schedules

Create your first data source and attach it to an assistant to unlock knowledge-driven conversations!`,
      suggestedNextFlows: [
        {
          flowId: 'data-source-list',
          emoji: '📋',
          title: 'Data Sources List & Indexing',
          description:
            'Learn how to monitor indexing status, trigger reindexing, and manage your data sources',
          duration: '2-3 minutes',
        },
        {
          flowId: 'assistants-overview',
          emoji: '🤖',
          title: 'Creating Your First Assistant',
          description:
            'Build a custom assistant and attach data sources to give it domain knowledge',
          duration: '4-5 minutes',
        },
        {
          flowId: 'first-integration',
          emoji: '🔌',
          title: 'Connect Your First Integration',
          description:
            'Link external tools like Jira, GitHub, or Confluence to power your data sources',
          duration: '3-4 minutes',
        },
      ],
    },
  ],
}
