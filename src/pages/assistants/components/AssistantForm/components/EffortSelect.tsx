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

import Select from '@/components/form/Select'
import InfoWarning from '@/components/InfoWarning'
import { InfoWarningType } from '@/constants'
import { EffortLevel } from '@/types/entity/assistant'

interface EffortSelectProps {
  levels: EffortLevel[]
  value?: string | null
  error?: string
  onChange: (value: string | null) => void
}

const EffortSelect = ({ levels, value, error, onChange }: EffortSelectProps) => (
  <Select
    label="Effort"
    placeholder="Effort"
    rootClassName="w-40"
    value={value ?? null}
    onChangeValue={(next) => onChange(next)}
    options={levels.map((level) => ({ label: level, value: level }))}
    error={error}
  />
)

export const EffortWarning = () => (
  <InfoWarning
    type={InfoWarningType.WARNING}
    message="Higher effort increases model thinking and may significantly increase token usage."
  />
)

export default EffortSelect
