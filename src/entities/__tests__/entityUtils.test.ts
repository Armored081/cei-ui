import { describe, expect, it } from 'vitest'

import { parseEntityNotations, stripEntityNotation } from '../entityUtils.js'

describe('entityUtils', (): void => {
  it('parses a single entity notation', (): void => {
    const text = 'See [[entity:control:AC-2|Account Management]] for details.'
    const entities = parseEntityNotations(text)

    expect(entities).toHaveLength(1)
    expect(entities[0]).toMatchObject({
      type: 'control',
      id: 'AC-2',
      displayName: 'Account Management',
      raw: '[[entity:control:AC-2|Account Management]]',
    })
    expect(entities[0].startIndex).toBe(4)
    expect(entities[0].endIndex).toBe(46)
  })

  it('parses multiple entity notations in one string', (): void => {
    const text =
      'Refs: [[entity:risk:RS-042|Privileged Access Abuse]] and [[entity:framework:NIST-800-53|NIST 800-53]].'
    const entities = parseEntityNotations(text)

    expect(entities).toHaveLength(2)
    expect(entities[0]).toMatchObject({
      type: 'risk',
      id: 'RS-042',
      displayName: 'Privileged Access Abuse',
    })
    expect(entities[1]).toMatchObject({
      type: 'framework',
      id: 'NIST-800-53',
      displayName: 'NIST 800-53',
    })
  })

  it('parses notations with special characters in id and name', (): void => {
    const text =
      'Track [[entity:vulnerability:CVE-2025-1234/sub_1|Auth Bypass (SAML/SOAP) - Tier 1]].'
    const entities = parseEntityNotations(text)

    expect(entities).toHaveLength(1)
    expect(entities[0]).toMatchObject({
      type: 'vulnerability',
      id: 'CVE-2025-1234/sub_1',
      displayName: 'Auth Bypass (SAML/SOAP) - Tier 1',
    })
  })

  it('returns an empty array for an empty string', (): void => {
    expect(parseEntityNotations('')).toEqual([])
  })

  it('returns an empty array when no entities exist', (): void => {
    expect(parseEntityNotations('No structured references here.')).toEqual([])
  })

  it('ignores notations with unsupported entity types', (): void => {
    const text = 'Bad [[entity:not_real:ID-1|Unsupported]] value.'
    expect(parseEntityNotations(text)).toEqual([])
  })

  it('strips notation and keeps display names', (): void => {
    const text = 'Control [[entity:control:AC-2|Account Management]] is required.'
    expect(stripEntityNotation(text)).toBe('Control Account Management is required.')
  })

  it('strips multiple notations', (): void => {
    const text =
      'Use [[entity:policy:POL-12|Password Policy]] and [[entity:standard:STD-1|ISO baseline]].'

    expect(stripEntityNotation(text)).toBe('Use Password Policy and ISO baseline.')
  })

  it('returns original string when no notation exists', (): void => {
    const text = 'Nothing to strip.'
    expect(stripEntityNotation(text)).toBe(text)
  })

  it('returns an empty string unchanged when stripping', (): void => {
    expect(stripEntityNotation('')).toBe('')
  })
})
