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

import { ReactNode } from 'react'

import AceEditor from '@/components/AceEditor/AceEditor'

import ExpandedYamlFrame from './ExpandedYamlFrame'
import ExpandedYamlShell from './ExpandedYamlShell'

interface ExpandedYamlViewProps {
  visible: boolean
  onCollapse: () => void
  label?: string
  title?: string
  value: string
  onChange?: (value: string) => void
  readonly?: boolean
  wrap?: boolean
  validationError?: string | null
  actions?: ReactNode
}

const ExpandedYamlView = ({
  visible,
  onCollapse,
  label,
  title,
  value,
  onChange,
  readonly = false,
  wrap = false,
  validationError,
  actions,
}: ExpandedYamlViewProps) => (
  <ExpandedYamlShell visible={visible} onCollapse={onCollapse} label={label}>
    <div className="flex min-h-0 flex-1 flex-col gap-2">
      <div
        data-testid="yaml-validation-error"
        className="h-4 shrink-0 truncate text-failed-secondary text-xs"
        title={validationError ?? undefined}
      >
        {validationError && `YAML Error: ${validationError}`}
      </div>
      <ExpandedYamlFrame title={title} actions={actions} invalid={Boolean(validationError)}>
        <AceEditor
          value={value}
          onChange={onChange}
          lang="yaml"
          name="yaml_config_expanded"
          readonly={readonly}
          wrap={wrap}
          showInvisibles={!readonly}
        />
      </ExpandedYamlFrame>
    </div>
  </ExpandedYamlShell>
)

export default ExpandedYamlView
