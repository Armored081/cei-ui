import { Navigate, Route, Routes } from 'react-router-dom'

import { LoginPage } from './auth/LoginPage'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { AssessmentDetailPage } from './components/AssessmentDetailPage'
import { AssessmentListPage } from './components/AssessmentListPage'
import { ChatPage } from './components/ChatPage'

function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assessments"
        element={
          <ProtectedRoute>
            <AssessmentListPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assessments/:id"
        element={
          <ProtectedRoute>
            <AssessmentDetailPage />
          </ProtectedRoute>
        }
      />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}

export default App
