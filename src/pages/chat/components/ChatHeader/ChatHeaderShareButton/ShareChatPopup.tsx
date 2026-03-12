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

import React, { useState } from 'react'

import CopySvg from '@/assets/icons/copy.svg?react'
import Button from '@/components/Button'
import InfoBox from '@/components/form/InfoBox'
import Popup from '@/components/Popup'
import { copyToClipboard } from '@/utils/helpers'

export interface ShareChatPopupProps {
  isVisible: boolean
  shareLink?: string
  onHide: () => void
}

const ShareChatPopup: React.FC<ShareChatPopupProps> = ({ isVisible, shareLink, onHide }) => {
  const [copied, setCopied] = useState(false)

  const handleHide = () => {
    onHide()
    setCopied(false)
  }

  const copyLink = () => {
    if (shareLink) {
      copyToClipboard(shareLink)
      setCopied(true)
      setTimeout(() => {
        setCopied(false)
      }, 2000)
    }
  }

  return (
    <Popup
      header="Share chat"
      visible={isVisible}
      onHide={handleHide}
      hideFooter
      limitWidth
      className="bg-surface-base-secondary border border-border-structural rounded-lg"
      bodyClassName="px-6 pt-4 pb-6"
      withBorder
    >
      <div>
        <p className="text-sm text-text-quaternary mb-4">
          Share your conversation with others. Anyone with this link can view the contents of this
          chat. The shared chat is read-only and doesn&apos;t require a login.
        </p>

        <div className="flex items-stretch mb-5">
          <div className="flex-1 bg-surface-base-primary border border-border-structural rounded-l-lg px-2 py-1">
            <input
              className="w-full bg-transparent outline-none text-text-primary text-sm"
              value={shareLink}
              readOnly
              onClick={(e) => (e.target as HTMLInputElement).select()}
            />
          </div>
          <Button onClick={copyLink} variant="secondary" className="rounded-l-none h-full">
            <CopySvg />
            {copied ? 'Copied!' : 'Copy'}
          </Button>
        </div>

        <InfoBox>
          Note: You cannot revoke access once shared, so be careful not to share sensitive
          information.
        </InfoBox>
      </div>
    </Popup>
  )
}

export default ShareChatPopup
