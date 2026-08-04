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

export const APP_TITLE = 'EPAM AI/Run CodeMie'

export const ROUTE_ID_TO_TITLE: Record<string, string> = {
  // Chats
  'new-chat': 'Chats',
  chats: 'Chats',
  'shared-chat': 'Shared Chat',

  // Assistants — list views
  assistants: 'Assistants',
  'assistants-project': 'Assistants',
  'assistants-marketplace': 'Assistants Marketplace',
  'assistants-templates': 'Assistant Templates',
  'assistants-favorites': 'Assistants',

  // Assistants — forms / detail
  'new-assistant': 'New Assistant',
  'new-remote-assistant': 'New Assistant',
  'new-assistant-from-template': 'New Assistant',
  assistant: 'Assistant',
  'assistant-template': 'Assistant Template',
  'clone-assistant': 'Clone Assistant',
  'edit-assistant': 'Edit Assistant',
  'edit-remote-assistant': 'Edit Assistant',
  'assistant-by-slug': 'Assistant',
  'edit-assistant-by-slug': 'Edit Assistant',
  'start-assistant-chat': 'Assistant Chat',

  // Skills
  skills: 'Skills',
  'skills-project': 'Skills',
  'skills-marketplace': 'Skills Marketplace',
  'skills-favorites': 'Skills',
  'new-skill': 'New Skill',
  'skill-details': 'Skill',
  'edit-skill': 'Edit Skill',

  // Integrations
  integrations: 'Integrations',
  'new-user-integration': 'New Integration',
  'edit-user-integration': 'Edit Integration',
  'new-project-integration': 'New Integration',
  'edit-project-integration': 'Edit Integration',

  // Data Sources
  'data-sources': 'Data Sources',
  'data-source-details': 'Data Source',
  'edit-data-source': 'Edit Data Source',
  'create-data-source': 'New Data Source',

  // AI Katas
  katas: 'AI Katas',
  'new-kata': 'New Kata',
  'edit-kata': 'Edit Kata',
  'katas-in-progress': 'AI Katas',
  'katas-completed': 'AI Katas',
  'katas-leaderboard': 'AI Katas Leaderboard',
  'kata-detail': 'Kata',

  // Workflows
  workflows: 'Workflows',
  'workflows-all': 'Workflows',
  'workflows-my': 'Workflows',
  'workflows-templates': 'Workflow Templates',
  'workflows-favorites': 'Workflows',
  'workflows-marketplace': 'Workflows Marketplace',
  'new-workflow': 'New Workflow',
  'new-workflow-from-template': 'New Workflow',
  'clone-workflow': 'Clone Workflow',
  'edit-workflow': 'Edit Workflow',
  'view-workflow': 'Workflow',
  'workflow-execution': 'Workflow Execution',
  'view-workflow-template': 'Workflow Template',

  // Applications
  applications: 'Applications',
  'application-federation': 'Application',
  'application-iframe': 'Application',

  // AI Adoption Config
  'ai-adoption-config': 'AI Adoption Config',

  // Settings — general
  settings: 'Settings',
  'projects-management': 'Projects',
  'projects-management-detail': 'Project',
  'cost-centers-management': 'Cost Centers',
  'cost-centers-management-detail': 'Cost Center',
  'activity-events': 'Activity Events',
  'budgets-management': 'Budgets',
  'administration-users': 'Users',
  'teams-bot': 'Teams Bot',
  'teams-bot-project': 'Teams Bot',

  // Settings — providers
  'providers-management': 'Providers',
  'providers-create': 'New Provider',
  'providers-view': 'Provider',
  'providers-edit': 'Edit Provider',

  // Settings — AWS
  'aws-assistant-settings': 'AWS Assistant Settings',
  'aws-assistant-settings-detail': 'AWS Assistant Settings',
  'aws-workflow-settings': 'AWS Workflow Settings',
  'aws-workflow-settings-detail': 'AWS Workflow Settings',
  'aws-data-source-settings': 'AWS Data Source Settings',
  'aws-data-source-settings-detail': 'AWS Data Source Settings',
  'aws-guardrail-settings': 'AWS Guardrail Settings',
  'aws-guardrail-settings-detail': 'AWS Guardrail Settings',
  'aws-agentcore-runtimes-settings': 'AWS AgentCore Runtimes',
  'aws-agentcore-runtimes-settings-detail': 'AWS AgentCore Runtimes',
  'aws-agentcore-runtimes-settings-runtime': 'AWS AgentCore Runtime',

  // Analytics
  analytics: 'Analytics',
  'analytics-new-dashboard': 'New Dashboard',
  'analytics-edit-dashboard': 'Edit Dashboard',

  // Favorites
  favorites: 'Favorites',
  'favorites-assistants': 'Favorites',
  'favorites-workflows': 'Favorites',
  'favorites-skills': 'Favorites',

  // Other
  'release-notes': 'Release Notes',
  help: 'Help',
  'terms-and-conditions': 'Terms and Conditions',
}
