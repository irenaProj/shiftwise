import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/react'
import { Route, Routes } from 'react-router-dom'
import { renderWithProviders, setAuthenticatedUser, clearAuth } from '../utils'
import { ProtectedRoute } from '../../components/ProtectedRoute'

function Dashboard() {
  return <div>Dashboard content</div>
}

function renderProtectedRoute(initialRoute = '/dashboard') {
  return renderWithProviders(
    <Routes>
      <Route path="/login" element={<div>Login page</div>} />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        }
      />
    </Routes>,
    { initialRoute }
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => clearAuth())

  it('redirects unauthenticated users to /login', () => {
    renderProtectedRoute()
    expect(screen.getByText('Login page')).toBeInTheDocument()
    expect(screen.queryByText('Dashboard content')).not.toBeInTheDocument()
  })

  it('renders children for authenticated users', () => {
    setAuthenticatedUser()
    renderProtectedRoute()
    expect(screen.getByText('Dashboard content')).toBeInTheDocument()
    expect(screen.queryByText('Login page')).not.toBeInTheDocument()
  })

  it('redirects when user is set but workspace is null', () => {
    useAuthStore.setState({ accessToken: 'token', user: { id: 'u1', email: 'test@demo.com', name: 'Test' }, workspace: null })
    renderProtectedRoute()
    expect(screen.getByText('Login page')).toBeInTheDocument()
  })
})

// Need to import useAuthStore for the last test
import { useAuthStore } from '../../lib/store'
