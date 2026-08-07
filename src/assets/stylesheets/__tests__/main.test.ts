import { readFileSync } from 'fs'
import { resolve } from 'path'
import { describe, it, expect, beforeAll } from 'vitest'

describe('main.scss @font-face declarations', () => {
  let mainScssContent: string

  beforeAll(() => {
    const mainScssPath = resolve(__dirname, '../main.scss')
    mainScssContent = readFileSync(mainScssPath, 'utf-8')
  })

  it('declares Geist font-face', () => {
    expect(mainScssContent).toContain('font-family: "Geist"')
  })

  it('declares GeistMono font-face', () => {
    expect(mainScssContent).toContain('font-family: "GeistMono"')
  })

  it('declares JetBrains Mono font-face', () => {
    expect(mainScssContent).toContain('font-family: "JetBrains Mono"')
  })

  it('declares IBM Plex Mono font-face', () => {
    expect(mainScssContent).toContain('font-family: "IBM Plex Mono"')
  })

  it('JetBrains Mono has font-display swap', () => {
    const jetbrainsBlock = mainScssContent.match(/@font-face\s*{[^}]*"JetBrains Mono"[^}]*}/s)
    expect(jetbrainsBlock?.[0]).toContain('font-display: swap')
  })

  it('IBM Plex Mono has font-display swap', () => {
    const ibmBlock = mainScssContent.match(/@font-face\s*{[^}]*"IBM Plex Mono"[^}]*}/s)
    expect(ibmBlock?.[0]).toContain('font-display: swap')
  })
})

describe('main.scss --font-family-body-sans custom property', () => {
  let mainScssContent: string

  beforeAll(() => {
    const mainScssPath = resolve(__dirname, '../main.scss')
    mainScssContent = readFileSync(mainScssPath, 'utf-8')
  })

  it('defines --font-family-body-sans on :root', () => {
    const rootBlock = mainScssContent.match(/:root\s*{[^}]*}/s)
    expect(rootBlock?.[0]).toContain('--font-family-body-sans')
  })

  it('derives from --font-family-body-prose, falling back to sans-serif Geist (not GeistMono)', () => {
    const decl = mainScssContent.match(/--font-family-body-sans:\s*[^;]+;/)
    expect(decl).not.toBeNull()
    expect(decl?.[0]).toContain('var(--font-family-body-prose')
    expect(decl?.[0]).toContain('Geist')
    expect(decl?.[0]).not.toContain('GeistMono')
  })
})
