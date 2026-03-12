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

export const ONBOARDING_ASSISTANT_SLUG = import.meta.env.VITE_ONBOARDING_ASSISTANT_SLUG
export const FEEDBACK_ASSISTANT_SLUG = import.meta.env.VITE_FEEDBACK_ASSISTANT_SLUG
export const CHATBOT_ASSISTANT_SLUG = import.meta.env.VITE_CHATBOT_ASSISTANT_SLUG
export const PROMPT_ENGINEER_SLUG = import.meta.env.VITE_PROMPT_ENGINEER_SLUG

interface AssistantEnvVariable {
  apiKey: string
  formKey: string
  formLabel: string
  defaultValue: string
  required: boolean
  options?: Array<{ value: string; label: string }>
}

export enum AssistantReaction {
  LIKE = 'like',
  DISLIKE = 'dislike',
}

export const ASSISTANT_TEMPLATE_HEADER = 'Assistant Template Details'
export const ASSISTANT_HEADER = 'Assistant Details'

export enum AssistantType {
  CODEMIE = 'codemie',
  A2A = 'A2A',
  REMOTE = 'remote',
  BEDROCK = 'bedrock_agent',
}

export const ASSISTANT_INDEX_SCOPES = {
  /**
   * Returns assistants available for the specified project, plus all marketplace assistants.
   *
   * @remarks
   * - Includes assistants that are specific to the selected project.
   * - Marketplace assistants are always included, regardless of project selection.
   * - Admins can query assistants for all projects.
   *
   */
  PROJECT_WITH_MARKETPLACE: 'project_with_marketplace',
  VISIBLE_TO_USER: 'visible_to_user',
  MARKETPLACE: 'marketplace',
  NONE: 'none',
  ALL: 'all',
}

export type AssistantIndexScope =
  (typeof ASSISTANT_INDEX_SCOPES)[keyof typeof ASSISTANT_INDEX_SCOPES]

export const ASSISTANT_STORAGE_KEYS = {
  ASSISTANT_FILTERS: 'assistant_filters',
  MARKETPLACE_FILTERS: 'marketplace_filters',
}

export const TOOLKITS = {
  Git: 'Git',
  VCS: 'VCS',
  CodebaseTools: 'Codebase Tools',
  KnowledgeBase: 'Knowledge Base',
  Research: 'Research',
  Cloud: 'Cloud',
  Plugin: 'Plugin',
  AzureDevOpsWiki: 'Azure DevOps Wiki',
  AzureDevOpsWorkItem: 'Azure DevOps Work Item',
  AzureDevOpsTestPlan: 'Azure DevOps Test Plan',
  AccessManagement: 'Access Management',
  ProjectManagement: 'Project Management',
  OpenAPI: 'OpenAPI',
  Notification: 'Notification',
  DataManagement: 'Data Management',
  FileSystem: 'FileSystem',
  QualityAssurance: 'Quality Assurance',
  ITServiceManagement: 'IT Service Management',

  MCP: 'MCP',
} as const

export const TOOLKIT_ORDER_KEYS = [
  'Git',
  'VCS',
  'Codebase Tools',
  'Research',
  'Cloud',
  'Azure DevOps Wiki',
  'Azure DevOps Work Item',
  'Azure DevOps Test Plan',
  'Access Management',
  'Project Management',
  'Plugin',
  'OpenAPI',
  'Notification',
  'Data Management',
  'File Management',
  'Quality Assurance',
  'IT Service Management',
  'Knowledge Base',
  'Code plan',
  'General',
  'CodeMie admin',
  'Vision',
  'FileSystem',
  'Pandas',
  'PDF',
  'TEXT',
  'PowerPoint',
  'Code Quality',
  'Open API',
  'File System',
]

export const MCP_CONFIG_SAMPLE = `Configuration Format Requirements

The configuration must be a valid JSON:
- A required "command".
- Optional fields such as "args" (array),
"env" (object), and "auth_token" (string)

Example:
{
  "command": "uvx",
  "args": ["mcp-server", "--option"],
  "env": {
    "ENV": "NOT SENSITIVE"
  }
}
`

export const assistantEnvVariables: AssistantEnvVariable[] = [
  {
    apiKey: 'AZURE_OPENAI_URL',
    formKey: 'openApiUrl',
    formLabel: 'AZURE_OPENAI_URL',
    defaultValue: 'https://ai-proxy.lab.epam.com',
    required: true,
  },
  {
    apiKey: 'AZURE_OPENAI_API_KEY',
    formKey: 'openApiKey',
    formLabel: 'AZURE_OPENAI_API_KEY',
    defaultValue: '',
    required: true,
  },
  {
    apiKey: 'OPENAI_API_TYPE',
    formKey: 'openApiType',
    formLabel: 'OPENAI_API_TYPE',
    defaultValue: 'azure',
    required: true,
  },
  {
    apiKey: 'OPENAI_API_VERSION',
    formKey: 'openApiVersion',
    formLabel: 'OPENAI_API_VERSION',
    defaultValue: '2024-02-15-preview',
    required: true,
  },
  {
    apiKey: 'MODELS_ENV',
    formKey: 'modelsEnv',
    formLabel: 'MODELS_ENV',
    defaultValue: 'dial',
    options: [
      { value: 'dial', label: 'dial' },
      { value: 'azure', label: 'azure' },
    ],
    required: true,
  },
]

export const TOOLKIT_KEY = 'toolkit'

export type ToolkitType = (typeof TOOLKITS)[keyof typeof TOOLKITS]

export const MCP_TOOLKIT = {
  toolkit: TOOLKITS.MCP,
  settings_config: false,
  label: 'MCP Servers',
  is_external: true,
  tools: [],
} as const

export const FILTER_INITIAL_STATE: {
  search: string
  project: string[]
  created_by: string
  is_global: boolean | null
  shared: boolean | null
  categories: string[]
} = {
  search: '',
  project: [],
  created_by: '',
  is_global: null,
  shared: null,
  categories: [],
}
