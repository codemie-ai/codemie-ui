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

import { Parser } from 'marked'
import { FC, useMemo } from 'react'

import File from '@/components/File'
import Markdown from '@/components/markdown/Markdown'
import ListToken from '@/components/markdown/tokens/ListToken'
import MermaidDiagram from '@/components/markdown/tokens/MermaidDiagram'
import TableBlock from '@/components/markdown/tokens/TableBlock'

import { getArtifactLink, hasSeamRenderedLink, isDisarmedLink } from './artifactLink'
import { sanitizeHtmlWithImageAllowList } from './Markdown.sanitize'
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
  /** The tokens are the inline children of a recursed container, so they render as one line of text */
  inline?: boolean
  /** See `Markdown`'s prop of the same name; `undefined` means no list check */
  listedArtifactIds?: ReadonlySet<string>
}

// Mermaid renders as a diagram, a nested ```md block re-enters Markdown, everything else is code
const renderCodeToken = (
  token: MarkdownToken,
  key: string,
  listedArtifactIds?: ReadonlySet<string>
) => {
  if (token.lang === 'mermaid') return <MermaidDiagram key={key} code={token.text ?? ''} />

  if (token.lang === 'md' && !token.text?.includes('```') && token.text?.trim()?.length) {
    return <Markdown key={key} content={token.text} listedArtifactIds={listedArtifactIds} />
  }

  return <CodeBlock key={key} text={token.text ?? ''} language={token.lang} stickyHeader />
}

// A downloadable assistant artifact mounts the real File chip rather than an <a>, so the download
// goes through filesStore (authenticated) instead of a plain browser navigation. `null` when the
// token is not an artifact link.
const renderArtifactToken = (
  token: MarkdownToken,
  key: string,
  listedArtifactIds?: ReadonlySet<string>
) => {
  const artifact = getArtifactLink(token)
  if (!artifact) return null

  // Every file a turn publishes is listed in the conversation's file_names, so an unlisted turn
  // artifact is a link the model wrote itself, and its download would fail. Compared bare, as
  // the share view appends `?share_token=` to the href.
  const bareId = artifact.fileId.split('?')[0]
  if (listedArtifactIds && artifact.isTurnArtifact && !listedArtifactIds.has(bareId)) {
    return <span key={key}>{token.text}</span>
  }

  return (
    <File
      key={key}
      file={{ fileId: artifact.fileId, fileName: artifact.fileName, mimeType: artifact.mimeType }}
      withDownload
      // Flows with the sentence around it and sizes itself; a block chip would fill the
      // paragraph and `ml-auto` would strand the download button at the far right.
      className="inline-flex max-w-full align-middle"
    />
  )
}

// The token types whose default rendering is a single HTML blob that would swallow a link the
// seam renders itself: a paragraph (a standalone `[Download](...)`), a `text` token (a link in a
// list item) and an inline wrapper (`**[Download](...)**`, where the link is a grandchild).
const recursableTypes: MarkdownTokenType[] = [
  TOKEN_TYPES.paragraph,
  TOKEN_TYPES.text,
  ...inlineTokens,
]

const recursesIntoChildren = (token: MarkdownToken) =>
  recursableTypes.includes(token.type) && hasSeamRenderedLink(token)

const MarkdownTokens: FC<MarkdownTokensProps> = ({
  tokens = [],
  inline = false,
  listedArtifactIds,
}) => {
  const options = useMemo(() => ({ ...markedOptions, renderer }), [])

  const getInlineProps = (token: MarkdownToken) => ({
    dangerouslySetInnerHTML: {
      __html: sanitizeHtmlWithImageAllowList(Parser.parseInline([token], options)),
    },
  })

  const getBlockProps = (token: MarkdownToken) => ({
    dangerouslySetInnerHTML: {
      __html: sanitizeHtmlWithImageAllowList(Parser.parse([token], options)),
    },
  })

  const normalizedTokens = Array.isArray(tokens) ? tokens : [tokens]

  return normalizedTokens.map((token, i) => {
    const key = `${token.type}-${i}-${token.raw.slice(0, 32)}`

    const artifactNode = renderArtifactToken(token, key, listedArtifactIds)
    if (artifactNode) return artifactNode

    // DOMPurify strips a denied scheme but keeps the <a>, which leaves link styling on something
    // that does nothing when clicked. Render the text instead, so the affordance matches reality.
    // Runs after the artifact case: a usable files link never reaches it, an unusable one does.
    if (isDisarmedLink(token)) return <span key={key}>{token.text}</span>

    // A container holding a link the seam renders itself has to recurse into its children: the
    // default rendering collapses it to one HTML blob and the link token inside is never
    // dispatched. That covers a standalone `[Download](...)` (a paragraph), a link in a list
    // item (a `text` token) and `**[Download](...)**` (an inline wrapper, link as grandchild).
    // Any container without such a link keeps single-blob rendering — the blast-radius bound.
    // Inline emphasis is dropped on recursion: the File chip carries its own styling.
    // The children are inline, so they render inline: the text around a chip stays one sentence.
    if (recursesIntoChildren(token)) {
      if (token.type === TOKEN_TYPES.paragraph) {
        // The chip is a <div>, which is invalid inside a <p>: the browser auto-closes the
        // paragraph and reparents it, so the chip escapes any width the markup gave it. Render
        // the block as a <div> instead — it carries the paragraph's spacing without the
        // nesting restriction.
        return (
          <div key={key} className="my-2">
            <MarkdownTokens tokens={token.tokens} inline listedArtifactIds={listedArtifactIds} />
          </div>
        )
      }

      return (
        <MarkdownTokens
          key={key}
          tokens={token.tokens}
          inline
          listedArtifactIds={listedArtifactIds}
        />
      )
    }

    // An inline `text` token parsed as a block would gain its own <p> and break the line
    const isInline =
      inlineTokens.includes(token.type) || (inline && token.type === TOKEN_TYPES.text)
    if (isInline) return <span key={key} {...getInlineProps(token)} />

    if (token.type === TOKEN_TYPES.table) {
      return (
        <TableBlock
          key={key}
          html={sanitizeHtmlWithImageAllowList(Parser.parse([token], options))}
          raw={token.raw}
        />
      )
    }

    if (blockTokens.includes(token.type)) return <div key={key} {...getBlockProps(token)} />

    if (token.type === TOKEN_TYPES.paragraph) return <p key={key} {...getBlockProps(token)} />
    if (token.type === TOKEN_TYPES.space) return <span key={key} {...getBlockProps(token)} />
    if (token.type === TOKEN_TYPES.text) return <span key={key} {...getBlockProps(token)} />
    if (token.type === TOKEN_TYPES.list) {
      return <ListToken key={key} token={token} listedArtifactIds={listedArtifactIds} />
    }
    if (token.type === TOKEN_TYPES.blockquote) {
      return (
        <blockquote key={key}>
          <MarkdownTokens tokens={token.tokens} listedArtifactIds={listedArtifactIds} />
        </blockquote>
      )
    }

    if (token.type === TOKEN_TYPES.code) return renderCodeToken(token, key, listedArtifactIds)

    return null
  })
}

export default MarkdownTokens
