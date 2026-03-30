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

import { cn } from '@/utils/utils'

interface ImageLoaderProps {
  className?: string
}

const ImageLoader = ({ className = '' }: ImageLoaderProps) => (
  <div
    className={cn(
      'relative w-16 h-16 rounded-full border border-border-primary bg-input-fill overflow-hidden',
      className
    )}
  >
    {/* Dark Overlay */}
    <div className="absolute inset-0 bg-surface-base-primary/80 flex items-center justify-center">
      {/* Spinner */}
      <div className="animate-spin rounded-full h-6 w-6 border-2 border-text-inverse border-t-transparent" />
    </div>
  </div>
)

export default ImageLoader
