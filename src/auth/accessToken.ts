import { fetchAuthSession } from 'aws-amplify/auth'

/**
 * Resolves the current auth token from the active Amplify auth session.
 *
 * When VITE_USE_DIRECT_AGENTCORE is enabled, returns the Cognito ID token
 * (which carries the `aud` claim required by AgentCore CustomJWT auth).
 * Otherwise returns the access token for Lambda proxy auth.
 */
export async function getAuthAccessToken(): Promise<string> {
  const session = await fetchAuthSession()

  if (import.meta.env.VITE_USE_DIRECT_AGENTCORE === 'true') {
    const idToken = session.tokens?.idToken?.toString() || ''

    if (!idToken) {
      throw new Error('No ID token found. Please sign in again.')
    }

    return idToken
  }

  const accessToken = session.tokens?.accessToken?.toString() || ''

  if (!accessToken) {
    throw new Error('No access token found. Please sign in again.')
  }

  return accessToken
}
