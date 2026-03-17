import { Navigate } from 'react-router-dom'
import { useAuthStore } from '../lib/store'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, workspace } = useAuthStore()
  if (!user || !workspace) return <Navigate to="/login" replace />
  return <>{children}</>
}
