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

import Button from '@/components/Button'

import type { I18n } from '../i18n'
import type { KcContext } from '../KcContext'
import type { PageProps } from 'keycloakify/login/pages/PageProps'

export default function LoginPageExpired(
  props: PageProps<Extract<KcContext, { pageId: 'login-page-expired.ftl' }>, I18n>
) {
  const { kcContext, i18n, Template } = props
  const { url } = kcContext

  const { msg } = i18n

  return (
    <Template {...props} headerNode={null}>
      <div className="flex flex-col items-center">
        {/* Clock/Timer icon */}
        <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-border-accent/10">
          <svg
            className="h-8 w-8 text-border-accent"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
        </div>

        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-semibold text-text-primary">
            {msg('pageExpiredTitle')}
          </h1>
          <p className="text-sm text-text-quaternary">
            Your session has timed out. Please choose an option below.
          </p>
        </div>

        {/* Options */}
        <div className="flex w-[400px] flex-col gap-6">
          {/* Restart option */}
          <div className="rounded-lg border border-border-structural bg-surface-secondary p-4">
            <p className="mb-3 text-sm text-text-secondary">{msg('pageExpiredMsg1')}</p>
            <Button
              buttonType="button"
              className="w-full"
              onClick={() => {
                window.location.href = url.loginRestartFlowUrl
              }}
              aria-label="Restart login process"
            >
              {msg('doClickHere')}
            </Button>
          </div>

          {/* Continue option */}
          <div className="rounded-lg border border-border-structural bg-surface-secondary p-4">
            <p className="mb-3 text-sm text-text-secondary">{msg('pageExpiredMsg2')}</p>
            <Button
              buttonType="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                window.location.href = url.loginAction
              }}
              aria-label="Continue login process"
            >
              {msg('doClickHere')}
            </Button>
          </div>
        </div>
      </div>
    </Template>
  )
}
