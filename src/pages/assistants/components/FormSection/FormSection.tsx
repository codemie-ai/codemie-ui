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

export interface FormSectionProps {
  title?: string
  description?: string
  isMainSection?: boolean
  isChatConfig?: boolean
  actions?: React.ReactNode
  children?: React.ReactNode
}

const FormSection: React.FC<FormSectionProps> = ({
  title,
  description,
  isMainSection = false,
  isChatConfig = false,
  actions,
  children,
}) => {
  return (
    <div className="flex flex-col z-20">
      <div
        className={`flex items-center justify-between mb-1 ${
          isChatConfig ? 'sticky top-0 bg-surface-base-sidebar/80 z-30 pb-2 pt-4' : ''
        }`}
      >
        {title && <h4 className="font-semibold">{title}</h4>}
        <div className="flex items-center gap-2">{actions}</div>
        {isChatConfig && (
          <div className="absolute inset-x-0 bottom-0 h-4 bg-gradient-to-t from-sidebar to-transparent pointer-events-none"></div>
        )}
      </div>

      {description && (
        <p
          className={`text-xs text-text-quaternary mt-1 ${isChatConfig ? 'mb-3' : ''} ${
            isMainSection ? '!text-sm' : ''
          }`}
        >
          {description}
        </p>
      )}

      <div className="mt-4 flex flex-col gap-y-6">{children}</div>
    </div>
  )
}

export default FormSection
