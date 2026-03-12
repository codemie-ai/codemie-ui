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

import CheckSvg from '@/assets/icons/check.svg?react'
import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'

interface CompleteKataConfirmationProps {
  visible: boolean
  onCancel: () => void
  onConfirm: () => void
  isCompleting?: boolean
}

const CompleteKataConfirmation: React.FC<CompleteKataConfirmationProps> = ({
  visible,
  onCancel,
  onConfirm,
  isCompleting = false,
}) => {
  const footerContent = (
    <div className="flex justify-end gap-3">
      <Button
        variant={ButtonType.BASE}
        onClick={(e) => {
          e.stopPropagation()
          onCancel()
        }}
      >
        Cancel
      </Button>
      <Button
        variant={ButtonType.BASE}
        onClick={(e) => {
          e.stopPropagation()
          onConfirm()
        }}
        className="border-success-primary text-success-primary hover:bg-success-primary/10"
      >
        <CheckSvg />
        {isCompleting ? 'Completing...' : 'Complete Kata'}
      </Button>
    </div>
  )

  return (
    <Popup
      className="w-[650px] min-h-[170px]"
      overlayClassName="z-60"
      hideClose
      header="Complete this Kata?"
      visible={visible}
      onHide={onCancel}
      withBorder
      footerContent={footerContent}
    >
      <p className="mb-2 text-sm text-text-quaternary">
        Please confirm that you have successfully completed all steps, achieved the learning
        objectives, and made real progress in this kata.
      </p>
      <div className="space-y-2 mt-4">
        <p className="text-sm text-text-quaternary">
          By completing this kata, you confirm that you have:
        </p>
        <ul className="ml-5 text-sm text-text-quaternary list-disc space-y-1.5">
          <li>Completed all the required steps</li>
          <li>Achieved the learning objectives</li>
          <li>Practiced and applied the skills covered</li>
        </ul>
      </div>
    </Popup>
  )
}

export default CompleteKataConfirmation
