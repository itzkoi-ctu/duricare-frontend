import ErrorBoundary from './components/layout/ErrorBoundary'
import AppRoutes from './routes/AppRoutes'
import { OverviewProvider } from './context/OverviewContext'

export default function App() {
  return (
    <ErrorBoundary>
      <OverviewProvider>
        <AppRoutes />
      </OverviewProvider>
    </ErrorBoundary>
  )
}
