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

export default function LogoutConfirm(
  props: Readonly<PageProps<Extract<KcContext, { pageId: 'logout-confirm.ftl' }>, I18n>>
) {
  const { kcContext, i18n, Template } = props
  const { url, client, logoutConfirm } = kcContext

  const { msg } = i18n

  // Registered client URL resolved by Keycloak, absent when the logout was not client-initiated
  const backToApplicationUrl = logoutConfirm.skipLink ? undefined : client.baseUrl

  return (
    <Template {...props} headerNode={null}>
      <div className="flex flex-col items-center">
        <div className="flex flex-col items-center gap-2">
          <h1 className="font-mono text-2xl font-semibold leading-6 text-text-primary">
            {msg('logoutConfirmTitle')}
          </h1>
          <p className="text-center font-mono text-sm font-normal leading-5 text-text-quaternary">
            {msg('logoutConfirmHeader')}
          </p>
        </div>

        <div className="mt-8 flex w-[370px] flex-col gap-4">
          <form id="kc-logout-confirm" action={url.logoutConfirmAction} method="POST">
            <input type="hidden" name="session_code" value={logoutConfirm.code} />
            <Button
              buttonType="submit"
              name="confirmLogout"
              id="kc-logout"
              className="h-10 w-full px-6 py-3 font-mono text-sm font-semibold leading-4"
              aria-label="Confirm logout"
            >
              {msg('doLogout')}
            </Button>
          </form>

          {/* Cancel: return to the application that initiated the logout */}
          {backToApplicationUrl && (
            <Button
              buttonType="button"
              type="base"
              className="h-10 w-full px-6 py-3 font-mono text-sm leading-4"
              onClick={() => {
                window.location.href = backToApplicationUrl
              }}
              aria-label="Back to application"
            >
              {msg('backToApplication')}
            </Button>
          )}
        </div>
      </div>
    </Template>
  )
}
