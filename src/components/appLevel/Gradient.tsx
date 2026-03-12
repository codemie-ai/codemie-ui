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

import { FC } from 'react'

import GradientDark from '@/assets/images/gradient-light.png'
import GradientLight from '@/assets/images/gradient.png'
import { getSidebarMaxWidthClass } from '@/utils/helpers'
import { cn } from '@/utils/utils'

const Gradient: FC = () => {
  return (
    <div
      className={cn(
        'absolute bottom-0 left-0 pointer-events-none transition-all duration-150 select-none',
        getSidebarMaxWidthClass()
      )}
    >
      <img
        src={GradientLight}
        className="min-w-[450px] codemieLight:hidden"
        alt="background-gradient"
      />
      <img
        src={GradientDark}
        className="min-w-[600px] codemieDark:hidden"
        alt="background-gradient"
      />
    </div>
  )
}

export default Gradient
