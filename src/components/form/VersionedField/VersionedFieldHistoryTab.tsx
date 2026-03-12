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

import LoaderSvg from '@/assets/icons/loader.svg?react'

import Button from '../../Button'
import Autocomplete from '../Autocomplete'

export interface VersionedFieldOption {
  label: string
  value: string
}

interface VersionedFieldHistoryTabProps {
  isLoading?: boolean
  children: ReactNode
  selectedOption?: string | null
  emptyPlaceholder: string
  options: VersionedFieldOption[]
  headerContent?: ReactNode
  onRestore: () => void
  onOptionChange: (optionValue: string) => void
}

const VersionedFieldHistoryTab = ({
  isLoading,
  options,
  children,
  selectedOption,
  emptyPlaceholder,
  headerContent,
  onRestore,
  onOptionChange,
}: VersionedFieldHistoryTabProps) => {
  const isHistoryAvailable = options.length > 0

  return (
    <div className="flex flex-col gap-2 h-full">
      {isHistoryAvailable ? (
        <>
          <div className="flex items-center gap-4 mb-2">
            <Autocomplete
              placeholder="Select a version"
              options={options}
              value={selectedOption ?? ''}
              onChange={(value) => onOptionChange(value)}
            />

            <div className="flex gap-4 items-center">
              {isLoading ? (
                <LoaderSvg className="w-[66.3px] animate-spin" />
              ) : (
                <Button onClick={onRestore}>Restore</Button>
              )}
              {headerContent}
            </div>
          </div>
          <div className="grow">{children}</div>
        </>
      ) : (
        <h1 className="text-md text-center">{emptyPlaceholder ?? 'Value was not yet modified'}</h1>
      )}
    </div>
  )
}

export default VersionedFieldHistoryTab
