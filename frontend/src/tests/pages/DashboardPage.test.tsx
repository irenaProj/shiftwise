import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, setAuthenticatedUser, clearAuth } from '../utils'
import { DashboardPage } from '../../pages/DashboardPage'
import { useAuthStore } from '../../lib/store'

window.confirm = vi.fn(() => true)

describe('DashboardPage', () => {
  beforeEach(() => {
    clearAuth()
    setAuthenticatedUser('MANAGER')
  })

  it('renders the workspace name in the nav', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByText('Demo Cafe')).toBeInTheDocument()
  })

  it('renders the user name in the nav', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByText('Will Power')).toBeInTheDocument()
  })

  it('loads and displays employees', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Lou Poles')).toBeInTheDocument()
      expect(screen.getByText('Fran Tastic')).toBeInTheDocument()
    })
  })

  it('shows correct total staff count', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      // 3 employees loaded — check stat card shows 3
      expect(screen.getAllByText('3').length).toBeGreaterThan(0)
    })
  })

  it('shows Add member button for managers', () => {
    renderWithProviders(<DashboardPage />)
    expect(screen.getByRole('button', { name: /add member/i })).toBeInTheDocument()
  })

  it('hides Add member button for employees', () => {
    clearAuth()
    setAuthenticatedUser('EMPLOYEE')
    renderWithProviders(<DashboardPage />)
    expect(screen.queryByRole('button', { name: /add member/i })).not.toBeInTheDocument()
  })

  it('opens AddEmployeeModal when Add member is clicked', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DashboardPage />)
    await user.click(screen.getByRole('button', { name: /add member/i }))
    expect(screen.getByText('Add team member')).toBeInTheDocument()
  })

  it('shows delete buttons for other employees', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Lou Poles')).toBeInTheDocument()
    })
    expect(screen.getAllByTitle('Remove member').length).toBeGreaterThan(0)
  })

  it('does not show delete button for self', async () => {
    renderWithProviders(<DashboardPage />)
    await waitFor(() => {
      expect(screen.getByText('Lou Poles')).toBeInTheDocument()
    })
    // Will Power is the logged-in user — find their row via the nav name
    const nameEl = screen.getAllByText('Will Power')
    // The table row name (not the nav span)
    const tableCell = nameEl.find(el => el.tagName === 'P')
    if (tableCell) {
      const row = tableCell.closest('tr')
      expect(within(row!).queryByTitle('Remove member')).not.toBeInTheDocument()
    }
  })

  it('clears auth on logout', async () => {
    const user = userEvent.setup()
    renderWithProviders(<DashboardPage />)
    await user.click(screen.getByRole('button', { name: /sign out/i }))
    await waitFor(() => {
      expect(useAuthStore.getState().user).toBeNull()
    })
  })
})
