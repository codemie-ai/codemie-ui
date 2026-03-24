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

import { FC, useEffect } from 'react'

import StandaloneLayout from '@/components/Layouts/StandaloneLayout'

const LoginSuccessPage: FC = () => {
  useEffect(() => {
    window.opener?.postMessage({ type: 'mcp-login-success' }, window.location.origin)
    window.close()
  }, [])

  return (
    <StandaloneLayout>
      <div className="flex flex-col items-center gap-4 text-center max-w-md">
        <h1 className="text-2xl font-semibold text-text-primary">Login Successful</h1>
        <p className="text-text-secondary">
          You have successfully logged in. You can now close this tab and return to CodeMie.
        </p>
      </div>
    </StandaloneLayout>
  )
}

export default LoginSuccessPage
