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

import { Background } from '@xyflow/react'

import gradientLight from '@/assets/images/gradient-light.png'
import gradientDark from '@/assets/images/gradient.png'

interface EditorBackgroundProps {
  isFullscreen: boolean
}

const EditorBackground = ({ isFullscreen }: EditorBackgroundProps) => {
  return (
    <>
      <Background className="!bg-surface-base-primary" />

      {isFullscreen && (
        <>
          <img
            src={gradientDark}
            className="absolute bottom-0 left-[-100px] min-w-[450px] codemieLight:hidden pointer-events-none select-none"
            alt="background-gradient"
          />
          <img
            src={gradientLight}
            className="absolute bottom-0 left-[-100px] min-w-[450px] codemieDark:hidden pointer-events-none select-none"
            alt="background-gradient"
          />
        </>
      )}
    </>
  )
}

export default EditorBackground
