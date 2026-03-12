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
import { Assistant } from '@/types/entity/assistant'

interface DeleteConfirmationProps {
  assistant: Assistant | null
  isVisible: boolean
  onCancel: () => void
  onConfirm: () => void
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({
  isVisible,
  onCancel,
  onConfirm,
}) => {
  return (
    <ConfirmationModal
      header="Delete this Assistant?"
      message="Action can not be cancelled."
      visible={isVisible}
      onCancel={onCancel}
      onConfirm={onConfirm}
    />
  )
}

export default DeleteConfirmation
