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

import React, { useEffect } from 'react'
import { UseFormSetError } from 'react-hook-form'
import { useNavigate } from 'react-router'
import { useSnapshot } from 'valtio'

import Button from '@/components/Button'
import StandaloneLayout from '@/components/Layouts/StandaloneLayout'
import { authStore } from '@/store/auth'
import { SignInFormData } from '@/types/auth'
import toaster from '@/utils/toaster'
import { ValidationError } from '@/utils/validationError'

import SignInForm from '../components/SignInForm'

const SignInPage: React.FC = () => {
  const navigate = useNavigate()
  const { loading } = useSnapshot(authStore)

  useEffect(() => {
    const wasExpired = sessionStorage.getItem('sessionExpired')
    if (wasExpired === 'true') {
      toaster.error('Session expired')
      sessionStorage.removeItem('sessionExpired')
    }
  }, [])

  const handleSignIn = async (data: SignInFormData, setError: UseFormSetError<SignInFormData>) => {
    try {
      await authStore.login(data)
      navigate('/')
    } catch (e) {
      if (e instanceof ValidationError) {
        const items = e.fieldErrors
          .map(({ msg }) => `<li class="mt-1.5">${msg.charAt(0).toUpperCase() + msg.slice(1)}</li>`)
          .join('')
        toaster.error(`Validation error<br><ul>${items}</ul>`)
        e.fieldErrors.forEach(({ field, msg }) => {
          setError(field as keyof SignInFormData, { message: msg })
        })
      } else if (e instanceof Error) {
        toaster.error(e.message)
      }
    }
  }

  return (
    <StandaloneLayout
      headerContent={
        <div className="flex items-center gap-3">
          <span className="text-base leading-6 text-text-quaternary">New to Codemie?</span>
          <Button
            type="secondary"
            size="medium"
            className="with-content"
            onClick={() => navigate('/auth/sign-up')}
          >
            Sign Up
          </Button>
        </div>
      }
    >
      <div className="flex flex-col items-center">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-semibold text-text-primary mb-2">Welcome to CodeMie</h1>
          <p className="text-sm text-text-quaternary">Please, sign in to continue.</p>
        </div>

        <SignInForm onSubmit={handleSignIn} isLoading={loading} />
      </div>
    </StandaloneLayout>
  )
}

export default SignInPage
