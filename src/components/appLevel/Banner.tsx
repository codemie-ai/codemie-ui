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

import { Messages, MessagesMessage } from 'primereact/messages'
import { FC, useEffect, useRef } from 'react'
import { Link } from 'react-router'
import { useSnapshot } from 'valtio'

import { CONFIG_KEYS } from '@/constants/configKeys'
import { appInfoStore } from '@/store/appInfo'
import { getConfigItemSettings } from '@/utils/settings'

// values reaching Link also arrive from customer config, which server-side validation never sees
const SCRIPTING_SCHEME = /^(?:javascript|data|vbscript):/i

// a browser ignores whitespace and control characters inside an href, so strip them before testing
const isSafeLinkTarget = (target: string): boolean => {
  const canonical = Array.from(target)
    .filter((char) => char.charCodeAt(0) > 0x1f && !/\s/.test(char))
    .join('')

  return !SCRIPTING_SCHEME.test(canonical)
}

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
  // read through the snapshot: valtio only re-renders for properties touched during render
  const { configs } = useSnapshot(appInfoStore)
  const settings = getConfigItemSettings(configs, CONFIG_KEYS.BANNER)
  const isEnabled = Boolean(settings?.enabled)
  const message = isEnabled ? settings?.message ?? '' : ''
  const linkLabel = isEnabled ? settings?.linkLabel ?? '' : ''
  const linkRoute = isEnabled ? settings?.linkRoute ?? '' : ''

  useEffect(() => {
    if (!messages.current) return

    const storageKey = 'bannerShown-' + hash(message)
    if (!message || localStorage.getItem(storageKey) === 'true') {
      messages.current.clear()
      return
    }

    const hasLink = Boolean(linkLabel && linkRoute && isSafeLinkTarget(linkRoute))
    // replace, not show: show() appends, which would stack banners on a config change
    messages.current.replace({
      id: message,
      sticky: true,
      severity: 'info',
      detail: hasLink ? (
        <span>
          <span className="whitespace-pre-line">{message}</span>{' '}
          <Link className="font-semibold underline" to={linkRoute}>
            {linkLabel}
          </Link>
        </span>
      ) : (
        message
      ),
      closable: true,
    })
  }, [linkLabel, linkRoute, message])

  // key off the closed message, which may already differ from the one being rendered
  const handleRemove = (closed: MessagesMessage) => {
    const dismissed = typeof closed?.id === 'string' ? closed.id : message
    localStorage.setItem('bannerShown-' + hash(dismissed), 'true')
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
        button: { className: 'shrink-0 !text-white' },
        wrapper: {
          className:
            'bg-gradient4 w-full min-h-12 flex items-center justify-between gap-3 text-sm py-2 px-3 whitespace-pre-line',
        },
      }}
    />
  )
}

export default Banner
