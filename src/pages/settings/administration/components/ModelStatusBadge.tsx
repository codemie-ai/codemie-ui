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

import { ModelStatus } from '@/types/entity/configuration'

const STATUS_CONFIG: Record<ModelStatus, { label: string; dotClass: string }> = {
  enabled: { label: 'Enabled', dotClass: 'bg-success-primary' },
  deprecated: { label: 'Deprecated', dotClass: 'bg-aborted-primary' },
  disabled: { label: 'Disabled', dotClass: 'bg-not-started-primary' },
}

const FALLBACK_CONFIG = { label: 'Unknown', dotClass: 'bg-not-started-primary' }

const ModelStatusBadge = ({ status }: { status: ModelStatus }) => {
  const { label, dotClass } = STATUS_CONFIG[status] ?? FALLBACK_CONFIG
  return (
    <span className="flex items-center gap-1.5">
      <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dotClass}`} aria-hidden="true" />
      <span className="text-sm text-text-primary">{label}</span>
    </span>
  )
}

export default ModelStatusBadge
