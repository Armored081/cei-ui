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

  it('constrains shell to viewport width with overflow hidden', (): void => {
    const css = readCss('src/layouts/layout-command-center.css')
    expect(css).toMatch(/\.cei-cc-shell\s*{[^}]*max-width:\s*100vw;/s)
    expect(css).toMatch(/\.cei-cc-shell\s*{[^}]*overflow:\s*hidden;/s)
  })

  it('uses dynamic viewport height for mobile support', (): void => {
    const css = readCss('src/layouts/layout-command-center.css')
    expect(css).toMatch(/\.cei-cc-shell\s*{[^}]*height:\s*100dvh;/s)
  })

  it('uses minmax(0, 1fr) for center column to prevent overflow', (): void => {
    const css = readCss('src/layouts/layout-command-center.css')
    expect(css).toMatch(/minmax\(0,\s*1fr\)/)
  })

  it('sets min-width: 0 on center column', (): void => {
    const css = readCss('src/layouts/layout-command-center.css')
    expect(css).toMatch(/\.cei-cc-center\s*{[^}]*min-width:\s*0;/s)
  })
})

describe('Message list overflow constraints', (): void => {
  it('hides horizontal overflow on message list', (): void => {
    const css = readCss('src/components/ChatPage.css')
    expect(css).toMatch(/\.cei-message-list\s*{[^}]*overflow-x:\s*hidden;/s)
  })

  it('sets min-width: 0 on message containers', (): void => {
    const css = readCss('src/components/ChatPage.css')
    expect(css).toMatch(/\.cei-message\s*{[^}]*min-width:\s*0;/s)
    expect(css).toMatch(/\.cei-message-bubble\s*{[^}]*min-width:\s*0;/s)
    expect(css).toMatch(/\.cei-message-content\s*{[^}]*min-width:\s*0;/s)
  })

  it('uses overflow-wrap: anywhere on text segments', (): void => {
    const css = readCss('src/components/ChatPage.css')
    expect(css).toMatch(/\.cei-message-text-segment\s*{[^}]*overflow-wrap:\s*anywhere;/s)
  })
})

describe('Tool status bar overflow', (): void => {
  it('constrains tool status bar with overflow hidden', (): void => {
    const css = readCss('src/primitives/message-list.css')
    expect(css).toMatch(/\.cei-ml-tool-status-bar\s*{[^}]*overflow:\s*hidden;/s)
    expect(css).toMatch(/\.cei-ml-tool-status-bar\s*{[^}]*min-width:\s*0;/s)
  })
})
