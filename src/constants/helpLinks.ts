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
  ASSISTANTS = 'assistants',
  WORKFLOWS = 'workflows',
  INTEGRATIONS = 'integrations',
  DATASOURCES = 'datasources',
  KATAS = 'katas',
}

export const DEFAULT_POPUP_TITLE = 'CodeMie Helper'
export const DEFAULT_POPUP_DESCRIPTION =
  "If you'd like to learn more or understand how it works in detail, check the resources below:"

export const HELP_TOOLTIP_TEXT: Record<HelpPageId, string> = {
  [HelpPageId.ASSISTANTS]: 'How to Work With Assistants',
  [HelpPageId.WORKFLOWS]: 'How to Work With Workflows',
  [HelpPageId.INTEGRATIONS]: 'How to Work With Integrations',
  [HelpPageId.DATASOURCES]: 'How to Work With Data Sources',
  [HelpPageId.KATAS]: 'How to Work With Katas',
}
