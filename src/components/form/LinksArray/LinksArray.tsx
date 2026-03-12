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

import { forwardRef } from 'react'

import ActionDeleteSvg from '@/assets/icons/delete.svg?react'
import PlusSvg from '@/assets/icons/plus.svg?react'
import Input from '@/components/form/Input'
import Select from '@/components/form/Select'
import TooltipButton from '@/components/TooltipButton'

import Button from '../../Button'

interface KataLink {
  title: string
  url: string
  type: string
}

interface LinksArrayProps {
  name?: string
  error?: string
  label?: string
  hint?: string
  id?: string
  value: KataLink[]
  className?: string
  onChange?: (value: KataLink[]) => void
}

const linkTypeOptions = [
  { label: 'Documentation', value: 'documentation' },
  { label: 'Video', value: 'video' },
  { label: 'Article', value: 'article' },
  { label: 'Tutorial', value: 'tutorial' },
  { label: 'Reference', value: 'reference' },
  { label: 'Tool', value: 'tool' },
  { label: 'Other', value: 'other' },
]

const LinksArray = forwardRef<HTMLDivElement, LinksArrayProps>(
  ({ name, error, label, hint, id, value, className, onChange }, ref) => {
    const removeItem = (index: number) => {
      const newItems = [...value]
      newItems.splice(index, 1)
      onChange?.(newItems)
    }

    const addEmptyItem = () => {
      const newItems = [...value, { title: '', url: '', type: 'documentation' }]
      onChange?.(newItems)
    }

    const handleItemChange = (index: number, field: keyof KataLink, newValue: string) => {
      const newItems = [...value]
      newItems[index] = { ...newItems[index], [field]: newValue }
      onChange?.(newItems)
    }

    return (
      <div ref={ref} className={className}>
        <div className="flex items-end mb-4">
          {label && (
            <label htmlFor={id} className="text-xs text-text-quaternary flex items-center gap-2">
              {label}
              {hint && <TooltipButton content={hint} />}
            </label>
          )}
          <Button type="secondary" className="ml-auto" onClick={addEmptyItem}>
            <PlusSvg /> Add Link
          </Button>
        </div>

        {value.map((link, index) => (
          <div
            key={index}
            className="mb-4 p-4 bg-surface-base-secondary border border-border-specific-panel-outline rounded-lg"
          >
            <div className="flex flex-col gap-3">
              {/* Title */}
              <Input
                fullWidth
                value={link.title}
                label="Link Title"
                placeholder="Enter link title"
                name={`${name}-title-${index}`}
                onChange={(e) => handleItemChange(index, 'title', e.target.value)}
                required
              />

              {/* URL */}
              <Input
                fullWidth
                type="url"
                value={link.url}
                label="URL"
                placeholder="https://example.com"
                name={`${name}-url-${index}`}
                onChange={(e) => handleItemChange(index, 'url', e.target.value)}
                required
              />

              {/* Type & Delete Button Row */}
              <div className="flex gap-2 items-end">
                <div className="flex-1">
                  <Select
                    value={link.type}
                    label="Type"
                    options={linkTypeOptions}
                    onChange={(e) => handleItemChange(index, 'type', e.value as string)}
                  />
                </div>
                <button
                  type="button"
                  className="border border-border-quaternary h-8 px-3 rounded-lg text-text-accent bg-surface-base-secondary hover:bg-button-surface-specific-secondary-button-hover flex items-center gap-2"
                  onClick={() => removeItem(index)}
                  aria-label={`Remove link at position ${index + 1}`}
                >
                  <ActionDeleteSvg /> Remove
                </button>
              </div>
            </div>
          </div>
        ))}

        {value.length === 0 && (
          <div className="text-center py-8 text-text-quaternary text-sm border border-dashed border-border-specific-panel-outline rounded-lg">
            No links added yet. Click &quot;Add Link&quot; to get started.
          </div>
        )}

        {error && <div className="mt-2 text-text-error text-sm">{error}</div>}
      </div>
    )
  }
)

LinksArray.displayName = 'LinksArray'

export default LinksArray
