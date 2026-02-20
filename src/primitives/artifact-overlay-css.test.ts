/// <reference types="node" />

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

function readCss(): string {
  return readFileSync('src/primitives/artifact-overlay.css', 'utf8')
}

describe('Artifact overlay scroll containment', (): void => {
  it('panel has overflow: hidden to prevent outer scrollbar', (): void => {
    const css = readCss()
    expect(css).toMatch(/\.cei-artifact-overlay-panel\s*{[^}]*overflow:\s*hidden;/s)
  })

  it('body has vertical-only scroll with stable gutter', (): void => {
    const css = readCss()
    const bodyBlock = css.match(/\.cei-artifact-overlay-body\s*{([^}]*)}/s)

    expect(bodyBlock).not.toBeNull()
    const body = bodyBlock![1]

    expect(body).toContain('overflow-y: auto')
    expect(body).toContain('overflow-x: hidden')
    expect(body).toContain('scrollbar-gutter: stable')
  })

  it('renderer allows independent horizontal scroll for wide content', (): void => {
    const css = readCss()
    const rendererBlock = css.match(/\.cei-artifact-overlay-renderer\s*{([^}]*)}/s)

    expect(rendererBlock).not.toBeNull()
    const renderer = rendererBlock![1]

    expect(renderer).toContain('overflow-x: auto')
  })

  it('layers panel above backdrop to avoid mobile compositing artifacts', (): void => {
    const css = readCss()
    expect(css).toMatch(/\.cei-artifact-overlay-backdrop\s*{[^}]*z-index:\s*0;/s)
    expect(css).toMatch(/\.cei-artifact-overlay-panel\s*{[^}]*z-index:\s*1;/s)
  })

  it('pins compact overlay to the viewport with explicit height', (): void => {
    const css = readCss()
    expect(css).toMatch(/@media \(max-width: 1024px\)\s*{[^}]*\.cei-artifact-overlay-root/s)
    expect(css).toMatch(
      /@media \(max-width: 1024px\)\s*{[\s\S]*\.cei-artifact-overlay-root\s*{[^}]*height:\s*100dvh;/s,
    )
    expect(css).toMatch(
      /@media \(max-width: 1024px\)\s*{[\s\S]*\.cei-artifact-overlay-panel\s*{[^}]*position:\s*relative;/s,
    )
  })
})
