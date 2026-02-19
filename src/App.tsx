import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminDashboard } from './admin/AdminDashboard'
import { AdminLayout } from './admin/AdminLayout'
import { IntegrationsPage } from './admin/IntegrationsPage'
import { LoginPage } from './auth/LoginPage'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { ChatPage } from './components/ChatPage'
import { FeedbackDashboard } from './feedback/FeedbackDashboard'
import { HomePage } from './home/HomePage'
import { AppLayout } from './layout/AppLayout'
import { MetricsPage } from './metrics/MetricsPage'
import { OperationsPage } from './operations/OperationsPage'
import { RoadmapPage } from './roadmap/RoadmapPage'

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="metrics" element={<MetricsPage />} />
        <Route path="operations" element={<OperationsPage />} />
        <Route path="roadmap" element={<RoadmapPage />} />
      </Route>
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
      </Route>
      <Route path="/admin/operations" element={<Navigate replace to="/operations" />} />
      <Route path="/admin/roadmap" element={<Navigate replace to="/roadmap" />} />
      <Route path="/feedback" element={<Navigate replace to="/admin/feedback" />} />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  )
}
