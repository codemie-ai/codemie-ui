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

import { describe, it, expect } from 'vitest'

import { compareWorkflowData } from '../compareWorkflowData'

const emptyNew = {
  workflowFields: { name: '', description: '', icon_url: '' },
  yamlConfig: 'states: []',
}

const withYaml = (yamlConfig: string) => ({ ...emptyNew, yamlConfig })

describe('compareWorkflowData — new workflow', () => {
  it('reports no change for an untouched empty workflow', () => {
    expect(compareWorkflowData(emptyNew, emptyNew)).toBeFalsy()
  })

  it.each([
    ['save_validation', 'states: []\nsave_validation: strict\n'],
    ['require_input_contracts', 'states: []\nrequire_input_contracts: true\n'],
  ])('counts a lone %s default as a change', (_key, yamlConfig) => {
    expect(compareWorkflowData(emptyNew, withYaml(yamlConfig))).toBeTruthy()
  })
})

describe('compareWorkflowData — node layout', () => {
  const fields = { name: 'Flow', description: '', icon_url: '', project: 'demo' }
  const metaState = (id: string, x: number, y: number, extra = '') =>
    `  - id: ${id}\n    position:\n      x: ${x}\n      y: ${y}\n${extra}`
  const workflow = (metaStates: string) => ({
    workflowFields: fields,
    yamlConfig: `states:\n  - id: a\n    assistant_id: x\nmeta_states:\n${metaStates}`,
  })

  it('counts a moved node as a change', () => {
    const saved = workflow(metaState('a', 100, 20))
    expect(compareWorkflowData(saved, workflow(metaState('a', 240, 20)))).toBe(true)
  })

  it('ignores selection, measured size and sub-pixel moves', () => {
    const saved = workflow(metaState('a', 100, 20))
    const current = workflow(
      metaState('a', 100.2, 20, '    selected: true\n    measured:\n      width: 256\n')
    )
    expect(compareWorkflowData(saved, current)).toBe(false)
  })

  it('ignores a position the editor adds to a node the baseline had none for', () => {
    const saved = {
      workflowFields: fields,
      yamlConfig: 'states:\n  - id: a\n    assistant_id: x\n',
    }
    expect(compareWorkflowData(saved, workflow(metaState('a', 100, 20)))).toBe(false)
  })
})
