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

import { FC, Fragment, useMemo } from 'react'
import { useSnapshot } from 'valtio'

import CodeBlock from '@/components/CodeBlock/CodeBlock'
import Markdown from '@/components/markdown/Markdown'
import TextBlock from '@/components/markdown/TextBlock'
import { DOCUMENT_SOURCE_KEY, MARKDOWN_ENABLED_AUTHORS } from '@/constants'
import { WORKFLOW_OUTPUT_FORMATS } from '@/constants/workflows'
import { appInfoStore } from '@/store/appInfo'
import { Thought } from '@/types/entity/conversation'
import { tryParseJsonObjectOrArray } from '@/utils/jsonHelpers'
import { isValidMessageArray, parseValidatedMessageArray } from '@/utils/messageFormat'

import ThoughtDocument from './ThoughtDocument'

const WORKFLOW_STATE_AUTHOR_TYPE = 'WorkflowState'
const FEATURE_RENDER_STATE_AS_MARKDOWN = 'feature:renderStateOutputAsMarkdown'

const tryParseMessageArray = (message?: string) => {
  if (!message) return null

  try {
    const parsed = JSON.parse(message)
    if (isValidMessageArray(parsed)) return parsed
  } catch {
    return null
  }

  return null
}

const parseDocumentMessage = (message: string) => {
  const items = message
    .split(DOCUMENT_SOURCE_KEY)
    .map((item) => item.trim())
    .filter(Boolean)
  return items.map(parseItem)
}

const parseItem = (item: string) => {
  const sourceMatch = item.match(/\*\*Source:\*\*\s*([^\n]+)/)
  const contentMatch = item.match(/\*\*File Content:\*\*\s*([\s\S]+)/)
  if (!sourceMatch || !contentMatch) {
    return {
      type: 'text',
      content: item,
    }
  }
  return {
    type: 'document',
    title: sourceMatch[1],
    content: contentMatch[1].trim(),
  }
}

interface ThoughtMessageProps {
  thought: Thought
}

const ThoughtMessage: FC<ThoughtMessageProps> = ({ thought }) => {
  const { configs } = useSnapshot(appInfoStore)

  // Check if renderStateOutputAsMarkdown feature is enabled
  const isRenderAsMarkdownEnabled = useMemo(() => {
    const featureConfig = configs.find((config) => config.id === FEATURE_RENDER_STATE_AS_MARKDOWN)
    return featureConfig?.settings?.enabled === true
  }, [configs])

  // Check if this is a WorkflowState thought with JSON content
  const workflowStateJsonContent = useMemo(() => {
    if (thought.author_type !== WORKFLOW_STATE_AUTHOR_TYPE || !thought.message?.trim()) {
      return null
    }

    return tryParseJsonObjectOrArray(thought.message)
  }, [thought.author_type, thought.message])

  // Determine if thought should be rendered as markdown
  const isMarkdownThought =
    (thought.author_name !== undefined && MARKDOWN_ENABLED_AUTHORS.includes(thought.author_name)) ||
    thought.output_format === WORKFLOW_OUTPUT_FORMATS.MARKDOWN ||
    // WorkflowState with non-JSON content should also be rendered as markdown when flag is enabled
    (isRenderAsMarkdownEnabled &&
      thought.author_type === WORKFLOW_STATE_AUTHOR_TYPE &&
      workflowStateJsonContent === null)

  const messageSegments = useMemo(() => {
    const {message} = thought
    if (!message) return [{ type: 'text', content: '' }]

    const recognizedArray = tryParseMessageArray(message)
    if (recognizedArray) {
      return parseValidatedMessageArray(recognizedArray)
    }
    if (message.includes(DOCUMENT_SOURCE_KEY)) {
      return parseDocumentMessage(message)
    }
    return [{ type: 'text', content: message }]
  }, [thought.message])

  // Handle WorkflowState with JSON content when feature flag is enabled
  if (isRenderAsMarkdownEnabled && workflowStateJsonContent !== null) {
    // Render valid JSON as code block for better visualization
    return <CodeBlock language="json" text={JSON.stringify(workflowStateJsonContent, null, 2)} />
  }

  return messageSegments.map((segment, i) => (
    <Fragment key={i}>
      {segment.type === 'text' &&
        (isMarkdownThought ? (
          <Markdown content={segment.content} />
        ) : (
          <TextBlock className="break-all" text={segment.content} />
        ))}

      {segment.type === 'image' && (
        <img
          src={segment.url}
          alt={segment.alt}
          className="max-w-full h-auto rounded-lg border border-border-structural shadow-sm"
          style={{ maxHeight: 400, objectFit: 'contain' }}
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
            console.error('Failed to load image:', segment.url.substring(0, 50) + '...')
          }}
        />
      )}

      {segment.type === 'document' && (
        <ThoughtDocument title={segment.title} content={segment.content} />
      )}
    </Fragment>
  ))
}

export default ThoughtMessage
