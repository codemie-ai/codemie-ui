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

import { ReactNode, useState } from 'react'

import LoaderSvg from '@/assets/icons/loader.svg?react'
import ConfirmationModal from '@/components/ConfirmationModal'
import { ButtonType } from '@/constants'

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
  canRestore?: boolean
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
  canRestore = true,
}: VersionedFieldHistoryTabProps) => {
  const [showRestoreConfirm, setShowRestoreConfirm] = useState(false)
  const isHistoryAvailable = options.length > 0

  const handleRestoreClick = () => setShowRestoreConfirm(true)
  const handleRestoreCancel = () => setShowRestoreConfirm(false)
  const handleRestoreConfirm = () => {
    setShowRestoreConfirm(false)
    onRestore()
  }

  return (
    <div className="flex flex-col gap-2 h-full">
      {isHistoryAvailable ? (
        <>
          <div className="flex gap-4 items-center self-end w-1/2">
            <Autocomplete
              placeholder="Select a version"
              options={options}
              value={selectedOption ?? ''}
              onChange={(value) => {
                setShowRestoreConfirm(false)
                onOptionChange(value)
              }}
            />

            <div className="flex gap-4 items-center">
              {canRestore &&
                (isLoading ? (
                  <LoaderSvg className="w-[66.3px] animate-spin" />
                ) : (
                  <Button onClick={handleRestoreClick}>Restore</Button>
                ))}
              {headerContent}
            </div>
          </div>

          <div className="flex items-center shrink-0 px-4 h-8 bg-surface-base-secondary border border-border-structural rounded-md">
            <p className="font-mono text-xs text-text-secondary leading-4">
              Review the changes below. Lines highlighted in{' '}
              <span className="text-failed-secondary font-semibold">red</span> will be removed,
              lines in <span className="text-success-primary font-semibold">green</span> will be
              added.
            </p>
          </div>

          <div className="grow">{children}</div>
        </>
      ) : (
        <h1 className="text-md text-center">{emptyPlaceholder ?? 'Value was not yet modified'}</h1>
      )}

      <ConfirmationModal
        visible={showRestoreConfirm}
        header="Restore this version?"
        message="This will replace the current editor content with the selected version. Unsaved changes will be lost. You will still need to save to persist the change."
        confirmText="Restore"
        confirmButtonType={ButtonType.PRIMARY}
        limitWidth
        onConfirm={handleRestoreConfirm}
        onCancel={handleRestoreCancel}
      />
    </div>
  )
}

export default VersionedFieldHistoryTab
