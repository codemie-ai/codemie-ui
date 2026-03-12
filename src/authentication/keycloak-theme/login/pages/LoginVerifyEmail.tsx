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

export default function LoginVerifyEmail(
  props: PageProps<Extract<KcContext, { pageId: 'login-verify-email.ftl' }>, I18n>
) {
  const { kcContext, i18n, Template } = props
  const { url, user } = kcContext

  const { msg } = i18n

  return (
    <Template {...props} headerNode={null}>
      <div className="flex flex-col items-center">
        {/* Email icon */}
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
              d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-semibold text-text-primary">
            {msg('emailVerifyTitle')}
          </h1>
          <p className="text-sm text-text-quaternary">
            Check your inbox and follow the instructions.
          </p>
        </div>

        <div className="flex w-[400px] flex-col gap-6">
          {/* Main message */}
          <div className="rounded-lg border border-border-structural bg-surface-secondary p-4">
            <p className="text-sm text-text-secondary">
              {msg('emailVerifyInstruction1', user?.email ?? '')}
            </p>
          </div>

          {/* Resend email section */}
          <div className="rounded-lg border border-border-structural bg-surface-secondary p-4">
            <p className="mb-3 text-sm text-text-secondary">
              {msg('emailVerifyInstruction2')} {msg('emailVerifyInstruction3')}
            </p>
            <Button
              buttonType="button"
              variant="secondary"
              className="w-full"
              onClick={() => {
                window.location.href = url.loginAction
              }}
              aria-label="Resend verification email"
            >
              {msg('doClickHere')}
            </Button>
          </div>
        </div>
      </div>
    </Template>
  )
}
