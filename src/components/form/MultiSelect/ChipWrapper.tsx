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

import { MultiSelectChangeEvent } from 'primereact/multiselect'
import React from 'react'

import XMarkSvg from '@/assets/icons/cross.svg?react'

interface ChipWrapperProps {
  option: unknown
  selectedItemTemplate: ((option: unknown) => React.ReactNode) | null | undefined
  preparedValue: unknown[]
  onChange: (e: MultiSelectChangeEvent) => void
}

export const ChipWrapper: React.FC<ChipWrapperProps> = ({
  option,
  selectedItemTemplate,
  preparedValue,
  onChange,
}) => {
  if (!option) return null

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    const newValues = preparedValue.filter((v) => v !== option)
    onChange({ value: newValues, target: { value: newValues } } as MultiSelectChangeEvent)
  }

  const content = selectedItemTemplate ? (
    selectedItemTemplate(option)
  ) : (
    <span>{String(option)}</span>
  )

  return (
    <span className="inline-flex items-center gap-1.5 py-0.5 px-2 h-7 rounded-lg border border-border-structural bg-surface-base-secondary text-text-primary font-geist-mono text-xs leading-6 font-semibold cursor-default">
      {content}
      <XMarkSvg
        className="w-4 h-4 ml-2 rounded-md leading-6 transition duration-200 ease-in-out cursor-pointer hover:text-text-quaternary"
        onClick={handleRemove}
      />
    </span>
  )
}
