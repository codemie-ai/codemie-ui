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

import React from 'react'

import Button from '@/components/Button'
import { Checkbox } from '@/components/form/Checkbox'
import Popup from '@/components/Popup'
import { ButtonSize, ButtonType } from '@/constants'
import { MCPConfig } from '@/types/entity/mcp'

import { useMCPCopyValuesDialog } from './useMCPCopyValuesDialog'

interface MCPCopyValuesDialogProps {
  visible: boolean
  server: MCPConfig | null
  onHide: () => void
  onConfirm: (copyValues: string[]) => void
}

const SENSITIVE_HINT = 'May contain a sensitive value'

const capitalize = (value: string) => value.charAt(0).toUpperCase() + value.slice(1)

const MCPCopyValuesDialog: React.FC<MCPCopyValuesDialogProps> = ({
  visible,
  server,
  onHide,
  onConfirm,
}) => {
  const { sections, checked, toggleKey, toggleSection, reset, isSensitivePath } =
    useMCPCopyValuesDialog(server)

  const handleCancel = () => {
    reset()
    onHide()
  }

  const handleConfirm = () => {
    onConfirm(Array.from(checked))
    reset()
  }

  const footerContent = (
    <div className="flex justify-end gap-3">
      <Button variant={ButtonType.SECONDARY} size={ButtonSize.MEDIUM} onClick={handleCancel}>
        Cancel
      </Button>
      <Button variant={ButtonType.PRIMARY} size={ButtonSize.MEDIUM} onClick={handleConfirm}>
        Clone
      </Button>
    </div>
  )

  return (
    <Popup
      visible={visible}
      onHide={handleCancel}
      header="Copy values to clone"
      footerContent={footerContent}
      limitWidth
      bodyClassName="p-6 space-y-6"
    >
      {sections.map(({ section, keys }) => {
        const allChecked = keys.length > 0 && keys.every((key) => checked.has(key))

        return (
          <div key={section} className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm text-text-primary font-semibold">{capitalize(section)}</h3>
              <Checkbox
                label="Select all"
                checked={allChecked}
                onChange={() => toggleSection(section, keys)}
              />
            </div>
            <div className="space-y-2">
              {keys.map((key) => (
                <Checkbox
                  key={key}
                  label={key}
                  checked={checked.has(key)}
                  onChange={() => toggleKey(key)}
                  hint={isSensitivePath(key) ? SENSITIVE_HINT : undefined}
                />
              ))}
            </div>
          </div>
        )
      })}
    </Popup>
  )
}

export default MCPCopyValuesDialog
