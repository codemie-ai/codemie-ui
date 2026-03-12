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

import CustomButton from '@/components/Button'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'

interface UnsavedChangesConfirmationProps {
  visible: boolean
  onDiscard: () => void
  onSave: () => void
}

const UnsavedChangesConfirmation: React.FC<UnsavedChangesConfirmationProps> = ({
  visible,
  onDiscard,
  onSave,
}) => {
  const footerContent = (
    <div className="flex justify-end gap-3">
      <CustomButton variant={ButtonType.DELETE} onClick={onDiscard}>
        Discard
      </CustomButton>
      <CustomButton type={ButtonType.PRIMARY} onClick={onSave}>
        Save and proceed
      </CustomButton>
    </div>
  )

  return (
    <Popup
      visible={visible}
      header="Unsaved Changes"
      onHide={() => {}}
      footerContent={footerContent}
      dismissableMask={false}
      hideClose={true}
    >
      <div className="flex flex-col gap-4">
        <p className="text-sm text-text-quaternary">
          You have unsaved changes. Do you want to save them?
        </p>
      </div>
    </Popup>
  )
}

export default UnsavedChangesConfirmation
