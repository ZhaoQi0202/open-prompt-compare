import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuthStore } from './stores/authStore'
import AppLayout from './components/AppLayout'
import LoginPage from './pages/LoginPage'
import ProjectListPage from './pages/ProjectListPage'
import ProjectOverviewPage from './pages/ProjectOverviewPage'
import PromptEditorPage from './pages/PromptEditorPage'
import TestSuiteManagePage from './pages/TestSuiteManagePage'
import ModelConfigPage from './pages/ModelConfigPage'
import NewRunPage from './pages/NewRunPage'
import RunProgressPage from './pages/RunProgressPage'
import RunComparePage from './pages/RunComparePage'
import RunHistoryPage from './pages/RunHistoryPage'
import AdminUsersPage from './pages/AdminUsersPage'
import { useEffect } from 'react'

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const checkAuth = useAuthStore((s) => s.checkAuth)
  useEffect(() => {
    checkAuth()
  }, [checkAuth])
  return <>{children}</>
}

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<PrivateRoute><AppLayout /></PrivateRoute>}>
          <Route index element={<Navigate to="/projects" replace />} />
          <Route path="projects" element={<ProjectListPage />} />
          <Route path="projects/:projectId" element={<ProjectOverviewPage />} />
          <Route path="projects/:projectId/prompts/:promptId" element={<PromptEditorPage />} />
          <Route path="projects/:projectId/test-suites" element={<TestSuiteManagePage />} />
          <Route path="projects/:projectId/new-run" element={<NewRunPage />} />
          <Route path="projects/:projectId/runs" element={<RunHistoryPage />} />
          <Route path="projects/:projectId/runs/:runId" element={<RunProgressPage />} />
          <Route path="projects/:projectId/runs/:runId/compare" element={<RunComparePage />} />
          <Route path="model-configs" element={<ModelConfigPage />} />
          <Route path="admin/users" element={<AdminUsersPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
