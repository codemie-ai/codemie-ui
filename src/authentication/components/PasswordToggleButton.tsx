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

import React from 'react'

import EyeOffSvg from '@/assets/icons/eye-off.svg?react'
import EyeSvg from '@/assets/icons/eye.svg?react'
import { cn } from '@/utils/utils'

interface PasswordToggleButtonProps {
  showPassword: boolean
  onToggle: () => void
  disabled?: boolean
  className?: string
}

const PasswordToggleButton: React.FC<PasswordToggleButtonProps> = ({
  showPassword,
  onToggle,
  disabled = false,
  className,
}) => {
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(
        'absolute top-1/2 -translate-y-1/2 text-text-quaternary hover:text-text-primary transition z-10',
        className
      )}
      disabled={disabled}
      aria-label={showPassword ? 'Hide password' : 'Show password'}
      aria-pressed={showPassword}
    >
      {showPassword ? <EyeSvg className="w-4 h-4" /> : <EyeOffSvg className="w-4 h-4" />}
    </button>
  )
}

export default PasswordToggleButton
