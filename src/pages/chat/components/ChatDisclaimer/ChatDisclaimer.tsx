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

import DOMPurify from 'dompurify'
import { marked } from 'marked'
import { FC, useMemo, useRef } from 'react'
import { useSnapshot } from 'valtio'

import { CONFIG_KEYS } from '@/constants/configKeys'
import { useIsTruncated } from '@/hooks/useIsTruncated'
import { appInfoStore } from '@/store/appInfo'
import { getMarkdownRenderer } from '@/utils/messageHelpers'
import { getConfigItemSettings } from '@/utils/settings'

// inline parsing keeps the text in one line box, so the clamp applies to it
const toInlineHtml = (text: string) =>
  DOMPurify.sanitize(marked.parseInline(text, { renderer: getMarkdownRenderer() }) as string, {
    ADD_ATTR: ['target'],
  })

interface Props {
  text: string
}

// Separate component so the measured node exists on first render
const ChatDisclaimerText: FC<Props> = ({ text }) => {
  const textEl = useRef<HTMLDivElement>(null)
  const isTruncated = useIsTruncated(textEl)
  const html = useMemo(() => toInlineHtml(text), [text])
  // read the tooltip text off the rendered markup instead of parsing the markdown a second time
  const plainText = useMemo(
    () => new DOMParser().parseFromString(html, 'text/html').body.textContent ?? '',
    [html]
  )

  return (
    <div className="w-full px-6 mt-2">
      <div className="w-full max-w-5xl mx-auto min-w-24 text-center text-text-info">
        <div
          ref={textEl}
          data-testid="chat-disclaimer"
          data-tooltip-id="react-tooltip"
          data-tooltip-content={isTruncated ? plainText : undefined}
          className="line-clamp-2 text-sm-1 leading-4 break-words [&_a]:underline"
          dangerouslySetInnerHTML={{ __html: html }}
        />
      </div>
    </div>
  )
}

const ChatDisclaimer = () => {
  // read through the snapshot: valtio only re-renders for properties touched during render
  const { configs } = useSnapshot(appInfoStore)
  const settings = getConfigItemSettings(configs, CONFIG_KEYS.CHAT_DISCLAIMER)

  if (!settings?.enabled || !settings.text?.trim()) return null

  return <ChatDisclaimerText text={settings.text} />
}

export default ChatDisclaimer
