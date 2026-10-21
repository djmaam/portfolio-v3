import { describe, expect, test } from 'bun:test'

import { GET } from '../src/pages/.well-known/security.txt'

const YEAR = 365 * 24 * 60 * 60 * 1000

describe('security.txt', () => {
  test('carries the RFC 9116 required fields, with Expires inside a year', async () => {
    const body = await (await GET({} as never)).text()
    expect(body).toContain('Contact: mailto:hi@marcosarrieta.dev')
    expect(body).toContain('Canonical: https://marcosarrieta.dev/.well-known/security.txt')

    const expires = Date.parse(body.match(/^Expires: (.+)$/m)?.[1] ?? '')
    expect(expires).toBeGreaterThan(Date.now())
    expect(expires - Date.now()).toBeLessThanOrEqual(YEAR)
  })
})
