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

import { FC } from 'react'

import { ONBOARDING_ASSISTANT_SLUG } from '@/constants/assistants'

const linkClassName =
  'text-sm font-normal leading-4 !text-text-accent-status hover:!text-text-accent-status-hover transition-colors no-underline hover:no-underline'

const ErrorFooter: FC = () => {
  return (
    <div className="mb-[50px] text-center">
      <h3 className="text-sm font-semibold leading-4 text-text-main mb-1">Popular destinations</h3>

      <p className="text-sm font-normal leading-4 text-text-main mb-3">
        These pages are frequently used by our users
      </p>

      <nav className="flex justify-center gap-8">
        <a href="/" className={linkClassName}>
          Home
        </a>
        <a href="/#/help" className={linkClassName}>
          Help Center
        </a>
        <a href={`/#/assistants/${ONBOARDING_ASSISTANT_SLUG}/start`} className={linkClassName}>
          FAQ
        </a>
      </nav>
    </div>
  )
}

export default ErrorFooter
