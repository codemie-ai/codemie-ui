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

import CopySVG from '@/assets/icons/copy.svg?react'
import DeleteSVG from '@/assets/icons/delete.svg?react'
import Button from '@/components/Button'
import { ButtonType } from '@/constants/index'

interface TabFooterProps {
  onCancel?: () => void
  onSave?: () => void
  onDelete?: () => void
  onDuplicate?: () => void
  saveDisabled?: boolean
}

const TabFooter: React.FC<TabFooterProps> = ({
  onCancel,
  onSave,
  onDelete,
  onDuplicate,
  saveDisabled = false,
}) => {
  return (
    <div className="sticky bottom-0 py-4 mt-4 flex gap-2 justify-between bg-surface-base-chat border-t border-border-structural z-[10]">
      <div className="flex gap-2">
        {onDelete && (
          <Button
            variant={ButtonType.DELETE}
            onClick={onDelete}
            className="opacity-85 hover:opacity-100"
          >
            <DeleteSVG className="w-4 h-4" />
            Delete
          </Button>
        )}
        {onDuplicate && (
          <Button
            variant={ButtonType.SECONDARY}
            onClick={onDuplicate}
            className="opacity-85 hover:opacity-100"
          >
            <CopySVG className="w-4 h-4" />
            Duplicate
          </Button>
        )}
      </div>
      <div className="flex gap-2">
        {onCancel && (
          <Button variant={ButtonType.SECONDARY} onClick={onCancel}>
            Cancel
          </Button>
        )}

        {onSave && (
          <Button variant={ButtonType.PRIMARY} onClick={onSave} disabled={saveDisabled}>
            Save
          </Button>
        )}
      </div>
    </div>
  )
}

export default TabFooter
