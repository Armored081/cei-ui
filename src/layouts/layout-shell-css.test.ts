/// <reference types="node" />

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

function readCss(path: string): string {
  return readFileSync(path, 'utf8')
}

describe('Layout shell grid tracks', (): void => {
  it('pins Command Center main grid to the flexible row', (): void => {
    const css = readCss('src/layouts/layout-command-center.css')
    expect(css).toMatch(/\.cei-cc-grid\s*{[^}]*grid-row:\s*4;/s)
  })

  it('pins Focus main pane to the flexible row', (): void => {
    const css = readCss('src/layouts/layout-focus.css')
    expect(css).toMatch(/\.cei-focus-main\s*{[^}]*grid-row:\s*4;/s)
  })
})
