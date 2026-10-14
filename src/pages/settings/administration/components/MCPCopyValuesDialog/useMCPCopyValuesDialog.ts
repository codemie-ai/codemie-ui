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

import { useCallback, useEffect, useMemo, useState } from 'react'

import { MCPConfig } from '@/types/entity/mcp'

const SENSITIVE_PATTERN = /token|secret|key|password|credential|auth/i

export function isSensitiveKey(path: string): boolean {
  return SENSITIVE_PATTERN.test(path)
}

function stringifyValue(value: unknown): string {
  if (value === undefined || value === null) return ''
  return typeof value === 'string' ? value : JSON.stringify(value)
}

export function collectCopyValuePaths(
  server: MCPConfig | null
): { section: string; keys: string[] }[] {
  const config = server?.config
  if (!config) return []

  const sections: { section: string; keys: string[] }[] = []

  const headerKeys = Object.keys(config.headers ?? {})
  if (headerKeys.length > 0) {
    sections.push({ section: 'headers', keys: headerKeys.map((key) => `headers.${key}`) })
  }

  const envKeys = Object.keys(config.env ?? {})
  if (envKeys.length > 0) {
    sections.push({ section: 'env', keys: envKeys.map((key) => `env.${key}`) })
  }

  const args = config.args ?? []
  if (args.length > 0) {
    sections.push({ section: 'args', keys: args.map((_, index) => `args[${index}]`) })
  }

  if (config.url) {
    try {
      const parsed = new URL(config.url, 'http://localhost')
      const queryKeys = Array.from(parsed.searchParams.keys())
      if (queryKeys.length > 0) {
        sections.push({ section: 'url', keys: queryKeys.map((key) => `url.query.${key}`) })
      }
    } catch {
      // Not a parseable URL - emit nothing for this section
    }
  }

  return sections
}

/**
 * Builds a dotted-path -> original value lookup, mirroring the same paths
 * collectCopyValuePaths produces. Used so the sensitive-value hint can be
 * evaluated against the actual value (e.g. a secret passed via args), not
 * just the key/path string, which alone can never match for args entries.
 */
function collectValueByPath(server: MCPConfig | null): Record<string, unknown> {
  const config = server?.config
  const map: Record<string, unknown> = {}
  if (!config) return map

  Object.entries(config.headers ?? {}).forEach(([key, value]) => {
    map[`headers.${key}`] = value
  })

  Object.entries(config.env ?? {}).forEach(([key, value]) => {
    map[`env.${key}`] = value
  })
  ;(config.args ?? []).forEach((value, index) => {
    map[`args[${index}]`] = value
  })

  if (config.url) {
    try {
      const parsed = new URL(config.url, 'http://localhost')
      parsed.searchParams.forEach((value, key) => {
        map[`url.query.${key}`] = value
      })
    } catch {
      // Not a parseable URL - no values to map for this section
    }
  }

  return map
}

export function useMCPCopyValuesDialog(server: MCPConfig | null) {
  const [checked, setChecked] = useState<Set<string>>(new Set())

  const sections = useMemo(() => collectCopyValuePaths(server), [server])
  const valueByPath = useMemo(() => collectValueByPath(server), [server])

  const isSensitivePath = useCallback(
    (path: string) => isSensitiveKey(path) || isSensitiveKey(stringifyValue(valueByPath[path])),
    [valueByPath]
  )

  useEffect(() => {
    setChecked(new Set())
  }, [server?.id])

  const toggleKey = useCallback((path: string) => {
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(path)) next.delete(path)
      else next.add(path)
      return next
    })
  }, [])

  const toggleSection = useCallback((_section: string, keys: string[]) => {
    setChecked((prev) => {
      const allChecked = keys.length > 0 && keys.every((key) => prev.has(key))
      const next = new Set(prev)
      if (allChecked) {
        keys.forEach((key) => next.delete(key))
      } else {
        keys.forEach((key) => next.add(key))
      }
      return next
    })
  }, [])

  const reset = useCallback(() => {
    setChecked(new Set())
  }, [])

  return {
    sections,
    checked,
    toggleKey,
    toggleSection,
    reset,
    isSensitivePath,
  }
}
