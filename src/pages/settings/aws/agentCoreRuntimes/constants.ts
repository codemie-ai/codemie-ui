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

import { StatusEnum, StatusType } from '@/components/StatusBadge/StatusBadge'
import { AgentCoreEndpointStatus } from '@/types/entity/vendor'

export const AGENTCORE_STATUSES = {
  READY: 'Ready',
  NOT_READY: 'Not Ready',
  DELETED_ON_AWS: 'Deleted on AWS',
}

export const ENDPOINT_STATUSES = {
  PREPARED: 'Ready',
  NOT_PREPARED: 'Not Ready',
  VERSION_DRIFT: 'Version Drift',
  DELETED_ON_AWS: 'Deleted on AWS',
}

export const IMPORT_INVOCATION_PLACEHOLDER = '__QUERY_PLACEHOLDER__'

export const IMPORT_MODES = {
  INSTALL: 'install',
  REINSTALL: 'reinstall',
  CONFIGURE: 'configure',
} as const

export type ImportMode = (typeof IMPORT_MODES)[keyof typeof IMPORT_MODES]

export const RUNTIME_BADGE_MAP: Record<string, { text: string; statusEnum: StatusType }> = {
  [AgentCoreEndpointStatus.PREPARED]: {
    text: AGENTCORE_STATUSES.READY,
    statusEnum: StatusEnum.Success,
  },
  [AgentCoreEndpointStatus.NOT_PREPARED]: {
    text: AGENTCORE_STATUSES.NOT_READY,
    statusEnum: StatusEnum.InProgress,
  },
  [AgentCoreEndpointStatus.DELETED_ON_AWS]: {
    text: AGENTCORE_STATUSES.DELETED_ON_AWS,
    statusEnum: StatusEnum.Error,
  },
}
