import { useLanguage } from './i18n/useLanguage';
import ErrorBoundary from './components/layout/ErrorBoundary'
import AppRoutes from './routes/AppRoutes'
import { AuthProvider } from './contexts/AuthContext'
import SessionGate from './components/auth/SessionGate'

export default function App() {
  useLanguage();
  return (
    <ErrorBoundary>
      <AuthProvider>
        <SessionGate>
          <AppRoutes />
        </SessionGate>
      </AuthProvider>
    </ErrorBoundary>
  )
}
