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

import { FC, useRef } from 'react'

import CloseSvg from '@/assets/icons/cross.svg?react'
import RefreshSvg from '@/assets/icons/refresh.svg?react'

import Popup from '../Popup'

interface HtmlPreviewPopupProps {
  isVisible: boolean
  html: string
  onHide: () => void
}

const HtmlPreviewPopup: FC<HtmlPreviewPopupProps> = ({ isVisible, html, onHide }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const reloadIframe = () => {
    if (iframeRef.current) iframeRef.current.srcdoc = html
  }
  return (
    <Popup
      hideClose
      hideFooter
      visible={isVisible}
      onHide={onHide}
      headerContent={
        <div className="flex justify-between items-center">
          <h4> Preview HTML </h4>

          <div className="flex gap-2">
            <button className="refresh-btn close-btn" onClick={reloadIframe}>
              <RefreshSvg />
            </button>

            <button className="ml-1 close-btn" aria-label="Close popup" onClick={onHide}>
              <CloseSvg />
            </button>
          </div>
        </div>
      }
      className="w-3/4 max-w-[1000px] h-[90%] max-h-[850px]"
    >
      <iframe title="HTML Preview" ref={iframeRef} srcDoc={html} className="size-full pb-4" />
    </Popup>
  )
}

export default HtmlPreviewPopup
