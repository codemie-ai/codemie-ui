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

import { forwardRef, useState, useRef, useCallback } from 'react'
import ReactMarkdown from 'react-markdown'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { dracula, prism } from 'react-syntax-highlighter/dist/esm/styles/prism'

import ExpandSvg from '@/assets/icons/expand.svg?react'
import Popup from '@/components/Popup'
import { useTheme } from '@/hooks/useTheme'
import { cn } from '@/utils/utils'

import type { Components } from 'react-markdown'

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  label?: string
  error?: string
  required?: boolean
  rows?: number
  className?: string
}

interface MarkdownComponentProps {
  children?: React.ReactNode
  className?: string
  node?: any
  inline?: boolean
  [key: string]: any
}

const MarkdownEditor = forwardRef<HTMLDivElement, MarkdownEditorProps>(
  ({ value, onChange, label, error, required, rows = 10, className }, ref) => {
    const { isDark } = useTheme()
    const [isFullscreen, setIsFullscreen] = useState(false)
    const [showPreview, setShowPreview] = useState(false)
    const [fullscreenPreview, setFullscreenPreview] = useState(false)
    const textareaRef = useRef<HTMLTextAreaElement>(null)
    const fullscreenTextareaRef = useRef<HTMLTextAreaElement>(null)

    const insertMarkdown = useCallback(
      (before: string, after = '', placeholder = '', isInFullscreen = false) => {
        const textarea = isInFullscreen ? fullscreenTextareaRef.current : textareaRef.current
        if (!textarea) return

        const start = textarea.selectionStart
        const end = textarea.selectionEnd
        const selectedText = value.substring(start, end)
        const replacement = before + (selectedText || placeholder) + after

        // Use native textarea undo/redo by using document.execCommand
        textarea.focus()
        textarea.setSelectionRange(start, end)
        document.execCommand('insertText', false, replacement)

        // Set cursor position after insert
        const newPosition = start + before.length + (selectedText || placeholder).length
        setTimeout(() => {
          textarea.setSelectionRange(newPosition, newPosition)
        }, 0)
      },
      [value, onChange]
    )

    const createInsertHandler = useCallback(
      (before: string, after = '', placeholder = '') =>
        (isInFullscreen = false) => {
          insertMarkdown(before, after, placeholder, isInFullscreen)
        },
      [insertMarkdown]
    )

    const insertHeading = createInsertHandler('## ', '', 'Heading')
    const insertBold = createInsertHandler('**', '**', '')
    const insertItalic = createInsertHandler('*', '*', '')
    const insertLink = createInsertHandler('[', '](https://example.com)', 'link text')
    const insertImage = createInsertHandler('![', '](https://example.com/image.png)', 'alt text')
    const insertCode = createInsertHandler('`', '`', 'code')
    const insertCodeBlock = createInsertHandler('\n```\n', '\n```\n', 'code block')
    const insertOrderedList = createInsertHandler('\n1. ', '', '')
    const insertUnorderedList = createInsertHandler('\n- ', '', '')
    const insertBlockquote = createInsertHandler('\n> ', '', 'quote')

    const renderToolbar = (
      isInFullscreen: boolean,
      showPreviewLocal: boolean,
      setShowPreviewLocal?: (show: boolean) => void
    ) => (
      <div className="flex items-center gap-1 px-3 py-2 bg-surface-base-primary border-b border-border-specific-panel-outline flex-wrap">
        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => insertBold(isInFullscreen)}
            className="flex items-center justify-center w-8 h-8 p-1.5 rounded-md text-text-quaternary hover:bg-surface-base-secondary hover:text-text-primary transition-all"
            title="Bold"
            aria-label="Bold"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M4 2h5c1.7 0 3 1.3 3 3 0 1.1-.6 2-1.5 2.5 1.2.5 2 1.7 2 3 0 1.9-1.5 3.5-3.5 3.5H4V2zm3 5h2c.8 0 1.5-.7 1.5-1.5S9.8 4 9 4H7v3zm0 2v3h2.5c1 0 1.8-.8 1.8-1.8S10.5 9 9.5 9H7z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => insertItalic(isInFullscreen)}
            className="flex items-center justify-center w-8 h-8 p-1.5 rounded-md text-text-quaternary hover:bg-surface-base-secondary hover:text-text-primary transition-all"
            title="Italic"
            aria-label="Italic"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M6 2h6v2H9.5l-2 8H10v2H4v-2h2.5l2-8H6V2z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => insertHeading(isInFullscreen)}
            className="flex items-center justify-center w-8 h-8 p-1.5 rounded-md text-text-quaternary hover:bg-surface-base-secondary hover:text-text-primary transition-all"
            title="Heading"
            aria-label="Heading"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2h2v5h6V2h2v12h-2V9H4v5H2V2zm11 11h3v1h-3v-1z" />
            </svg>
          </button>
        </div>

        <div className="w-px h-5 bg-border-specific-panel-outline mx-1" />

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => insertUnorderedList(isInFullscreen)}
            className="flex items-center justify-center w-8 h-8 p-1.5 rounded-md text-text-quaternary hover:bg-surface-base-secondary hover:text-text-primary transition-all"
            title="Bullet List"
            aria-label="Bullet List"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 3h1v1H2V3zm3 0h9v1H5V3zM2 7h1v1H2V7zm3 0h9v1H5V7zm-3 4h1v1H2v-1zm3 0h9v1H5v-1z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => insertOrderedList(isInFullscreen)}
            className="flex items-center justify-center w-8 h-8 p-1.5 rounded-md text-text-quaternary hover:bg-surface-base-secondary hover:text-text-primary transition-all"
            title="Numbered List"
            aria-label="Numbered List"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2h1v2H2V2zm0 3h1v2H2V5zm0 3h1v2H2V8zm3-6h9v1H5V2zm0 4h9v1H5V6zm0 4h9v1H5v-1z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => insertBlockquote(isInFullscreen)}
            className="flex items-center justify-center w-8 h-8 p-1.5 rounded-md text-text-quaternary hover:bg-surface-base-secondary hover:text-text-primary transition-all"
            title="Blockquote"
            aria-label="Blockquote"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 3h12v2H2V3zm0 4h12v1H2V7zm0 3h12v1H2v-1zm0 3h12v1H2v-1z" />
            </svg>
          </button>
        </div>

        <div className="w-px h-5 bg-border-specific-panel-outline mx-1" />

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            onClick={() => insertCode(isInFullscreen)}
            className="flex items-center justify-center w-8 h-8 p-1.5 rounded-md text-text-quaternary hover:bg-surface-base-secondary hover:text-text-primary transition-all"
            title="Inline Code"
            aria-label="Inline Code"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M5.5 3.5L2 8l3.5 4.5L6.5 12 3.5 8l3-4-.5-.5zm5 9L14 8l-3.5-4.5L9.5 4l3 4-3 4 .5.5z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => insertCodeBlock(isInFullscreen)}
            className="flex items-center justify-center w-8 h-8 p-1.5 rounded-md text-text-quaternary hover:bg-surface-base-secondary hover:text-text-primary transition-all"
            title="Code Block"
            aria-label="Code Block"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M2 2h12v12H2V2zm1 1v10h10V3H3zm2 2h6v1H5V5zm0 2h6v1H5V7zm0 2h4v1H5V9z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => insertLink(isInFullscreen)}
            className="flex items-center justify-center w-8 h-8 p-1.5 rounded-md text-text-quaternary hover:bg-surface-base-secondary hover:text-text-primary transition-all"
            title="Link"
            aria-label="Link"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M7.5 9.5c-.3.3-.7.5-1.1.5-.8 0-1.4-.6-1.4-1.4 0-.4.2-.8.5-1.1l2-2c.6-.6 1.6-.6 2.2 0 .3.3.5.7.5 1.1h1c0-.7-.3-1.4-.8-1.9-1-.9-2.6-.9-3.5 0l-2 2c-.5.5-.8 1.2-.8 1.9 0 1.5 1.2 2.7 2.7 2.7.7 0 1.4-.3 1.9-.8l.7-.7-.7-.7-.7.7zm4.3-6.3c-1-.9-2.6-.9-3.5 0l-.7.7.7.7.7-.7c.3-.3.7-.5 1.1-.5.8 0 1.4.6 1.4 1.4 0 .4-.2.8-.5 1.1l-2 2c-.6.6-1.6.6-2.2 0-.3-.3-.5-.7-.5-1.1h-1c0 .7.3 1.4.8 1.9 1 .9 2.6.9 3.5 0l2-2c.5-.5.8-1.2.8-1.9 0-.7-.3-1.4-.8-1.9z" />
            </svg>
          </button>
          <button
            type="button"
            onClick={() => insertImage(isInFullscreen)}
            className="flex items-center justify-center w-8 h-8 p-1.5 rounded-md text-text-quaternary hover:bg-surface-base-secondary hover:text-text-primary transition-all"
            title="Image"
            aria-label="Image"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M14 2H2v12h12V2zM3 13V3h10v10H3zm8-7c0 .6-.4 1-1 1s-1-.4-1-1 .4-1 1-1 1 .4 1 1zM4 11h8l-2.5-3-2 2.5L6 9l-2 2z" />
            </svg>
          </button>
        </div>

        <div className="flex-1" />
        {setShowPreviewLocal && (
          <button
            type="button"
            onClick={() => setShowPreviewLocal(!showPreviewLocal)}
            className={cn(
              'flex items-center justify-center w-8 h-8 p-1.5 rounded-md transition-all',
              showPreviewLocal
                ? 'bg-not-started-primary text-white hover:bg-not-started-secondary'
                : 'text-text-quaternary hover:bg-surface-base-secondary hover:text-text-primary'
            )}
            title={showPreviewLocal ? 'Hide preview' : 'Show preview'}
            aria-label={showPreviewLocal ? 'Hide preview' : 'Show preview'}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
              <path d="M8 3C4.5 3 1.5 5.5 0 8c1.5 2.5 4.5 5 8 5s6.5-2.5 8-5c-1.5-2.5-4.5-5-8-5zm0 8c-1.7 0-3-1.3-3-3s1.3-3 3-3 3 1.3 3 3-1.3 3-3 3zm0-5c-1.1 0-2 .9-2 2s.9 2 2 2 2-.9 2-2-.9-2-2-2z" />
            </svg>
          </button>
        )}
        {!isInFullscreen && (
          <button
            type="button"
            onClick={() => setIsFullscreen(true)}
            className="flex items-center justify-center w-8 h-8 p-1.5 rounded-md text-text-quaternary hover:bg-surface-base-secondary hover:text-text-primary transition-all"
            title="Expand to fullscreen"
            aria-label="Expand to fullscreen"
          >
            <ExpandSvg className="w-4 h-4" />
          </button>
        )}
      </div>
    )

    const markdownComponents: Components = {
      code({ inline, className, children, ...props }: MarkdownComponentProps) {
        const match = /language-(\w+)/.exec(className || '')
        return !inline && match ? (
          <SyntaxHighlighter
            {...props}
            style={isDark ? dracula : prism}
            language={match[1]}
            PreTag="div"
            className="rounded-md !my-4"
            customStyle={{
              background: 'transparent',
              border: 'none',
            }}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
        ) : (
          <code
            {...props}
            className={cn(
              'bg-surface-base-secondary px-1.5 py-0.5 rounded text-sm font-mono',
              className
            )}
          >
            {children}
          </code>
        )
      },
      h1: ({ children, ...props }: MarkdownComponentProps) => (
        <h1 className="text-3xl font-semibold text-text-primary mt-6 mb-3 first:mt-0" {...props}>
          {children}
        </h1>
      ),
      h2: ({ children, ...props }: MarkdownComponentProps) => (
        <h2 className="text-2xl font-semibold text-text-primary mt-5 mb-2 first:mt-0" {...props}>
          {children}
        </h2>
      ),
      h3: ({ children, ...props }: MarkdownComponentProps) => (
        <h3 className="text-xl font-semibold text-text-primary mt-4 mb-2 first:mt-0" {...props}>
          {children}
        </h3>
      ),
      p: ({ children, ...props }: MarkdownComponentProps) => (
        <p className="mb-4 text-text-primary leading-relaxed" {...props}>
          {children}
        </p>
      ),
      ul: ({ children, ...props }: MarkdownComponentProps) => (
        <ul className="mb-4 space-y-1 list-disc pl-8 ml-0 block" {...props}>
          {children}
        </ul>
      ),
      ol: ({ children, ...props }: MarkdownComponentProps) => (
        <ol className="mb-4 space-y-1 list-decimal pl-8 ml-0 block" {...props}>
          {children}
        </ol>
      ),
      li: ({ children, ...props }: MarkdownComponentProps) => (
        <li className="text-text-primary list-item list-outside ml-0" {...props}>
          {children}
        </li>
      ),
      blockquote: ({ children, ...props }: MarkdownComponentProps) => (
        <blockquote
          className="border-l-4 border-not-started-primary pl-4 my-4 text-text-quaternary italic"
          {...props}
        >
          {children}
        </blockquote>
      ),
      a: ({ children, href, ...props }: MarkdownComponentProps & { href?: string }) => (
        <a
          href={href}
          className="text-text-quaternary underline hover:opacity-80 transition-opacity"
          target="_blank"
          rel="noopener noreferrer"
          {...props}
        >
          {children}
        </a>
      ),
      img: ({ src, alt, ...props }: MarkdownComponentProps & { src?: string; alt?: string }) => (
        <img src={src} alt={alt} className="max-w-full h-auto rounded-md my-4" {...props} />
      ),
      strong: ({ children, ...props }: MarkdownComponentProps) => (
        <strong className="font-semibold" {...props}>
          {children}
        </strong>
      ),
      em: ({ children, ...props }: MarkdownComponentProps) => (
        <em className="italic" {...props}>
          {children}
        </em>
      ),
      pre: ({ children, ...props }: MarkdownComponentProps) => (
        <pre
          className="bg-surface-base-secondary p-3 rounded-md overflow-x-auto my-4 border border-border-specific-panel-outline"
          {...props}
        >
          {children}
        </pre>
      ),
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value)
    }

    const renderPreview = () => (
      <>
        <div className="px-4 py-2 bg-surface-base-primary border-b border-border-specific-panel-outline text-xs font-medium text-text-quaternary">
          Preview
        </div>
        <div className="p-4 overflow-y-auto flex-1 text-sm prose prose-invert max-w-none">
          {value ? (
            <ReactMarkdown components={markdownComponents}>{value}</ReactMarkdown>
          ) : (
            <div className="text-text-quaternary italic">Start typing to see preview...</div>
          )}
        </div>
      </>
    )

    return (
      <>
        <div ref={ref} className={cn('flex flex-col', className)}>
          {label && (
            <label className="block text-xs text-text-tertiary mb-2">
              {label}
              {required && <span className="text-text-error ml-0.5">*</span>}
            </label>
          )}
          <div
            className={cn(
              'border rounded-lg overflow-hidden bg-surface-base-primary relative',
              error ? 'border-failed-secondary' : 'border-border-specific-panel-outline'
            )}
          >
            <div className="flex flex-col h-full">
              {renderToolbar(false, showPreview, setShowPreview)}

              {/* Editor */}
              <div className={cn('relative', showPreview && 'hidden')}>
                <textarea
                  ref={textareaRef}
                  value={value}
                  onChange={handleChange}
                  rows={rows}
                  className="w-full min-h-[300px] p-4 bg-surface-base-secondary text-text-primary font-mono text-sm leading-relaxed border-0 outline-none resize-y flex-1 placeholder:text-text-quaternary focus:bg-surface-base-primary"
                  placeholder="Write your markdown here..."
                />
              </div>

              {/* Preview - Full Width */}
              {showPreview && (
                <div className="flex flex-col bg-surface-base-primary min-h-[300px]">
                  {renderPreview()}
                </div>
              )}
            </div>
          </div>
          {error && <div className="text-failed-secondary text-sm mt-1">{error}</div>}
          <div className="text-text-quaternary text-xs mt-1">
            Use Markdown formatting for rich content. Live preview shown on the right.
          </div>
        </div>

        {/* Fullscreen Modal */}
        <Popup
          visible={isFullscreen}
          onHide={() => setIsFullscreen(false)}
          header={label || 'Markdown Editor'}
          hideFooter
          isFullWidth
          bodyClassName="!p-0"
        >
          <div className="flex flex-col h-[calc(85vh-80px)]">
            {renderToolbar(true, fullscreenPreview, setFullscreenPreview)}

            {/* Editor */}
            <div className={cn('flex-1', fullscreenPreview && 'hidden')}>
              <textarea
                ref={fullscreenTextareaRef}
                value={value}
                onChange={handleChange}
                className="w-full h-full p-4 bg-surface-base-secondary text-text-primary font-mono text-sm leading-relaxed border-0 outline-none resize-none placeholder:text-text-quaternary focus:bg-surface-base-primary"
                placeholder="Write your markdown here..."
              />
            </div>

            {/* Preview - Full Width */}
            {fullscreenPreview && (
              <div className="flex flex-col bg-surface-base-primary flex-1 overflow-y-auto">
                {renderPreview()}
              </div>
            )}
          </div>
        </Popup>
      </>
    )
  }
)

MarkdownEditor.displayName = 'MarkdownEditor'

export default MarkdownEditor
