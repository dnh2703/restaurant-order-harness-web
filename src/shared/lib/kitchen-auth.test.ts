import { describe, it, expect } from 'vitest'
import { isRedirect } from '@tanstack/react-router'
import { isUnauthenticatedError, withKitchenAuth } from './kitchen-auth'

describe('isUnauthenticatedError', () => {
  it('matches the Unauthenticated error by message (incl. serialized form)', () => {
    expect(isUnauthenticatedError(new Error('Unauthenticated'))).toBe(true)
    const named = new Error('something else')
    named.name = 'Unauthenticated'
    expect(isUnauthenticatedError(named)).toBe(true)
  })

  it('does not match unrelated errors or non-errors', () => {
    expect(isUnauthenticatedError(new Error('boom'))).toBe(false)
    expect(isUnauthenticatedError('Unauthenticated')).toBe(false)
    expect(isUnauthenticatedError(null)).toBe(false)
  })
})

describe('withKitchenAuth', () => {
  it('passes through the resolved value', async () => {
    await expect(withKitchenAuth(async () => 42)).resolves.toBe(42)
  })

  it('redirects to /kitchen/login when the loader throws Unauthenticated', async () => {
    const err = await withKitchenAuth(async () => {
      throw new Error('Unauthenticated')
    }).catch((e: unknown) => e)
    expect(isRedirect(err)).toBe(true)
    expect((err as { options: { to: string } }).options.to).toBe('/kitchen/login')
  })

  it('rethrows unrelated errors unchanged', async () => {
    const boom = new Error('boom')
    await expect(
      withKitchenAuth(async () => {
        throw boom
      }),
    ).rejects.toBe(boom)
  })
})
