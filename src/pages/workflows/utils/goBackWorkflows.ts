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

import {
  CHATS,
  WORKFLOWS_ALL,
  WORKFLOWS_MY,
  WORKFLOWS_TEMPLATES,
  VIEW_WORKFLOW,
  VIEW_WORKFLOW_TEMPLATE,
} from '@/constants/routes'
import { RouteOptions } from '@/hooks/useVueRouter'
import { navigateBack } from '@/utils/helpers'

export const goBackWorkflows = (
  defaultPath: string | (Partial<RouteOptions> & { name: string }) = WORKFLOWS_ALL
) => {
  navigateBack(
    defaultPath,
    CHATS,
    WORKFLOWS_ALL,
    WORKFLOWS_MY,
    WORKFLOWS_TEMPLATES,
    VIEW_WORKFLOW,
    VIEW_WORKFLOW_TEMPLATE
  )
}
