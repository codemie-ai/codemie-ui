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

import { FC, ReactNode, useState } from 'react'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import Button from '@/components/Button'
import { cn } from '@/utils/utils'

interface ConfigSectionProps {
  title: string
  icon?: string
  children: (isEditing: boolean) => ReactNode
  defaultExpanded?: boolean
  onSave?: () => Promise<void> | void
  onCancel?: () => void
  saving?: boolean
  error?: string
  hideEditButtons?: boolean
}

const ConfigSection: FC<ConfigSectionProps> = ({
  title,
  icon,
  children,
  defaultExpanded = true,
  onSave,
  onCancel,
  saving = false,
  error,
  hideEditButtons = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded)
  const [isEditing, setIsEditing] = useState(false)

  const handleEdit = () => {
    setIsEditing(true)
  }

  const handleSave = async () => {
    if (onSave) {
      await onSave()
    }
    setIsEditing(false)
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    }
    setIsEditing(false)
  }

  return (
    <div className="bg-surface-base-chat rounded-lg border border-border-primary">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-border-primary">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 flex-1 text-left group transition hover:opacity-85"
        >
          {icon && <span className="text-xl">{icon}</span>}
          <h3 className="font-bold text-text-quaternary">{title}</h3>
          <ChevronDownSvg
            className={cn(
              'w-4 h-4 text-text-quaternary transition-transform ml-2 group-hover:opacity-85',
              isExpanded ? 'rotate-180' : ''
            )}
          />
        </button>
        {!hideEditButtons && isExpanded && !isEditing && (
          <Button type="primary" size="small" onClick={handleEdit}>
            Edit
          </Button>
        )}
        {!hideEditButtons && isExpanded && isEditing && (
          <div className="flex gap-2">
            <Button type="secondary" size="small" onClick={handleCancel} disabled={saving}>
              Cancel
            </Button>
            <Button type="primary" size="small" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        )}
      </div>

      {/* Content */}
      {isExpanded && (
        <div className="p-6">
          <div className="space-y-6">{children(isEditing)}</div>

          {error && (
            <div className="mt-4 p-3 bg-failed-tertiary border border-border-error rounded text-sm text-text-error">
              {error}
            </div>
          )}

          {!hideEditButtons && isEditing && (
            <div className="flex justify-end gap-2 mt-6 pt-4 border-t border-border-primary">
              <Button type="secondary" size="small" onClick={handleCancel} disabled={saving}>
                Cancel
              </Button>
              <Button type="primary" size="small" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ConfigSection
