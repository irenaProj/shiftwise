import { ReactNode } from 'react'
import { render, RenderOptions } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { useAuthStore } from '../lib/store'
import { fakeUser, fakeWorkspace } from './msw/handlers'

// Create a fresh QueryClient for each test to avoid cache bleed
export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })
}

interface WrapperProps {
  children: ReactNode
  initialRoute?: string
}

// Full provider wrapper for component tests
export function TestWrapper({ children, initialRoute = '/' }: WrapperProps) {
  const qc = createTestQueryClient()
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={[initialRoute]}>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  )
}

// Custom render with providers
export function renderWithProviders(
  ui: React.ReactElement,
  options?: RenderOptions & { initialRoute?: string }
) {
  const { initialRoute, ...rest } = options ?? {}
  const qc = createTestQueryClient()
  return render(ui, {
    wrapper: ({ children }) => (
      <QueryClientProvider client={qc}>
        <MemoryRouter initialEntries={[initialRoute ?? '/']}>
          {children}
        </MemoryRouter>
      </QueryClientProvider>
    ),
    ...rest,
  })
}

// Helper to set authenticated state in Zustand store
export function setAuthenticatedUser(role: 'OWNER' | 'MANAGER' | 'EMPLOYEE' = 'MANAGER') {
  useAuthStore.setState({
    accessToken: 'fake-access-token',
    user: fakeUser,
    workspace: { ...fakeWorkspace, role },
  })
}

// Helper to clear auth state
export function clearAuth() {
  useAuthStore.setState({
    accessToken: null,
    user: null,
    workspace: null,
  })
}
