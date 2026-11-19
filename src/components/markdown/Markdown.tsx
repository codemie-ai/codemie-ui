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
  /**
   * The bare file ids the back end listed for this conversation. When given, a link to a turn
   * artifact that is not in it renders as text rather than a chip whose download would fail.
   */
  listedArtifactIds?: ReadonlySet<string>
}

const Markdown: React.FC<MarkdownProps> = ({
  content,
  withBlinker = false,
  children,
  className,
  listedArtifactIds,
}) => {
  const tokens = useMemo(() => {
    if (!content) return []
    return getMarkdownTokens(content)
  }, [content])

  return (
    <div
      className={cn(
        'markdown text-text-primary text-sm break-words',
        withBlinker ? 'with-blinker' : '',
        className
      )}
    >
      {tokens.length > 0 && (
        <MarkdownTokens tokens={tokens} listedArtifactIds={listedArtifactIds} />
      )}
      {children}
    </div>
  )
}

export default Markdown
