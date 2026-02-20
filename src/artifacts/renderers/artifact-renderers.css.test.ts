/// <reference types="node" />

import { readFileSync } from 'node:fs'

import { describe, expect, it } from 'vitest'

function readCss(): string {
  return readFileSync('src/artifacts/renderers/artifact-renderers.css', 'utf8')
}

describe('Chart artifact layout CSS', (): void => {
  it('defines a flex height chain for expanded chart content', (): void => {
    const css = readCss()

    expect(css).toMatch(
      /\.cei-artifact-expanded-content-chart\s*{[^}]*flex:\s*1;[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/s,
    )
    expect(css).toMatch(
      /\.cei-artifact-expanded-chart\s*{[^}]*flex:\s*1;[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/s,
    )
    expect(css).toMatch(
      /\.cei-artifact-expanded-content-chart\s+\.cei-block\s*{[^}]*flex:\s*1;[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/s,
    )
    expect(css).toMatch(
      /\.cei-artifact-expanded-content-chart\s+\.cei-chart-wrapper\s*{[^}]*flex:\s*1;[^}]*min-height:\s*280px;[^}]*height:\s*auto\s*!important;/s,
    )
  })

  it('defines a flex height chain for fullscreen chart content', (): void => {
    const css = readCss()

    expect(css).toMatch(
      /\.cei-artifact-fullscreen-content-chart\s*{[^}]*flex:\s*1;[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/s,
    )
    expect(css).toMatch(
      /\.cei-artifact-fullscreen-content-chart\s+\.cei-block\s*{[^}]*flex:\s*1;[^}]*display:\s*flex;[^}]*flex-direction:\s*column;/s,
    )
    expect(css).toMatch(
      /\.cei-artifact-fullscreen-content-chart\s+\.cei-chart-wrapper\s*{[^}]*flex:\s*1;[^}]*min-height:\s*320px;[^}]*height:\s*auto\s*!important;/s,
    )
    expect(css).toMatch(
      /\.cei-artifact-fullscreen-content-chart\s+\.cei-artifact-chart-table\s*{[^}]*max-height:\s*200px;[^}]*overflow-y:\s*auto;/s,
    )
  })
})
