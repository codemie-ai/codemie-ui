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

import ConfirmationModal from '@/components/ConfirmationModal'
import { ButtonType } from '@/constants'

interface ArchiveKataConfirmationProps {
  visible: boolean
  onCancel: () => void
  onConfirm: () => void
  isArchiving: boolean
  kataTitle?: string
}

const ArchiveKataConfirmation: React.FC<ArchiveKataConfirmationProps> = ({
  visible,
  onCancel,
  onConfirm,
  isArchiving,
  kataTitle,
}) => {
  const getConfirmMessage = () => {
    const kataReference = kataTitle ? `"${kataTitle}"` : 'this kata'
    return `Are you sure you want to archive ${kataReference}?`
  }

  return (
    <ConfirmationModal
      header="Archive Kata"
      message={getConfirmMessage()}
      confirmText={isArchiving ? 'Archiving...' : 'Archive Kata'}
      confirmButtonType={ButtonType.DELETE}
      visible={visible}
      onCancel={onCancel}
      onConfirm={onConfirm}
      className="max-w-md"
    >
      <p className="text-sm text-text-quaternary mt-2">
        Archived katas will no longer be visible to users and cannot be started or enrolled in.
      </p>
    </ConfirmationModal>
  )
}

export default ArchiveKataConfirmation
