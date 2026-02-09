import { fetchAuthSession } from 'aws-amplify/auth'

/**
 * Resolves the current Cognito access token from the active Amplify auth session.
 */
export async function getAuthAccessToken(): Promise<string> {
  const session = await fetchAuthSession()
  const accessToken = session.tokens?.accessToken?.toString() || ''

  if (!accessToken) {
    throw new Error('No access token found. Please sign in again.')
  }

  return accessToken
}
