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

import { FC } from 'react'

import PageLayout from '@/components/Layouts/Layout'
import Markdown from '@/components/markdown/Markdown'

import { useTermsAndConditions } from './hooks/useTermsAndConditions'

import './TermsAndConditionsPage.scss'

class TermsNotFoundError extends Error {
  status = 404

  statusText = 'Not Found'

  internal = false

  data = null
}

const normalizeMarkdownContent = (content: string): string =>
  content
    .replace(/\\r\\n|\\n|\\r/g, '\n')
    .replace(/^# /, '## ')
    .replace(/^#{1,6}\s+CodeMie SaaS Terms and Conditions(?:\s+[—-].*)?(?:\n+|$)/, '')

const splitMarkdownIntoSections = (content: string): string[] => {
  const trimmedContent = content.trim()

  if (!trimmedContent) {
    return []
  }

  const sections: string[] = []
  let currentSection: string[] = []

  trimmedContent.split('\n').forEach((line) => {
    if (/^##\s+/.test(line) && currentSection.length > 0) {
      sections.push(currentSection.join('\n').trim())
      currentSection = []
    }

    currentSection.push(line)
  })

  if (currentSection.length > 0) {
    sections.push(currentSection.join('\n').trim())
  }

  return sections
}

const TermsAndConditionsPage: FC = () => {
  const { isLoaded, isEnabled, content } = useTermsAndConditions()

  if (!isLoaded) {
    return <PageLayout isLoading />
  }

  if (!isEnabled) {
    throw new TermsNotFoundError()
  }

  const hasContent = Boolean(content?.trim())
  const normalizedContent = hasContent ? normalizeMarkdownContent(content!) : ''
  const contentSections = hasContent ? splitMarkdownIntoSections(normalizedContent) : []

  return (
    <PageLayout limitWidth>
      <article className="terms-document w-full max-w-[760px] mx-auto py-7 font-geist lg:py-9">
        <header className="terms-document__hero relative overflow-hidden rounded-2xl border border-border-specific-panel-outline bg-surface-base-secondary px-5 py-5 shadow-sm sm:px-6">
          <div className="terms-document__hero-glow" aria-hidden="true" />
          <p className="relative mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-text-accent-status">
            CodeMie Policy
          </p>
          <h1 className="relative max-w-2xl text-xl font-semibold leading-tight text-text-primary sm:text-2xl">
            Terms and Conditions
          </h1>
          <p className="relative mt-3 max-w-2xl text-sm leading-6 text-text-secondary">
            Review CodeMie usage expectations, budget guidance, external exploration limits, data
            handling, and AI-generated content responsibilities.
          </p>
        </header>

        <section className="terms-document__sections mt-4" aria-label="Terms sections">
          {contentSections.length > 0 ? (
            contentSections.map((sectionContent, index) => (
              <article
                className="terms-document__section rounded-xl border border-border-specific-panel-outline bg-surface-base-secondary/75 px-5 py-4 shadow-sm"
                key={`${index}-${sectionContent.slice(0, 40)}`}
              >
                <Markdown className="terms-document__markdown" content={sectionContent} />
              </article>
            ))
          ) : (
            <p className="text-sm leading-6 text-text-secondary">
              Terms and Conditions are currently unavailable. Please try again later.
            </p>
          )}
        </section>
      </article>
    </PageLayout>
  )
}

export default TermsAndConditionsPage
