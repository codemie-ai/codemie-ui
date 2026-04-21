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

import { Separator } from 'react-resizable-panels'

interface ResizableSeparatorProps {
  orientation: 'horizontal' | 'vertical'
  className?: string
}

const ResizableSeparator = ({ orientation, className = '' }: ResizableSeparatorProps) => {
  const baseClasses =
    'bg-black/20 transition-all duration-200 ease-in-out z-[1] box-border bg-clip-padding !outline-none'

  const orientationClasses =
    orientation === 'vertical'
      ? 'h-[7px] my-[-5px] border-t-[5px] border-b-[5px] border-transparent bg-transparent !cursor-[ns-resize] hover:border-t-[5px] hover:border-b-[5px] hover:bg-black/20 hover:border-black/20'
      : 'w-[7px] mx-[-5px] border-l-[5px] border-r-[5px] border-transparent my-4 rounded-lg bg-transparent !cursor-[ew-resize] hover:border-l-[5px] hover:border-r-[5px] hover:bg-black/20 hover:border-black/20'

  return <Separator className={`${baseClasses} ${orientationClasses} ${className}`} />
}

export default ResizableSeparator
