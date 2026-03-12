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

import DefaultPage from 'keycloakify/login/DefaultPage'
import UserProfileFormFields from 'keycloakify/login/UserProfileFormFields'
import { lazy, Suspense } from 'react'

import { useI18n } from './i18n'
import Template from './Template'

import type { KcContext } from './KcContext'

const Login = lazy(() => import('./pages/Login'))
const LoginUpdatePassword = lazy(() => import('./pages/LoginUpdatePassword'))
const LoginConfigTotp = lazy(() => import('./pages/LoginConfigTotp'))
const Error = lazy(() => import('./pages/Error'))
const LoginPageExpired = lazy(() => import('./pages/LoginPageExpired'))
const LoginOtp = lazy(() => import('./pages/LoginOtp'))
const LoginVerifyEmail = lazy(() => import('./pages/LoginVerifyEmail'))
const LoginResetPassword = lazy(() => import('./pages/LoginResetPassword'))

export default function KcPage(props: { kcContext: KcContext }) {
  const { kcContext } = props
  const { i18n } = useI18n({ kcContext })

  return (
    <Suspense>
      {(() => {
        switch (kcContext.pageId) {
          case 'login.ftl':
            return (
              <Login
                kcContext={kcContext}
                i18n={i18n}
                Template={Template}
                classes={{}}
                doUseDefaultCss={false}
              />
            )
          case 'login-update-password.ftl':
            return (
              <LoginUpdatePassword
                kcContext={kcContext}
                i18n={i18n}
                Template={Template}
                classes={{}}
                doUseDefaultCss={false}
              />
            )
          case 'login-config-totp.ftl':
            return (
              <LoginConfigTotp
                kcContext={kcContext}
                i18n={i18n}
                Template={Template}
                classes={{}}
                doUseDefaultCss={false}
              />
            )
          case 'error.ftl':
            return (
              <Error
                kcContext={kcContext}
                i18n={i18n}
                Template={Template}
                classes={{}}
                doUseDefaultCss={false}
              />
            )
          case 'login-page-expired.ftl':
            return (
              <LoginPageExpired
                kcContext={kcContext}
                i18n={i18n}
                Template={Template}
                classes={{}}
                doUseDefaultCss={false}
              />
            )
          case 'login-otp.ftl':
            return (
              <LoginOtp
                kcContext={kcContext}
                i18n={i18n}
                Template={Template}
                classes={{}}
                doUseDefaultCss={false}
              />
            )
          case 'login-verify-email.ftl':
            return (
              <LoginVerifyEmail
                kcContext={kcContext}
                i18n={i18n}
                Template={Template}
                classes={{}}
                doUseDefaultCss={false}
              />
            )
          case 'login-reset-password.ftl':
            return (
              <LoginResetPassword
                kcContext={kcContext}
                i18n={i18n}
                Template={Template}
                classes={{}}
                doUseDefaultCss={false}
              />
            )
          default:
            return (
              <DefaultPage
                kcContext={kcContext}
                i18n={i18n}
                Template={Template}
                classes={{}}
                doUseDefaultCss={true}
                UserProfileFormFields={UserProfileFormFields}
                doMakeUserConfirmPassword={true}
              />
            )
        }
      })()}
    </Suspense>
  )
}
