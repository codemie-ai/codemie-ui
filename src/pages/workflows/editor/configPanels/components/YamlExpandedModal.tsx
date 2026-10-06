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

import CollapseSvg from '@/assets/icons/collapse.svg?react'
import AceEditor from '@/components/AceEditor/AceEditor'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'
import { cn } from '@/utils/utils'

interface YamlExpandedModalProps {
  visible: boolean
  value: string
  validationError: string | null
  onChange: (value: string) => void
  onCollapse: () => void
}

const YamlExpandedModal = ({
  visible,
  value,
  validationError,
  onChange,
  onCollapse,
}: YamlExpandedModalProps) => {
  return (
    <Popup
      hideFooter
      hideClose
      isFullWidth
      visible={visible}
      onHide={onCollapse}
      className="h-[90vh] pb-6"
      headerContent={
        <div className="flex w-full items-center justify-between py-1">
          <span className="text-sm font-semibold font-mono text-text-primary">
            YAML Configuration
          </span>
          <Button variant={ButtonType.SECONDARY} onClick={onCollapse}>
            <CollapseSvg />
            Collapse
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-2">
        {validationError && (
          <div className="text-failed-secondary text-xs">YAML Error: {validationError}</div>
        )}
        <div
          className={cn('h-[calc(90vh-8rem)] rounded-lg border border-transparent', {
            'border-failed-secondary': validationError,
          })}
        >
          <AceEditor
            value={value}
            onChange={onChange}
            lang="yaml"
            name="yaml_config_expanded"
            showInvisibles
          />
        </div>
      </div>
    </Popup>
  )
}

export default YamlExpandedModal
