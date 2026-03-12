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

import Input from '@/components/form/Input/Input'

import FormActionButtons from '../../../components/FormActionButtons'
import LogoutSessionsCheckbox from '../../../components/LogoutSessionsCheckbox'
import PasswordToggleButton from '../../../components/PasswordToggleButton'

import type { I18n } from '../i18n'
import type { KcContext } from '../KcContext'
import type { PageProps } from 'keycloakify/login/pages/PageProps'

export default function LoginUpdatePassword(
  props: PageProps<Extract<KcContext, { pageId: 'login-update-password.ftl' }>, I18n>
) {
  const { kcContext, i18n, Template } = props
  const { url, messagesPerField, isAppInitiatedAction } = kcContext

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [logoutOtherSessions, setLogoutOtherSessions] = useState(true)

  const { msg, msgStr } = i18n

  return (
    <Template
      {...props}
      displayMessage={!messagesPerField.existsError('password', 'password-confirm')}
      headerNode={null}
    >
      <div className="flex flex-col items-center">
        <div className="mb-8 text-center">
          <h1 className="mb-2 text-3xl font-semibold text-text-primary">
            {msg('updatePasswordTitle')}
          </h1>
          <p className="text-sm text-text-quaternary">Please enter your new password below.</p>
        </div>

        <div className="flex w-[400px] flex-col gap-6">
          <form action={url.loginAction} method="post" className="flex flex-col gap-6">
            {/* New Password */}
            <div className="relative">
              <Input
                name="password-new"
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder={msgStr('passwordNew')}
                autoComplete="off"
                autoFocus
                error={
                  messagesPerField?.existsError('password')
                    ? messagesPerField.get('password')
                    : undefined
                }
                errorClassName="!text-xs !text-error"
                aria-label={msgStr('passwordNew')}
                aria-required="true"
                aria-invalid={messagesPerField?.existsError('password')}
              >
                <PasswordToggleButton
                  showPassword={showNewPassword}
                  onToggle={() => setShowNewPassword(!showNewPassword)}
                  className="right-4"
                />
              </Input>
            </div>

            {/* Confirm Password */}
            <div className="relative">
              <Input
                name="password-confirm"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={msgStr('passwordConfirm')}
                autoComplete="off"
                error={
                  messagesPerField?.existsError('password-confirm')
                    ? messagesPerField.get('password-confirm')
                    : undefined
                }
                errorClassName="!text-xs !text-error"
                aria-label={msgStr('passwordConfirm')}
                aria-required="true"
                aria-invalid={messagesPerField?.existsError('password-confirm')}
              >
                <PasswordToggleButton
                  showPassword={showConfirmPassword}
                  onToggle={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="right-4"
                />
              </Input>
            </div>

            {/* Logout from other sessions */}
            <LogoutSessionsCheckbox
              checked={logoutOtherSessions}
              onChange={setLogoutOtherSessions}
              label={msg('logoutOtherSessions')}
            />

            {/* Buttons */}
            <FormActionButtons
              isAppInitiatedAction={isAppInitiatedAction}
              loginActionUrl={url.loginAction}
              cancelLabel={msg('doCancel')}
              submitLabel={msg('doSubmit')}
              cancelAriaLabel="Cancel password update"
              submitAriaLabel="Submit new password"
            />
          </form>
        </div>
      </div>
    </Template>
  )
}
