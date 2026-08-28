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
import { Parser } from 'marked'
import { FC, useMemo } from 'react'

import Markdown from '@/components/markdown/Markdown'
import ListToken from '@/components/markdown/tokens/ListToken'
import MermaidDiagram from '@/components/markdown/tokens/MermaidDiagram'
import TableBlock from '@/components/markdown/tokens/TableBlock'

import {
  getMarkdownRenderer,
  MarkdownToken,
  MarkdownTokenType,
  markedOptions,
  TOKEN_TYPES,
} from './Markdown.utils'
import CodeBlock from '../CodeBlock/CodeBlock'

const inlineTokens: MarkdownTokenType[] = [
  'escape',
  'html',
  'link',
  'image',
  'strong',
  'em',
  'codespan',
  'br',
  'del',
]
const blockTokens: MarkdownTokenType[] = ['hr', 'heading']

const renderer = getMarkdownRenderer()

type MarkdownTokensProps = {
  tokens?: MarkdownToken[] | MarkdownToken
}

const MarkdownTokens: FC<MarkdownTokensProps> = ({ tokens = [] }) => {
  const options = useMemo(() => ({ ...markedOptions, renderer }), [])

  const getInlineProps = (token: MarkdownToken) => ({
    dangerouslySetInnerHTML: {
      __html: DOMPurify.sanitize(Parser.parseInline([token], options), { ADD_ATTR: ['target'] }),
    },
  })

  const getBlockProps = (token: MarkdownToken) => ({
    dangerouslySetInnerHTML: {
      __html: DOMPurify.sanitize(Parser.parse([token], options), { ADD_ATTR: ['target'] }),
    },
  })

  const normalizedTokens = Array.isArray(tokens) ? tokens : [tokens]

  // Key each token by its content instead of its array index (S6479). Markdown here can stream and
  // update in place, so content-based keys let React reconcile correctly where positional keys would
  // reuse the wrong node. A per-key occurrence counter disambiguates repeated identical tokens
  // (e.g. two blank lines) so keys stay unique across the list.
  const keyOccurrences = new Map<string, number>()
  const keyFor = (token: MarkdownToken): string => {
    const base = `${token.type}:${token.raw ?? ''}`
    const seen = keyOccurrences.get(base) ?? 0
    keyOccurrences.set(base, seen + 1)
    return `${base}#${seen}`
  }

  return normalizedTokens.map((token) => {
    const key = keyFor(token)
    if (inlineTokens.includes(token.type)) return <span key={key} {...getInlineProps(token)} />

    if (token.type === TOKEN_TYPES.table) {
      return (
        <TableBlock
          key={key}
          html={DOMPurify.sanitize(Parser.parse([token], options), { ADD_ATTR: ['target'] })}
          raw={token.raw}
        />
      )
    }

    if (blockTokens.includes(token.type)) return <div key={key} {...getBlockProps(token)} />

    if (token.type === TOKEN_TYPES.paragraph) return <p key={key} {...getBlockProps(token)} />
    if (token.type === TOKEN_TYPES.space) return <span key={key} {...getBlockProps(token)} />
    if (token.type === TOKEN_TYPES.text) return <span key={key} {...getBlockProps(token)} />
    if (token.type === TOKEN_TYPES.list) return <ListToken key={key} token={token} />
    if (token.type === TOKEN_TYPES.blockquote) {
      return (
        <blockquote key={key}>
          <MarkdownTokens tokens={token.tokens} />
        </blockquote>
      )
    }

    if (token.type === TOKEN_TYPES.code) {
      if (token.lang === 'mermaid') return <MermaidDiagram key={key} code={token.text ?? ''} />

      if (token.lang === 'md' && !token.text?.includes('```') && token.text?.trim()?.length) {
        return <Markdown key={key} content={token.text} />
      }

      return <CodeBlock key={key} text={token.text ?? ''} language={token.lang} stickyHeader />
    }

    return null
  })
}

export default MarkdownTokens
