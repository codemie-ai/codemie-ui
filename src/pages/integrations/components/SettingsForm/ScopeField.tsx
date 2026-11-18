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

import InfoMessage from '@/components/Message/Message'
import SelectButton, { SelectButtonOption } from '@/components/SelectButton/SelectButton'
import { IntegrationScope } from '@/utils/integrationScope'

interface ScopeFieldProps {
  value: IntegrationScope
  disabled: boolean
  options: [SelectButtonOption, SelectButtonOption]
  onChange: (value: IntegrationScope) => void
  info: string
  lockedTooltip?: string
  typeSwitchNote: string
  projectClearedNote: boolean
}

/** Presentational Scope field: label, User/Project toggle, and its helper/status text. */
const ScopeField = ({
  value,
  disabled,
  options,
  onChange,
  info,
  lockedTooltip,
  typeSwitchNote,
  projectClearedNote,
}: ScopeFieldProps) => (
  <div data-onboarding="integration-scope-field" className="flex flex-col gap-2">
    <span id="integration-scope-label" className="text-h5 text-text-primary">
      Scope
    </span>
    <SelectButton
      value={value}
      disabled={disabled}
      ariaLabelledBy="integration-scope-label"
      options={options}
      onChange={(v) => onChange(v as IntegrationScope)}
    />
    <InfoMessage>{info}</InfoMessage>
    {lockedTooltip && <InfoMessage>{lockedTooltip}</InfoMessage>}
    {/* Mounted even with no note: a screen reader can miss a live region that is inserted
        together with its own content, so the <output> (implicit role="status") stays in the
        DOM and only its text changes. */}
    <output className="block text-xs text-text-quaternary">{typeSwitchNote}</output>
    <output className="block text-xs text-text-quaternary">
      {projectClearedNote
        ? 'Project was cleared: at Project scope you can pick only projects you administer.'
        : ''}
    </output>
  </div>
)

export default ScopeField
