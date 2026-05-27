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

interface UnpinAssistantConfirmPopupProps {
  entityName: string
  visible: boolean
  onCancel: () => void
  onConfirm: () => void
}

const UnpinAssistantConfirmPopup: React.FC<UnpinAssistantConfirmPopupProps> = ({
  entityName,
  visible,
  onCancel,
  onConfirm,
}) => {
  return (
    <ConfirmationModal
      header="Remove from sidebar"
      message={`${entityName} will be removed from your sidebar shortcuts. You can pin it again at any time. Are you sure?`}
      confirmText="Remove"
      confirmButtonType={ButtonType.DELETE}
      visible={visible}
      onCancel={onCancel}
      onConfirm={onConfirm}
      limitWidth
    />
  )
}

export default UnpinAssistantConfirmPopup
