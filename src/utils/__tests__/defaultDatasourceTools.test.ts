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

import {
  isDefaultToolName,
  isDefaultToolActive,
  findExclusivePairTool,
  getBulkSelectableTools,
} from '../defaultDatasourceTools'

describe('isDefaultToolName', () => {
  it('is true only for the three deselectable tool ids', () => {
    expect(isDefaultToolName('get_repository_file_tree')).toBe(true)
    expect(isDefaultToolName('search_code_repo')).toBe(true)
    expect(isDefaultToolName('search_kb')).toBe(true)
    expect(isDefaultToolName('get_repository_file_tree_v2')).toBe(false)
  })
})

describe('isDefaultToolActive', () => {
  it('is true when the tool is not in the deselected list', () => {
    expect(isDefaultToolActive('search_kb', [])).toBe(true)
  })

  it('is false when the tool is in disabled_context_tools', () => {
    expect(isDefaultToolActive('get_repository_file_tree', ['get_repository_file_tree'])).toBe(
      false
    )
  })

  it('treats an undefined deselected list the same as an empty one (legacy assistants)', () => {
    expect(isDefaultToolActive('search_code_repo', undefined)).toBe(true)
  })
})

describe('findExclusivePairTool', () => {
  const makeTool = (name: string, label: string) => ({
    name,
    label,
    settings_config: false,
    tool: null,
  })
  const makeToolkit = (tools: unknown[]) => ({
    toolkit: 'codebase',
    label: 'Codebase Tools',
    tools,
    settings_config: false,
    is_external: false,
  })

  // Names and labels as returned by the backend (tools_vars.py), including "(Experimental)".
  const pairs = [
    {
      standard: makeTool('get_repository_file_tree', 'Get Repo Tree'),
      filtering: makeTool(
        'get_repository_file_tree_v2',
        'Get Repo Tree with filtering (Experimental)'
      ),
    },
    {
      standard: makeTool('search_code_repo', 'Search Code'),
      filtering: makeTool('search_code_repo_v2', 'Search Code with filtering (Experimental)'),
    },
  ]
  const unrelated = makeTool('search_jira', 'Search Jira')
  const toolkit = makeToolkit([...pairs.flatMap((p) => [p.standard, p.filtering]), unrelated])

  pairs.forEach(({ standard, filtering }) => {
    it(`pairs ${standard.name} with its filtering variant`, () => {
      expect(findExclusivePairTool(toolkit as any, standard as any)).toBe(filtering)
    })

    it(`pairs ${filtering.name} with its standard tool`, () => {
      expect(findExclusivePairTool(toolkit as any, filtering as any)).toBe(standard)
    })
  })

  it('returns undefined for a tool with no default-tool pair', () => {
    expect(findExclusivePairTool(toolkit as any, unrelated as any)).toBeUndefined()
  })

  it('returns undefined for search_kb, which has no filtering variant', () => {
    const kb = makeTool('search_kb', 'Search Knowledge Base')
    expect(findExclusivePairTool(makeToolkit([kb]) as any, kb as any)).toBeUndefined()
  })

  it('returns undefined when the partner is absent from the toolkit', () => {
    const [{ standard }] = pairs
    expect(findExclusivePairTool(makeToolkit([standard]) as any, standard as any)).toBeUndefined()
  })

  it('is unaffected by label wording changes', () => {
    const [{ standard, filtering }] = pairs
    const renamed = { ...standard, label: 'Get Repo Tree (renamed)' }
    expect(findExclusivePairTool(makeToolkit([renamed, filtering]) as any, renamed as any)).toBe(
      filtering
    )
  })
})

describe('getBulkSelectableTools', () => {
  const tools = [
    { name: 'get_repository_file_tree', label: 'Get Repo Tree' },
    { name: 'get_repository_file_tree_v2', label: 'Get Repo Tree with filtering (Experimental)' },
    { name: 'search_kb', label: 'Search Knowledge Base' },
    { name: 'read_files', label: 'Read Files' },
  ]
  const toolkit = { toolkit: 'codebase', label: 'c', tools } as any
  const names = () => getBulkSelectableTools(toolkit).map((t) => t.name)

  it('includes default tools whether or not a datasource is attached', () => {
    expect(names()).toEqual(['get_repository_file_tree', 'search_kb', 'read_files'])
  })

  it('drops the filtering variant in favour of its standard default', () => {
    expect(names()).not.toContain('get_repository_file_tree_v2')
  })
})
