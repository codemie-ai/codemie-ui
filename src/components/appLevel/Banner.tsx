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

import { Messages } from 'primereact/messages'
import { FC, useEffect, useRef } from 'react'

const hash = (str: string): string => {
  let hash = 0
  for (let i = 0; i < str.length; i += 1) {
    const char = str.charCodeAt(i)
    hash = hash * 32 - hash + char
    hash = Math.trunc(hash)
  }
  return Math.abs(hash).toString(36)
}

const Banner: FC = () => {
  const messages = useRef<Messages>(null)
  const bannerMessage = (window as any)?._env_?.VITE_BANNER_MESSAGE ?? ''

  useEffect(() => {
    if (bannerMessage && messages.current) {
      const storageKey = 'bannerShown-' + hash(bannerMessage)
      const isMessageClosed = localStorage.getItem(storageKey)
      if (isMessageClosed !== 'true') {
        messages.current.show({
          id: bannerMessage,
          sticky: true,
          severity: 'info',
          detail: bannerMessage,
          closable: true,
        })
      }
    }
  }, [bannerMessage])

  const handleRemove = () => {
    const storageKey = 'bannerShown-' + hash(bannerMessage)
    localStorage.setItem(storageKey, 'true')
  }

  return (
    <Messages
      ref={messages}
      onRemove={handleRemove}
      pt={{
        root: { className: 'w-full' },
        icon: { className: '!hidden' },
        summary: { className: '!hidden' },
        detail: { className: 'grow text-center text-white' },
        button: { className: 'shrink-0' },
        wrapper: {
          className:
            'bg-gradient4 w-full min-h-12 flex items-center justify-between gap-3 text-sm py-2 px-3 whitespace-pre-line',
        },
      }}
    />
  )
}

export default Banner
