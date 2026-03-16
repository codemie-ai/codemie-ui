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

import React, { useState } from 'react'
import { useNavigate } from 'react-router'

import Button from '@/components/Button'
import StandaloneLayout from '@/components/Layouts/StandaloneLayout'
import toaster from '@/utils/toaster'

import SignInForm from '../components/SignInForm'

const SignInPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()

  const handleSignIn = async (data: { email: string; password: string }, reset: () => void) => {
    setIsLoading(true)
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => {
        setTimeout(resolve, 2000)
      })

      console.log('Sign in payload:', data)

      // Clear form
      reset()

      // TODO: Add redirect logic when backend is ready
      // navigate('/dashboard')
    } catch (error) {
      console.error('Sign in error:', error)
      toaster.error('Failed to sign in')
    } finally {
      setIsLoading(false)
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

        <SignInForm onSubmit={(data, reset) => handleSignIn(data, reset)} isLoading={isLoading} />
      </div>
    </StandaloneLayout>
  )
}

export default SignInPage
