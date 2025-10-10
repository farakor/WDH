import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider } from './contexts/AuthContext'
import { PrivateRoute } from './components/PrivateRoute'
import LoginPage from './pages/LoginPage'
// import RegisterPage from './pages/RegisterPage' // ВРЕМЕННО: Регистрация отключена
import DashboardPage from './pages/DashboardPage'
import WebsitesPage from './pages/WebsitesPage'
import WebsiteDetailPage from './pages/WebsiteDetailPage'
import DomainsPage from './pages/DomainsPage'
import ProfilePage from './pages/ProfilePage'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          {/* ВРЕМЕННО ЗАБЛОКИРОВАНО: Регистрация отключена */}
          {/* <Route path="/register" element={<RegisterPage />} /> */}
          <Route
            path="/dashboard"
            element={
              <PrivateRoute>
                <DashboardPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/websites"
            element={
              <PrivateRoute>
                <WebsitesPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/websites/:id"
            element={
              <PrivateRoute>
                <WebsiteDetailPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/domains"
            element={
              <PrivateRoute>
                <DomainsPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/profile"
            element={
              <PrivateRoute>
                <ProfilePage />
              </PrivateRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
