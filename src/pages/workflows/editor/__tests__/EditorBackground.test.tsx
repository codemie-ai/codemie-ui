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

import { cleanup, render } from '@testing-library/react'
import { ReactFlow, ReactFlowProvider } from '@xyflow/react'
import { afterEach, describe, expect, it } from 'vitest'

import EditorBackground from '../EditorBackground'

const patternIds = (container: HTMLElement) =>
  [...container.querySelectorAll('svg pattern')].map((el) => el.getAttribute('id'))

const DualCanvas = ({ editorId, diffId }: { editorId?: string; diffId?: string }) => (
  <>
    <div style={{ width: 200, height: 200 }}>
      <ReactFlowProvider>
        <ReactFlow id={editorId}>
          <EditorBackground isFullscreen={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
    <div style={{ width: 200, height: 200 }}>
      <ReactFlowProvider>
        <ReactFlow id={diffId}>
          <EditorBackground isFullscreen={false} />
        </ReactFlow>
      </ReactFlowProvider>
    </div>
  </>
)

afterEach(cleanup)

describe('EditorBackground', () => {
  it('shares one SVG pattern id when two canvases omit ReactFlow id', () => {
    const { container } = render(<DualCanvas />)
    const ids = patternIds(container)

    expect(ids.length).toBeGreaterThanOrEqual(2)
    expect(new Set(ids).size).toBe(1)
  })

  it('keeps SVG pattern ids unique when the editor and visual-diff canvases have distinct ReactFlow ids', () => {
    const { container } = render(
      <DualCanvas editorId="workflow-editor" diffId="workflow-visual-diff" />
    )
    const ids = patternIds(container)

    expect(ids).toHaveLength(2)
    expect(ids[0]).not.toBe(ids[1])
    expect(ids.some((id) => id?.includes('workflow-editor'))).toBe(true)
    expect(ids.some((id) => id?.includes('workflow-visual-diff'))).toBe(true)
  })
})
