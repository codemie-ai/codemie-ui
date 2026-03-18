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

export default function LoginOtp(
  props: PageProps<Extract<KcContext, { pageId: 'login-otp.ftl' }>, I18n>
) {
  const { kcContext, i18n, Template } = props
  const { otpLogin, url, messagesPerField } = kcContext

  const { msg, msgStr } = i18n

  const [otpCode, setOtpCode] = useState('')
  const [selectedCredentialId, setSelectedCredentialId] = useState(
    otpLogin.selectedCredentialId || ''
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  const hasMultipleDevices = otpLogin.userOtpCredentials.length > 1

  return (
    <Template {...props} displayMessage={!messagesPerField.existsError('totp')} headerNode={null}>
      <div className="flex flex-col items-center">
        {/* Icon */}
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
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
            />
          </svg>
        </div>

        {/* Title */}
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-semibold text-text-primary">OTP Code</h1>
          <p className="text-sm text-text-quaternary">
            Enter the code from your authenticator app.
          </p>
        </div>

        <div className="flex w-[400px] flex-col gap-6">
          <form
            action={url.loginAction}
            method="post"
            onSubmit={() => {
              setIsSubmitting(true)
              return true
            }}
            className="flex flex-col gap-6"
          >
            {/* Multiple devices selector */}
            {hasMultipleDevices && (
              <div className="rounded-lg border border-border-structural bg-surface-secondary p-4">
                <p className="mb-3 text-sm font-medium text-text-primary">Select authenticator:</p>
                <div className="flex flex-col gap-2">
                  {otpLogin.userOtpCredentials.map((otpCredential) => (
                    <label
                      key={otpCredential.id}
                      className="flex cursor-pointer items-center gap-3 rounded-md p-2 transition hover:bg-surface-primary"
                    >
                      <input
                        type="radio"
                        name="selectedCredentialId"
                        value={otpCredential.id}
                        checked={selectedCredentialId === otpCredential.id}
                        onChange={(e) => setSelectedCredentialId(e.target.value)}
                        className="h-4 w-4 cursor-pointer border-border-structural text-border-accent focus:ring-2 focus:ring-border-accent focus:ring-offset-0"
                      />
                      <span className="text-sm text-text-secondary">{otpCredential.userLabel}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* OTP Code */}
            <Input
              name="otp"
              type="text"
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value)}
              placeholder={msgStr('loginOtpOneTime')}
              autoComplete="new-password"
              autoFocus
              error={
                messagesPerField?.existsError('totp') ? messagesPerField.get('totp') : undefined
              }
              errorClassName="!text-xs !text-error"
              aria-label={msgStr('loginOtpOneTime')}
              aria-required="true"
              aria-invalid={messagesPerField?.existsError('totp')}
            />

            {/* Submit */}
            <div className="flex justify-end">
              <Button
                buttonType="submit"
                className="w-fit"
                disabled={isSubmitting}
                aria-label="Sign in with OTP code"
              >
                {msg('doLogIn')}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </Template>
  )
}
