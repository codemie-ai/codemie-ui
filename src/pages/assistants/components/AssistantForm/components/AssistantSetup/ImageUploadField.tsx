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

import ImageUpload from '@/components/form/ImageUpload'

interface ImageUploadFieldProps {
  value: string
  onChange: (value: string) => void
  error?: string
  isCompactView?: boolean
}

const ImageUploadField = ({ value, onChange, error, isCompactView }: ImageUploadFieldProps) => (
  <ImageUpload
    value={value}
    onChange={onChange}
    error={error}
    maxSizeMB={0.5}
    rootClass={isCompactView ? 'items-center' : 'items-start'}
    isCompactView={isCompactView}
  />
)

export default ImageUploadField
