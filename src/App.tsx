import { Navigate, Route, Routes } from 'react-router-dom'

import { AdminDashboard } from './admin/AdminDashboard'
import { AdminLayout } from './admin/AdminLayout'
import { ComposerConfigPage } from './admin/ComposerConfigPage'
import { IntegrationsPage } from './admin/IntegrationsPage'
import { LoginPage } from './auth/LoginPage'
import { ProtectedRoute } from './auth/ProtectedRoute'
import { FeedbackDashboard } from './feedback/FeedbackDashboard'
import { HomePage } from './home/HomePage'
import { MetricsPage } from './metrics/MetricsPage'
import { OperationsPage } from './operations/OperationsPage'
import { RoadmapPage } from './roadmap/RoadmapPage'
import { AppShell } from './shell/AppShell'
import { CommandCenter } from './shell/CommandCenter'

export function App(): JSX.Element {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="chat" element={<CommandCenter />} />
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
        <Route path="composer-config" element={<ComposerConfigPage />} />
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
