import { describe, it, expect, beforeEach, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders, clearAuth } from '../utils'
import { LoginPage } from '../../pages/LoginPage'
import { server } from '../setup'
import { fakeUser, fakeWorkspace } from '../msw/handlers'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

describe('LoginPage', () => {
  beforeEach(() => {
    clearAuth()
    mockNavigate.mockClear()
  })

  it('renders the login form', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText('Welcome back')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('you@company.com')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('••••••••')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument()
  })

  it('shows demo credentials', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByText('will.power@demo.com / password123')).toBeInTheDocument()
  })

  it('navigates to dashboard on successful login', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByPlaceholderText('you@company.com'), 'will.power@demo.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
    })
  })

  it('shows error message on invalid credentials', async () => {
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByPlaceholderText('you@company.com'), 'wrong@demo.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'wrongpassword')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      // LoginPage shows server error or fallback message
      expect(screen.getByText(/invalid credentials|login failed/i)).toBeInTheDocument()
    })
  })

  it('shows loading state while submitting', async () => {
    server.use(
      http.post('http://localhost:3001/api/auth/login', async () => {
        await new Promise(r => setTimeout(r, 200))
        return HttpResponse.json({
          accessToken: 'token',
          user: fakeUser,
          workspace: fakeWorkspace,
        })
      })
    )
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByPlaceholderText('you@company.com'), 'will.power@demo.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /signing in/i })).toBeDisabled()
    })
  })

  it('shows generic error when no error message returned', async () => {
    server.use(
      http.post('http://localhost:3001/api/auth/login', () => {
        return HttpResponse.json({}, { status: 500 })
      })
    )
    const user = userEvent.setup()
    renderWithProviders(<LoginPage />)

    await user.type(screen.getByPlaceholderText('you@company.com'), 'will.power@demo.com')
    await user.type(screen.getByPlaceholderText('••••••••'), 'password123')
    await user.click(screen.getByRole('button', { name: /sign in/i }))

    await waitFor(() => {
      expect(screen.getByText('Login failed. Please try again.')).toBeInTheDocument()
    })
  })

  it('has a link to the register page', () => {
    renderWithProviders(<LoginPage />)
    expect(screen.getByRole('link', { name: /create workspace/i })).toBeInTheDocument()
  })
})
