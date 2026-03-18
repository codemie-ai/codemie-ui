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

import type { I18n } from '../i18n'
import type { KcContext } from '../KcContext'
import type { PageProps } from 'keycloakify/login/pages/PageProps'

export default function LoginConfigTotp(
  props: PageProps<Extract<KcContext, { pageId: 'login-config-totp.ftl' }>, I18n>
) {
  const { kcContext, i18n, Template } = props
  const { url, isAppInitiatedAction, totp, mode, messagesPerField } = kcContext

  const [totpCode, setTotpCode] = useState('')
  const [deviceName, setDeviceName] = useState('')
  const [logoutOtherSessions, setLogoutOtherSessions] = useState(true)

  const { msg, msgStr, advancedMsg } = i18n

  const isManualMode = mode === 'manual'

  return (
    <Template
      {...props}
      displayMessage={!messagesPerField.existsError('totp', 'userLabel')}
      headerNode={null}
    >
      <div className="flex flex-col items-center">
        <div className="mb-6 text-center">
          <h1 className="mb-2 text-3xl font-semibold text-text-primary">{msg('loginTotpTitle')}</h1>
          <p className="text-sm text-text-quaternary">
            Set up two-factor authentication for your account.
          </p>
        </div>

        <div className="flex w-[400px] max-h-[calc(100vh-200px)] flex-col gap-4 overflow-y-auto px-1">
          {/* Instructions - compact version */}
          <div className="rounded-lg border border-border-structural bg-surface-secondary p-4">
            {/* Step 1: Install app - compact */}
            <div className="mb-3">
              <p className="mb-1 text-xs font-medium text-text-primary">{msg('loginTotpStep1')}</p>
              <p className="text-xs text-text-tertiary">
                {totp.supportedApplications.map((app, index) => (
                  <span key={app}>
                    {advancedMsg(app)}
                    {index < totp.supportedApplications.length - 1 ? ', ' : ''}
                  </span>
                ))}
              </p>
            </div>

            {/* Step 2: QR Code or Manual - compact */}
            <div className="mb-3 border-t border-border-structural pt-3">
              {isManualMode ? (
                <>
                  <p className="mb-2 text-xs font-medium text-text-primary">
                    {msg('loginTotpManualStep2')}
                  </p>
                  <div className="mb-2 rounded bg-surface-primary p-2">
                    <code className="break-all text-xs text-text-primary">
                      {totp.totpSecretEncoded}
                    </code>
                  </div>
                  <a
                    href={totp.qrUrl}
                    className="text-xs text-border-accent hover:underline"
                    id="mode-barcode"
                  >
                    {msg('loginTotpScanBarcode')}
                  </a>
                </>
              ) : (
                <>
                  <p className="mb-2 text-xs font-medium text-text-primary">
                    {msg('loginTotpStep2')}
                  </p>
                  <div className="flex justify-center rounded-lg bg-surface-primary p-3">
                    <img
                      id="kc-totp-secret-qr-code"
                      src={`data:image/png;base64, ${totp.totpSecretQrCode}`}
                      alt="QR Code for 2FA setup"
                      className="h-32 w-32"
                    />
                  </div>
                  <a
                    href={totp.manualUrl}
                    className="mt-2 inline-block text-xs text-border-accent hover:underline"
                    id="mode-manual"
                  >
                    {msg('loginTotpUnableToScan')}
                  </a>
                </>
              )}
            </div>

            {/* Step 3: Enter code - compact */}
            <div className="border-t border-border-structural pt-3">
              <p className="text-xs text-text-tertiary">{msg('loginTotpStep3DeviceName')}</p>
            </div>
          </div>

          {/* Form */}
          <form action={url.loginAction} method="post" className="flex flex-col gap-4">
            {/* Hidden fields */}
            <input type="hidden" id="totpSecret" name="totpSecret" value={totp.totpSecret} />
            {mode && <input type="hidden" id="mode" name="mode" value={mode} />}

            {/* One-time code */}
            <Input
              name="totp"
              type="text"
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              placeholder={msgStr('authenticatorCode')}
              autoComplete="new-password"
              autoFocus
              error={
                messagesPerField?.existsError('totp') ? messagesPerField.get('totp') : undefined
              }
              errorClassName="!text-xs !text-error"
              aria-label={msgStr('authenticatorCode')}
              aria-required="true"
              aria-invalid={messagesPerField?.existsError('totp')}
            />

            {/* Device Name */}
            <Input
              name="userLabel"
              type="text"
              value={deviceName}
              onChange={(e) => setDeviceName(e.target.value)}
              placeholder={msgStr('loginTotpDeviceName')}
              autoComplete="new-password"
              error={
                messagesPerField?.existsError('userLabel')
                  ? messagesPerField.get('userLabel')
                  : undefined
              }
              errorClassName="!text-xs !text-error"
              aria-label={msgStr('loginTotpDeviceName')}
              aria-required={totp.otpCredentials.length >= 1}
              aria-invalid={messagesPerField?.existsError('userLabel')}
            />

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
              cancelAriaLabel="Cancel 2FA setup"
              submitAriaLabel="Submit 2FA configuration"
            />
          </form>
        </div>
      </div>
    </Template>
  )
}
