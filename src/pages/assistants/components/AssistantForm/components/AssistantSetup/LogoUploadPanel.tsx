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

import { useCallback, useState } from 'react'

import { cn } from '@/utils/utils'

import ImageUploadField from './ImageUploadField'
import LogoUrlInputField from './LogoUrlInputField'
import { getFileNameFromUrl, isBackendFileUrl } from './utils/getFileNameFromUrl'

interface LogoUploadPanelProps {
  value: string
  onChange: (value: string) => void
  onBlur: () => void
  error?: string
  className?: string
  isCompactView?: boolean
  name?: string
}

const LogoUploadPanel = ({
  value,
  onChange,
  onBlur,
  error,
  className,
  isCompactView,
  name,
}: LogoUploadPanelProps) => {
  const [isUploadedFile, setIsUploadedFile] = useState(false)

  const handleImageUploadComplete = useCallback(() => {
    setIsUploadedFile(true)
  }, [])

  const handleInputChange = useCallback(
    (inputValue: string) => {
      setIsUploadedFile(false)
      onChange(inputValue)
    },
    [onChange]
  )

  const displayValue =
    (isUploadedFile || isBackendFileUrl(value)) && value ? getFileNameFromUrl(value) : value || ''

  return (
    <div className={cn('flex flex-col pt-5 gap-4', className)}>
      <ImageUploadField
        value={value}
        onChange={(newValue) => {
          onChange(newValue)
          handleImageUploadComplete()
        }}
        error={error}
        isCompactView={isCompactView}
      />
      <LogoUrlInputField
        value={displayValue}
        onChange={handleInputChange}
        onBlur={onBlur}
        error={error}
        name={name}
      />
    </div>
  )
}

export default LogoUploadPanel
