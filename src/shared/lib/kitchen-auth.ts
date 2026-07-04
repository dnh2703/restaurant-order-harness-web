import { redirect } from '@tanstack/react-router'

const UNAUTHENTICATED = 'Unauthenticated'

/**
 * True for the `Unauthenticated` error thrown by the staff auth layer. Matches both the
 * server-side class and its serialized form (a plain Error that survives the server-fn
 * boundary keeping only `name`/`message`).
 */
export function isUnauthenticatedError(err: unknown): boolean {
  return err instanceof Error && (err.name === UNAUTHENTICATED || err.message === UNAUTHENTICATED)
}

/**
 * Run a protected kitchen loader body. When the staff session cannot be established
 * (refresh token expired/revoked), send the user to the login screen instead of letting
 * the router surface its generic "Something went wrong!" error boundary.
 */
export async function withKitchenAuth<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (err) {
    if (isUnauthenticatedError(err)) {
      throw redirect({ to: '/kitchen/login' })
    }
    throw err
  }
}
