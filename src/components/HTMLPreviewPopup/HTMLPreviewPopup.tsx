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

import React, { useRef } from 'react'

import CloseSvg from '@/assets/icons/cross.svg?react'
import RefreshSvg from '@/assets/icons/refresh.svg?react'
import Popup from '@/components/Popup'

interface HTMLPreviewPopupProps {
  visible: boolean
  html: string
  onClose: () => void
}

const HTMLPreviewPopup: React.FC<HTMLPreviewPopupProps> = ({ visible, html, onClose }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const reloadIframe = () => {
    if (iframeRef.current) {
      iframeRef.current.srcdoc = html
    }
  }

  return (
    <Popup
      visible={visible}
      onHide={onClose}
      submitDisabled={true}
      hideFooter={true}
      bodyClassName="show-scroll"
      className="html-preview-popup w-[75%] max-w-[1000px] h-[90%] max-h-[850px]"
      headerContent={
        <>
          <h4 className="m-0">Preview HTML</h4>

          <div className="ml-auto flex gap-1">
            <button
              className="w-5 h-5 mt-0.5 flex items-center justify-center hover:opacity-70 transition refresh-btn close-btn"
              onClick={reloadIframe}
              aria-label="Reload preview"
            >
              <RefreshSvg />
            </button>

            <button
              className="w-5 h-5 flex items-center justify-center hover:opacity-70 transition close-btn"
              onClick={onClose}
              aria-label="Close popup"
            >
              <CloseSvg />
            </button>
          </div>
        </>
      }
    >
      <iframe
        ref={iframeRef}
        className="w-full h-full"
        sandbox=""
        srcDoc={html}
        title="HTML Preview"
      />
    </Popup>
  )
}

export default HTMLPreviewPopup
