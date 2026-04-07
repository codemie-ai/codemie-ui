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
const blockTokens: MarkdownTokenType[] = ['hr', 'table', 'heading']

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

  return normalizedTokens.map((token, i) => {
    if (inlineTokens.includes(token.type)) return <span key={i} {...getInlineProps(token)} />
    if (blockTokens.includes(token.type)) return <div key={i} {...getBlockProps(token)} />

    if (token.type === TOKEN_TYPES.paragraph) return <p key={i} {...getBlockProps(token)} />
    if (token.type === TOKEN_TYPES.space) return <span key={i} {...getBlockProps(token)} />
    if (token.type === TOKEN_TYPES.text) return <span key={i} {...getBlockProps(token)} />
    if (token.type === TOKEN_TYPES.list) return <ListToken key={i} token={token} />
    if (token.type === TOKEN_TYPES.blockquote) {
      return (
        <blockquote key={i}>
          <MarkdownTokens tokens={token.tokens} />
        </blockquote>
      )
    }

    if (token.type === TOKEN_TYPES.code) {
      if (token.lang === 'mermaid') return <MermaidDiagram key={i} code={token.text ?? ''} />

      if (token.lang === 'md' && !token.text?.includes('```') && token.text?.trim()?.length) {
        return <Markdown key={i} content={token.text} />
      }

      return <CodeBlock key={i} text={token.text ?? ''} language={token.lang} />
    }

    return null
  })
}

export default MarkdownTokens
