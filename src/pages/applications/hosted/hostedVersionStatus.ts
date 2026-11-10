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

import { StatusEnum, type StatusType } from '@/components/StatusBadge/StatusBadge'
import type { VersionState } from '@/types/entity/hostedApplication'

export const HOSTED_VERSION_STATUS: Record<VersionState, { status: StatusType; label: string }> = {
  uploading: { status: StatusEnum.InProgress, label: 'Uploading' },
  queued: { status: StatusEnum.Pending, label: 'Queued' },
  validating: { status: StatusEnum.InProgress, label: 'Checking' },
  awaiting_configuration: { status: StatusEnum.Warning, label: 'Needs setup' },
  accepted: { status: StatusEnum.Success, label: 'Ready' },
  rejected: { status: StatusEnum.Error, label: 'Rejected' },
  failed: { status: StatusEnum.Error, label: 'Failed' },
  canceled: { status: StatusEnum.NotStarted, label: 'Canceled' },
}

/** The badge for a version state; a state the server added later shows under its own name. */
export const hostedVersionStatus = (state: string) =>
  HOSTED_VERSION_STATUS[state as VersionState] ?? {
    status: StatusEnum.NotStarted,
    label: state,
  }

export const HOSTED_VERSION_IN_PROGRESS: VersionState[] = [
  'uploading',
  'queued',
  'validating',
  'awaiting_configuration',
]

export const formatBytes = (bytes: number) => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 ** 2) return (bytes / 1024).toFixed(1) + ' KiB'
  if (bytes < 1024 ** 3) return (bytes / 1024 ** 2).toFixed(1) + ' MiB'
  return (bytes / 1024 ** 3).toFixed(1) + ' GiB'
}
