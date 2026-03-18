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

import { useState } from 'react'

import Button from '@/components/Button'
import Input from '@/components/form/Input/Input'

import type { I18n } from '../i18n'
import type { KcContext } from '../KcContext'
import type { PageProps } from 'keycloakify/login/pages/PageProps'

export default function LoginResetPassword(
  props: PageProps<Extract<KcContext, { pageId: 'login-reset-password.ftl' }>, I18n>
) {
  const { kcContext, i18n, Template } = props
  const { url, realm, auth, messagesPerField } = kcContext

  const { msg, msgStr } = i18n

  const [username, setUsername] = useState(auth?.attemptedUsername ?? '')

  // Determine field label
  const getUsernameLabel = () => {
    if (!realm.loginWithEmailAllowed) return msgStr('username')
    if (!realm.registrationEmailAsUsername) return msgStr('usernameOrEmail')
    return msgStr('email')
  }

  // Determine instruction message
  const getInstructionMessage = () => {
    if (realm.duplicateEmailsAllowed) return msg('emailInstructionUsername')
    return msg('emailInstruction')
  }

  return (
    <Template
      {...props}
      displayMessage={!messagesPerField.existsError('username')}
      headerNode={null}
    >
      <div className="flex flex-col items-center">
        {/* Key icon */}
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
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        </div>

        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-semibold text-text-primary">
            {msg('emailForgotTitle')}
          </h1>
          <p className="text-sm text-text-quaternary">{getInstructionMessage()}</p>
        </div>

        <div className="flex w-[400px] flex-col gap-6">
          <form
            action={url.loginAction}
            method="post"
            className="flex flex-col gap-6"
            autoComplete="new-password"
          >
            {/* Username/Email */}
            <Input
              name="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder={getUsernameLabel()}
              autoComplete="new-password"
              autoFocus
              error={
                messagesPerField?.existsError('username')
                  ? messagesPerField.get('username')
                  : undefined
              }
              errorClassName="!text-xs !text-error"
              aria-label={getUsernameLabel()}
              aria-required="true"
              aria-invalid={messagesPerField?.existsError('username')}
            />

            {/* Buttons */}
            <div className="flex flex-col gap-3">
              <Button buttonType="submit" className="w-full" aria-label="Submit password reset">
                {msg('doSubmit')}
              </Button>

              <Button
                buttonType="button"
                variant="secondary"
                className="w-full"
                onClick={() => {
                  window.location.href = url.loginUrl
                }}
                aria-label="Back to login"
              >
                {msg('backToLogin')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Template>
  )
}
