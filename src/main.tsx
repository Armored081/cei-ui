import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'

import App from './App'
import { AuthProvider } from './auth/AuthProvider'
import { configureAmplifyAuth } from './auth/authConfig'
import './theme/tokens.css'
import './index.css'

// Configure Amplify synchronously before any React rendering
configureAmplifyAuth()

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
)
