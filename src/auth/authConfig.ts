import { Amplify } from '@aws-amplify/core'

let hasConfiguredAmplify = false

export function configureAmplifyAuth(): boolean {
  if (hasConfiguredAmplify) {
    return true
  }

  const userPoolId = import.meta.env.VITE_COGNITO_USER_POOL_ID || ''
  const userPoolClientId = import.meta.env.VITE_COGNITO_CLIENT_ID || ''
  const region = import.meta.env.VITE_COGNITO_REGION || ''

  if (!userPoolId || !userPoolClientId || !region) {
    return false
  }

  Amplify.configure({
    Auth: {
      Cognito: {
        userPoolId,
        userPoolClientId,
        loginWith: {
          email: true,
        },
      },
    },
  })

  hasConfiguredAmplify = true
  return true
}
