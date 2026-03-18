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
import React, { useState, useMemo } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { Tooltip } from 'react-tooltip'
import * as Yup from 'yup'

import CheckSvg from '@/assets/icons/check.svg?react'
import CrossSvg from '@/assets/icons/cross.svg?react'
import InfoSvg from '@/assets/icons/info.svg?react'
import Button from '@/components/Button'
import Input from '@/components/form/Input/Input'
import {
  VALIDATION_MESSAGES,
  VALIDATION_PATTERNS,
  VALIDATION_CONSTRAINTS,
  PASSWORD_REQUIREMENT_LABELS,
} from '@/constants/validation'
import { SignUpFormData } from '@/types/auth'
import { validatePassword } from '@/utils/validation'

import PasswordToggleButton from './PasswordToggleButton'

interface SignUpFormProps {
  onSubmit: (data: SignUpFormData, reset: () => void) => void | Promise<void>
  isLoading?: boolean
}

const signUpSchema = Yup.object().shape({
  name: Yup.string()
    .trim()
    .required(VALIDATION_MESSAGES.NAME_REQUIRED)
    .matches(VALIDATION_PATTERNS.NAME_ALLOWED_CHARS, VALIDATION_MESSAGES.NAME_INVALID_CHARS),
  email: Yup.string()
    .email(VALIDATION_MESSAGES.EMAIL_INVALID)
    .required(VALIDATION_MESSAGES.EMAIL_REQUIRED),
  password: Yup.string()
    .min(VALIDATION_CONSTRAINTS.PASSWORD_MIN_LENGTH, VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH)
    .matches(VALIDATION_PATTERNS.PASSWORD_NUMBER, VALIDATION_MESSAGES.PASSWORD_NUMBER)
    .matches(VALIDATION_PATTERNS.PASSWORD_UPPERCASE, VALIDATION_MESSAGES.PASSWORD_UPPERCASE)
    .matches(VALIDATION_PATTERNS.PASSWORD_LOWERCASE, VALIDATION_MESSAGES.PASSWORD_LOWERCASE)
    .required(VALIDATION_MESSAGES.PASSWORD_REQUIRED),
})

const SignUpForm: React.FC<SignUpFormProps> = ({ onSubmit, isLoading = false }) => {
  const [showPassword, setShowPassword] = useState(false)

  const {
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isValid },
  } = useForm<SignUpFormData>({
    resolver: yupResolver(signUpSchema),
    mode: 'onChange',
    defaultValues: {
      name: '',
      email: '',
      password: '',
    },
  })

  const password = watch('password')
  const passwordValidation = useMemo(() => validatePassword(password), [password])

  return (
    <form
      onSubmit={handleSubmit((data) => onSubmit(data, reset))}
      className="flex flex-col gap-6 w-[400px]"
      autoComplete="new-password"
    >
      {/* Name Input */}
      <Controller
        name="name"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            type="text"
            placeholder="Name"
            disabled={isLoading}
            autoComplete="new-password"
            error={errors.name?.message}
            errorClassName="!text-xs !text-error"
            aria-label="Full name"
            aria-required="true"
            aria-invalid={!!errors.name}
          />
        )}
      />

      {/* Email Input */}
      <Controller
        name="email"
        control={control}
        render={({ field }) => (
          <Input
            {...field}
            type="email"
            placeholder="Email"
            disabled={isLoading}
            autoComplete="new-password"
            error={errors.email?.message}
            errorClassName="!text-xs !text-error"
            aria-label="Email address"
            aria-required="true"
            aria-invalid={!!errors.email}
          />
        )}
      />

      {/* Password Input */}
      <div className="relative">
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <Input
              {...field}
              type={showPassword ? 'text' : 'password'}
              placeholder="Password"
              disabled={isLoading}
              autoComplete="new-password"
              error={errors.password?.message}
              errorClassName="!text-xs !text-error"
              aria-label="Password"
              aria-required="true"
              aria-invalid={!!errors.password}
              aria-describedby="password-requirements"
            >
              <PasswordToggleButton
                showPassword={showPassword}
                onToggle={() => setShowPassword(!showPassword)}
                disabled={isLoading}
                className="right-12"
              />

              {/* Info icon */}
              <div
                data-tooltip-id="password-rules-tooltip"
                className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center cursor-help z-10"
                role="button"
                tabIndex={0}
                aria-label="Show password requirements"
              >
                <InfoSvg className="w-4 h-4 text-text-quaternary hover:text-text-primary transition" />
              </div>

              <Tooltip
                id="password-rules-tooltip"
                place="right"
                offset={22}
                openEvents={{ mouseover: true }}
                className="z-[10000] !bg-surface-base-secondary border border-border-structural !text-text-primary !px-4 !py-3 !rounded-lg !opacity-100 !transition-none"
                clickable
                role="tooltip"
              >
                <div className="w-56" id="password-requirements">
                  <p className="text-sm font-medium text-text-primary mb-3">
                    Password must contain:
                  </p>
                  <ul className="space-y-2" role="list">
                    <li className="flex items-center gap-2" role="listitem">
                      {passwordValidation.hasNumber ? (
                        <CheckSvg
                          className="w-4 h-4 text-success-primary flex-shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <CrossSvg
                          className="w-4 h-4 text-failed-secondary flex-shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-sm text-text-quaternary">
                        {PASSWORD_REQUIREMENT_LABELS.NUMBER}
                      </span>
                    </li>
                    <li className="flex items-center gap-2" role="listitem">
                      {passwordValidation.hasUppercase ? (
                        <CheckSvg
                          className="w-4 h-4 text-success-primary flex-shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <CrossSvg
                          className="w-4 h-4 text-failed-secondary flex-shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-sm text-text-quaternary">
                        {PASSWORD_REQUIREMENT_LABELS.UPPERCASE}
                      </span>
                    </li>
                    <li className="flex items-center gap-2" role="listitem">
                      {passwordValidation.hasLowercase ? (
                        <CheckSvg
                          className="w-4 h-4 text-success-primary flex-shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <CrossSvg
                          className="w-4 h-4 text-failed-secondary flex-shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-sm text-text-quaternary">
                        {PASSWORD_REQUIREMENT_LABELS.LOWERCASE}
                      </span>
                    </li>
                    <li className="flex items-center gap-2" role="listitem">
                      {passwordValidation.hasMinLength ? (
                        <CheckSvg
                          className="w-4 h-4 text-success-primary flex-shrink-0"
                          aria-hidden="true"
                        />
                      ) : (
                        <CrossSvg
                          className="w-4 h-4 text-failed-secondary flex-shrink-0"
                          aria-hidden="true"
                        />
                      )}
                      <span className="text-sm text-text-quaternary">
                        {PASSWORD_REQUIREMENT_LABELS.MIN_LENGTH}
                      </span>
                    </li>
                  </ul>
                </div>
              </Tooltip>
            </Input>
          )}
        />
      </div>

      <Button
        buttonType="submit"
        className="w-fit ml-auto"
        isLoading={isLoading}
        disabled={!isValid || isLoading}
        aria-label="Create account"
      >
        Sign Up
      </Button>
    </form>
  )
}

export default SignUpForm
