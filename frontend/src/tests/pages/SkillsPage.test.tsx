import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, setAuthenticatedUser, clearAuth } from '../utils'
import { SkillsPage } from '../../pages/SkillsPage'

window.confirm = vi.fn(() => true)

describe('SkillsPage', () => {
  beforeEach(() => {
    clearAuth()
    setAuthenticatedUser('MANAGER')
  })

  it('renders the page heading', () => {
    renderWithProviders(<SkillsPage />, { initialRoute: '/skills' })
    expect(screen.getByRole('heading', { name: 'Skills' })).toBeInTheDocument()
  })

  it('loads and displays workspace skills', async () => {
    renderWithProviders(<SkillsPage />, { initialRoute: '/skills' })
    await waitFor(() => {
      expect(screen.getAllByText('Barista').length).toBeGreaterThan(0)
      expect(screen.getAllByText('Cashier').length).toBeGreaterThan(0)
    })
  })

  it('shows add skill form for managers', async () => {
    renderWithProviders(<SkillsPage />, { initialRoute: '/skills' })
    await waitFor(() => expect(screen.getAllByText('Barista').length).toBeGreaterThan(0))
    expect(screen.getByPlaceholderText('New skill name')).toBeInTheDocument()
  })

  it('hides add skill form for employees', async () => {
    clearAuth()
    setAuthenticatedUser('EMPLOYEE')
    renderWithProviders(<SkillsPage />, { initialRoute: '/skills' })
    await waitFor(() => expect(screen.getAllByText('Barista').length).toBeGreaterThan(0))
    expect(screen.queryByPlaceholderText('New skill name')).not.toBeInTheDocument()
  })

  it('adds a new skill', async () => {
    const user = userEvent.setup()
    renderWithProviders(<SkillsPage />, { initialRoute: '/skills' })
    await waitFor(() => expect(screen.getByPlaceholderText('New skill name')).toBeInTheDocument())
    await user.type(screen.getByPlaceholderText('New skill name'), 'Kitchen Hand')
    await user.click(screen.getByRole('button', { name: /^add$/i }))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('New skill name')).toHaveValue('')
    })
  })

  it('shows assign buttons for unassigned skills (managers)', async () => {
    renderWithProviders(<SkillsPage />, { initialRoute: '/skills' })
    await waitFor(() => {
      expect(screen.getByText('+ Cashier')).toBeInTheDocument()
    })
  })
})
