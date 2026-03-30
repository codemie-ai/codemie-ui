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

import { Tab } from '@/components/Tabs/Tabs'

export const TAB_DATA = {
  CONFIGURATION: { ID: 'configuration', LABEL: 'Basic' },
  ADVANCED: { ID: 'advanced', LABEL: 'Advanced' },
  NODE: { ID: 'node', LABEL: '' },
  EDGE: { ID: 'edge', LABEL: 'Connection' },
  YAML: { ID: 'yaml', LABEL: 'YAML' },
  ISSUES: { ID: 'issues', LABEL: 'Issues' },
} as const

export type PanelTabId = (typeof TAB_DATA)[keyof typeof TAB_DATA]['ID']
export type PanelTab = Tab<PanelTabId>
