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

import StandaloneLayout from '@/components/Layouts/StandaloneLayout'

import type { I18n } from './i18n'
import type { KcContext } from './KcContext'
import type { TemplateProps } from 'keycloakify/login/TemplateProps'

export default function Template(props: TemplateProps<KcContext, I18n>) {
  const { kcContext, displayMessage = true, children } = props

  return (
    <StandaloneLayout>
      <div className="flex flex-col items-center">
        {/* Server-side messages */}
        {displayMessage &&
          kcContext.message &&
          kcContext.message.type === 'error' &&
          !kcContext.messagesPerField?.existsError('username', 'password') && (
            <div className="mb-6 w-[400px] rounded-lg bg-failed-secondary/10 px-4 py-3 text-sm text-failed-secondary">
              <span>{kcContext.message.summary}</span>
            </div>
          )}

        {children}
      </div>
    </StandaloneLayout>
  )
}
