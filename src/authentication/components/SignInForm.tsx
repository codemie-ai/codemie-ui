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

import { yupResolver } from '@hookform/resolvers/yup'
import React, { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import * as Yup from 'yup'

import Button from '@/components/Button'
import Input from '@/components/form/Input/Input'
import { VALIDATION_MESSAGES } from '@/constants/validation'
import { SignInFormData } from '@/types/auth'

import PasswordToggleButton from './PasswordToggleButton'

interface SignInFormProps {
  onSubmit: (data: SignInFormData, reset: () => void) => void | Promise<void>
  isLoading?: boolean
}

const signInSchema = Yup.object().shape({
  email: Yup.string()
    .email(VALIDATION_MESSAGES.EMAIL_INVALID)
    .required(VALIDATION_MESSAGES.EMAIL_REQUIRED),
  password: Yup.string().required(VALIDATION_MESSAGES.PASSWORD_REQUIRED),
})

const SignInForm: React.FC<SignInFormProps> = ({ onSubmit, isLoading = false }) => {
  // Form configuration with validation schema
  const formMethods = useForm<SignInFormData>({
    resolver: yupResolver(signInSchema),
    mode: 'onChange',
    defaultValues: {
      email: '',
      password: '',
    },
  })

  const { control, handleSubmit, reset, formState } = formMethods
  const { errors, isValid } = formState

  // Password visibility toggle state
  const [showPassword, setShowPassword] = useState(false)
  const togglePasswordVisibility = () => setShowPassword((prev) => !prev)

  // Form submit handler
  const onFormSubmit = (data: SignInFormData) => {
    onSubmit(data, reset)
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="flex flex-col gap-6 w-[400px]">
      {/* Email Input Field */}
      <Controller
        name="email"
        control={control}
        render={({ field }) => {
          const emailError = errors.email?.message
          const isEmailInvalid = !!errors.email

          return (
            <Input
              {...field}
              type="email"
              placeholder="Email"
              disabled={isLoading}
              autoComplete="off"
              error={emailError}
              errorClassName="!text-xs !text-error"
              aria-label="Email address"
              aria-required="true"
              aria-invalid={isEmailInvalid}
            />
          )
        }}
      />

      {/* Password Input Field with visibility toggle */}
      <div className="relative">
        <Controller
          name="password"
          control={control}
          render={({ field }) => {
            const inputType = showPassword ? 'text' : 'password'
            const hasError = !!errors.password

            return (
              <Input
                {...field}
                type={inputType}
                placeholder="Password"
                disabled={isLoading}
                autoComplete="off"
                error={errors.password?.message}
                errorClassName="!text-xs !text-error"
                aria-label="Password"
                aria-required="true"
                aria-invalid={hasError}
              >
                <PasswordToggleButton
                  showPassword={showPassword}
                  onToggle={togglePasswordVisibility}
                  disabled={isLoading}
                  className="right-4"
                />
              </Input>
            )
          }}
        />
      </div>

      {/* Submit Button */}
      <Button
        buttonType="submit"
        isLoading={isLoading}
        disabled={!isValid || isLoading}
        className="w-fit ml-auto"
        aria-label="Sign in to your account"
      >
        Sign In
      </Button>
    </form>
  )
}

export default SignInForm
