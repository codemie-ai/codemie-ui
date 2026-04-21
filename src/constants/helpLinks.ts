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

export enum HelpPageId {
  CHAT = 'chat',
  ASSISTANTS = 'assistants',
  WORKFLOWS = 'workflows',
  INTEGRATIONS = 'integrations',
  DATASOURCES = 'datasources',
  KATAS = 'katas',
}

export const DEFAULT_POPUP_TITLE = 'CodeMie Helper'
export const DEFAULT_POPUP_DESCRIPTION =
  "If you'd like to learn more or understand how it works in detail, check the resources below:"

// Map route IDs (from React Router) to help page IDs
export const ROUTE_ID_TO_PAGE_ID: Record<string, HelpPageId> = {
  // Chat
  chats: HelpPageId.CHAT,
  'chats-detail': HelpPageId.CHAT,

  // Assistants forms
  'new-assistant': HelpPageId.ASSISTANTS,
  'edit-assistant': HelpPageId.ASSISTANTS,
  'new-assistant-from-template': HelpPageId.ASSISTANTS,
  'clone-assistant': HelpPageId.ASSISTANTS,
  'new-remote-assistant': HelpPageId.ASSISTANTS,
  'edit-remote-assistant': HelpPageId.ASSISTANTS,

  // Workflows forms
  'new-workflow': HelpPageId.WORKFLOWS,
  'edit-workflow': HelpPageId.WORKFLOWS,
  'new-workflow-from-template': HelpPageId.WORKFLOWS,
  'clone-workflow': HelpPageId.WORKFLOWS,

  // Integrations forms
  'new-user-integration': HelpPageId.INTEGRATIONS,
  'edit-user-integration': HelpPageId.INTEGRATIONS,
  'new-project-integration': HelpPageId.INTEGRATIONS,
  'edit-project-integration': HelpPageId.INTEGRATIONS,

  // Katas forms
  'new-kata': HelpPageId.KATAS,
  'edit-kata': HelpPageId.KATAS,

  // Data Sources forms
  'edit-data-source': HelpPageId.DATASOURCES,
  'create-data-source': HelpPageId.DATASOURCES,
}

export const HELP_TOOLTIP_TEXT: Record<HelpPageId, string> = {
  [HelpPageId.CHAT]: 'Help & Product Tour',
  [HelpPageId.ASSISTANTS]: 'How to Work With Assistants',
  [HelpPageId.WORKFLOWS]: 'How to Work With Workflows',
  [HelpPageId.INTEGRATIONS]: 'How to Work With Integrations',
  [HelpPageId.DATASOURCES]: 'How to Work With Data Sources',
  [HelpPageId.KATAS]: 'How to Work With Katas',
}
