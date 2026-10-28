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

import Button from '@/components/Button'
import Popup from '@/components/Popup'
import { ButtonType } from '@/constants'

interface Props {
  isOpen: boolean
  onClose: () => void
}

const SubmittedForReviewModal: React.FC<Props> = ({ isOpen, onClose }) => {
  const footerContent = (
    <div className="flex justify-end">
      <Button variant={ButtonType.PRIMARY} onClick={onClose}>
        Got it
      </Button>
    </div>
  )

  return (
    <Popup
      className="w-[500px]"
      header="Sent for review"
      visible={isOpen}
      onHide={onClose}
      withBorder
      footerContent={footerContent}
    >
      <p className="text-sm text-text-quaternary">
        Your assistant has been sent for manual review and is now pending approval — it will not be
        visible in the Marketplace until approved.
      </p>
    </Popup>
  )
}

export default SubmittedForReviewModal
