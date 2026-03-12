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
import { useRouteError, isRouteErrorResponse, useNavigate } from 'react-router'

import NotFoundError from './components/NotFoundError'
import RuntimeError from './components/RuntimeError'

const ErrorPage: FC = () => {
  const error = useRouteError()
  const navigate = useNavigate()

  const handleGoHome = () => navigate('/')

  // 404 Error
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundError onGoHome={handleGoHome} />
  }

  // Runtime Error
  let errorDetails: string | undefined

  if (error instanceof Error) {
    errorDetails = error.stack
  }

  return <RuntimeError errorDetails={errorDetails} onGoHome={handleGoHome} />
}

export default ErrorPage
