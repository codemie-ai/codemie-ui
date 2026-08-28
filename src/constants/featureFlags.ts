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

/**
 * Feature flag constants used across the application
 */
export const FEATURE_FLAGS = {
  ENTERPRISE_EDITION: 'features:enterpriseEdition',
  USER_MANAGEMENT: 'features:userManagement',
  BUDGET_MANAGEMENT: 'features:budgetManagement',
  FAVORITES: 'features:favorites',
  PINNED_ASSISTANTS: 'features:pinnedAssistants',
  FAVORITES_PAGE: 'features:favoritesPage',
  MCP_CONNECT: 'mcpConnect',
  SHOW_ALL_PROJECTS: 'features:showAllProjects',
  REQUEST_HEDGING: 'features:requestHedging',
  TEAMS_BOT_INTEGRATION: 'features:teamsBotIntegration',
  WORKFLOW_AI: 'features:workflowAI',
  CHAT_CONTEXTUAL_NAMING: 'features:chatContextualNaming',
  SUB_WORKFLOW: 'features:subWorkflow',
} as const

export type FeatureFlag = (typeof FEATURE_FLAGS)[keyof typeof FEATURE_FLAGS]
