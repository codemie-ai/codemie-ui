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

import { ReactNode } from 'react'

import AIFieldSvg from '@/assets/icons/ai-field.svg?react'
import { cn } from '@/utils/utils'

interface FormSectionProps {
  title?: string
  description?: string
  className?: string
  children?: ReactNode
  isAIGenerated?: boolean
}

const FormSection = ({
  title,
  description,
  className,
  children,
  isAIGenerated,
}: FormSectionProps) => {
  return (
    <div className="flex flex-col">
      {title && (
        <div className="flex items-center gap-2 mb-1">
          <h4 className="font-semibold">{title}</h4>
          {isAIGenerated && <AIFieldSvg className="w-4 h-4" />}
        </div>
      )}
      {description && <p className="text-xs text-text-quaternary mt-1">{description}</p>}
      <div className={cn('mt-4 flex flex-col gap-y-6', className)}>{children}</div>
    </div>
  )
}

export default FormSection
