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

import StatusBadge, { StatusEnum } from '@/components/StatusBadge'
import { ModelOption } from '@/types/entity/configuration'
import { FilterOption } from '@/types/filters'

export const getModelOptions = (
  models: readonly Pick<ModelOption, 'value' | 'label' | 'status'>[]
): FilterOption[] =>
  models.map((model) => ({
    value: model.value,
    label: model.label,
    disabled: model.status === 'deprecated',
    badge: model.status === 'deprecated' ? 'Deprecated' : undefined,
  }))

export const renderModelOption = (option: FilterOption) => (
  <div className="flex min-w-0 items-center gap-2">
    <span className="truncate">{option.label}</span>
    {option.badge && <StatusBadge status={StatusEnum.NotStarted} text={option.badge} />}
  </div>
)
