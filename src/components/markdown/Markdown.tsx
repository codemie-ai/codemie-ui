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

import './Markdown.scss'
import React, { useMemo } from 'react'

import MarkdownTokens from '@/components/markdown/MarkdownTokens'
import { cn } from '@/utils/utils'

import { getMarkdownTokens } from './Markdown.utils'

type MarkdownProps = {
  content?: string
  withBlinker?: boolean
  children?: React.ReactNode
  className?: string
}

const Markdown: React.FC<MarkdownProps> = ({
  content,
  withBlinker = false,
  children,
  className,
}) => {
  const tokens = useMemo(() => {
    if (!content) return []
    return getMarkdownTokens(content)
  }, [content])

  return (
    <div
      className={cn(
        'markdown text-text-primary font-geist text-sm break-words',
        withBlinker ? 'with-blinker' : '',
        className
      )}
    >
      {tokens.length > 0 && <MarkdownTokens tokens={tokens} />}
      {children}
    </div>
  )
}

export default Markdown
