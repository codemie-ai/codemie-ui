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

import StandaloneLayout from '@/components/Layouts/StandaloneLayout'

import ErrorActionButtons from './ErrorActionButtons'
import ErrorFooter from './ErrorFooter'

interface NotFoundErrorProps {
  onGoHome: () => void
}

const NotFoundError: FC<NotFoundErrorProps> = ({ onGoHome }) => {
  return (
    <StandaloneLayout>
      <div className="flex flex-col items-center justify-between min-h-screen px-4">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center max-w-2xl mt-[60px]">
            <div className="mb-2">
              <div className="font-geist-mono text-[128px] font-black leading-none text-text-main">
                404
              </div>
            </div>

            <h1 className="text-4xl font-semibold leading-9 text-text-main mb-4">Page Not Found</h1>

            <div className="text-sm font-normal leading-5 text-text-main mb-4 space-y-1">
              <p>We couldn&apos;t find the page you were looking for.</p>
              <p>Check the URL to make sure it&apos;s correct and try again.</p>
            </div>

            <ErrorActionButtons onGoHome={onGoHome} />
          </div>
        </div>

        <ErrorFooter />
      </div>
    </StandaloneLayout>
  )
}

export default NotFoundError
