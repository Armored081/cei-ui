import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminDashboard } from './admin/AdminDashboard'
import { AdminLayout } from './admin/AdminLayout'
import { IntegrationsPage } from './admin/IntegrationsPage'
import { LoginPage } from './auth/LoginPage'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { ChatPage } from './components/ChatPage'
import { FeedbackDashboard } from './feedback/FeedbackDashboard'
import { HomePage } from './home/HomePage'
import { RoadmapPage } from './roadmap/RoadmapPage'

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <HomePage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/chat"
        element={
          <ProtectedRoute>
            <ChatPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<AdminDashboard />} />
        <Route path="integrations" element={<IntegrationsPage />} />
        <Route path="feedback" element={<FeedbackDashboard />} />
        <Route path="roadmap" element={<RoadmapPage />} />
      </Route>
      <Route path="/roadmap" element={<Navigate replace to="/admin/roadmap" />} />
      <Route path="/feedback" element={<Navigate replace to="/admin/feedback" />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}
