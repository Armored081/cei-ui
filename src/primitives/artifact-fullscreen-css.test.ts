/// <reference types="node" />

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

function readCss(): string {
  return readFileSync('src/primitives/artifact-fullscreen.css', 'utf8')
}

describe('Artifact fullscreen layout CSS', (): void => {
  it('uses a flex column body so renderer can stretch', (): void => {
    const css = readCss()

    expect(css).toMatch(
      /\.cei-artifact-fullscreen-body\s*{[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/s,
    )
    expect(css).toMatch(
      /\.cei-artifact-fullscreen-renderer\s*{[^}]*flex:\s*1;[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/s,
    )
  })
})
