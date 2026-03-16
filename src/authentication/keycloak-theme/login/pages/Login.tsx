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

import { useState, type FormEvent } from 'react'

import ChevronDownSvg from '@/assets/icons/chevron-down.svg?react'
import ChevronUpSvg from '@/assets/icons/chevron-up.svg?react'
import Button from '@/components/Button'
import Input from '@/components/form/Input/Input'

import PasswordToggleButton from '../../../components/PasswordToggleButton'

import type { I18n } from '../i18n'
import type { KcContext } from '../KcContext'
import type { PageProps } from 'keycloakify/login/pages/PageProps'

/** Matches any character outside printable ASCII (0x21–0x7E): spaces, control chars, non-ASCII */
const PASSWORD_CHAR_FILTER = /[^\x21-\x7E]/g

export default function Login(props: PageProps<Extract<KcContext, { pageId: 'login.ftl' }>, I18n>) {
  const { kcContext, Template } = props
  const { url, login, messagesPerField } = kcContext

  const [username, setUsername] = useState(login.username ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emptyFieldsError, setEmptyFieldsError] = useState(false)
  const hasServerErrors =
    messagesPerField?.existsError('username', 'password') || kcContext.message?.type === 'error'
  const hasErrors = hasServerErrors || emptyFieldsError
  const [showMoreOptions, setShowMoreOptions] = useState(!!hasErrors)

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    const trimmedPassword = password.trim()
    if (!username.trim() || !trimmedPassword) {
      e.preventDefault()
      setEmptyFieldsError(true)
    } else {
      const passwordInput = e.currentTarget.elements.namedItem('password') as HTMLInputElement
      if (passwordInput) passwordInput.value = trimmedPassword
    }
  }

  const getPasswordError = (): string | undefined => {
    let error: string | undefined
    if (emptyFieldsError) error = "Username/Password can't be empty"
    else if (hasServerErrors) error = 'Invalid username or password'
    return error
  }

  const hasSocialProviders = kcContext.social?.providers && kcContext.social.providers.length > 0

  return (
    <Template {...props} headerNode={null} displayMessage={false}>
      <div className="flex flex-col items-center">
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-mono text-2xl font-semibold leading-6 text-text-primary">
            Welcome to CodeMie
          </h1>
          <p className="font-mono text-sm font-normal leading-5 text-text-quaternary">
            Please, sign in to continue.
          </p>
        </div>

        <div className="flex w-[370px] flex-col gap-4 mt-3.5">
          {/* SSO providers */}
          {hasSocialProviders &&
            kcContext.social?.providers?.map((provider) => (
              <Button
                key={provider.providerId}
                buttonType="button"
                className="h-10 w-full px-6 py-3 font-mono text-sm font-semibold leading-4"
                onClick={() => {
                  window.location.href = provider.loginUrl
                }}
              >
                Sign in with {provider.displayName}
              </Button>
            ))}

          {/* More options */}
          {hasSocialProviders && (
            <button
              type="button"
              onClick={() => setShowMoreOptions(!showMoreOptions)}
              className="flex flex-col items-center justify-center gap-0 cursor-pointer mt-4"
              aria-expanded={showMoreOptions}
              aria-label={showMoreOptions ? 'Hide sign-in options' : 'Show more sign-in options'}
            >
              <span className="font-mono text-sm font-normal leading-5 text-text-quaternary">
                more options
              </span>
              {!showMoreOptions && (
                <ChevronDownSvg className="h-[18px] w-[18px] text-text-quaternary" />
              )}
            </button>
          )}

          {/* Login form - collapsible when SSO is available */}
          <div
            className={
              hasSocialProviders
                ? `overflow-hidden transition-all duration-300 ${
                    showMoreOptions ? 'max-h-[400px] opacity-100' : 'max-h-0 opacity-0'
                  }`
                : ''
            }
          >
            <form
              action={url.loginAction}
              method="post"
              className="flex flex-col gap-2"
              onSubmit={handleSubmit}
            >
              {/* Email/Username */}
              <Input
                name="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value)
                  setEmptyFieldsError(false)
                }}
                placeholder="Email"
                autoComplete="off"
                containerClass={hasErrors ? 'border-failed-secondary' : undefined}
                aria-label="Email address"
                aria-required="true"
                aria-invalid={hasErrors}
              />

              {/* Password */}
              <div className="relative">
                <Input
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  keyfilter={PASSWORD_CHAR_FILTER}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setEmptyFieldsError(false)
                  }}
                  placeholder="Password"
                  autoComplete="off"
                  error={getPasswordError()}
                  errorClassName="!text-xs !text-error"
                  aria-label="Password"
                  aria-required="true"
                  aria-invalid={hasErrors}
                >
                  <PasswordToggleButton
                    showPassword={showPassword}
                    onToggle={() => setShowPassword(!showPassword)}
                    className="right-4"
                  />
                </Input>
              </div>

              {/* Submit */}
              <Button
                buttonType="submit"
                type="base"
                className="h-10 w-full px-4 py-3 font-mono text-sm leading-4"
                aria-label="Sign in to your account"
              >
                Sign In
              </Button>
            </form>

            {/* Chevron up when expanded */}
            {hasSocialProviders && showMoreOptions && (
              <button
                type="button"
                onClick={() => setShowMoreOptions(false)}
                className="mt-4 flex w-full justify-center cursor-pointer"
                aria-label="Hide sign-in options"
              >
                <ChevronUpSvg className="h-[18px] w-[18px] text-text-quaternary" />
              </button>
            )}
          </div>
        </div>
      </div>
    </Template>
  )
}
