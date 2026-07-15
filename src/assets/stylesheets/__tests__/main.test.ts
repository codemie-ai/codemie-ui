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
