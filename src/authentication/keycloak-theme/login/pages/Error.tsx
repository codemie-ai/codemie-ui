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

import { kcSanitize } from 'keycloakify/lib/kcSanitize'

import Button from '@/components/Button'

import type { I18n } from '../i18n'
import type { KcContext } from '../KcContext'
import type { PageProps } from 'keycloakify/login/pages/PageProps'

export default function Error(props: PageProps<Extract<KcContext, { pageId: 'error.ftl' }>, I18n>) {
  const { kcContext, i18n, Template } = props
  const { message, client, skipLink } = kcContext

  const { msg } = i18n

  return (
    <Template {...props} displayMessage={false} headerNode={null}>
      <div className="flex flex-col items-center">
        {/* Error icon */}
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-failed-secondary/10">
          <svg
            className="h-8 w-8 text-failed-secondary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-semibold text-text-primary">{msg('errorTitle')}</h1>
          <p className="text-sm text-text-quaternary">
            Please try again or contact support if the problem persists.
          </p>
        </div>

        {/* Error message */}
        <div className="w-[400px]">
          <div className="mb-6 rounded-lg bg-failed-secondary/10 px-4 py-3 text-sm text-failed-secondary">
            <div dangerouslySetInnerHTML={{ __html: kcSanitize(message.summary) }} />
          </div>

          {/* Back to application button */}
          {!skipLink && client !== undefined && client.baseUrl !== undefined && (
            <div className="flex justify-center">
              <Button
                buttonType="button"
                className="w-fit"
                onClick={() => {
                  window.location.href = client.baseUrl!
                }}
                aria-label="Back to application"
              >
                {msg('backToApplication')}
              </Button>
            </div>
          )}
        </div>
      </div>
    </Template>
  )
}
