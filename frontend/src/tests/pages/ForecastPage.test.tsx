import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, setAuthenticatedUser, clearAuth } from '../utils'
import { ForecastPage } from '../../pages/ForecastPage'

window.confirm = vi.fn(() => true)

describe('ForecastPage', () => {
  beforeEach(() => {
    clearAuth()
    setAuthenticatedUser('MANAGER')
  })

  it('renders the page heading', () => {
    renderWithProviders(<ForecastPage />, { initialRoute: '/forecast' })
    expect(screen.getByRole('heading', { name: 'Forecast' })).toBeInTheDocument()
  })

  it('loads and displays forecast time rows', async () => {
    renderWithProviders(<ForecastPage />, { initialRoute: '/forecast' })
    await waitFor(() => {
      expect(screen.getByText('09:00')).toBeInTheDocument()
      expect(screen.getByText('12:00')).toBeInTheDocument()
    })
  })

  it('displays required counts as badges', async () => {
    renderWithProviders(<ForecastPage />, { initialRoute: '/forecast' })
    await waitFor(() => {
      expect(screen.getAllByText('3').length).toBeGreaterThan(0)
      expect(screen.getAllByText('2').length).toBeGreaterThan(0)
    })
  })

  it('shows the colour legend', async () => {
    renderWithProviders(<ForecastPage />, { initialRoute: '/forecast' })
    await waitFor(() => {
      expect(screen.getAllByText('09:00').length).toBeGreaterThan(0)
      expect(screen.getByText((_, el) => el?.textContent?.trim() === '4+')).toBeInTheDocument()
    })
  })

  it('shows the Set demand form for managers', async () => {
    renderWithProviders(<ForecastPage />, { initialRoute: '/forecast' })
    await waitFor(() => expect(screen.getByText('Set demand')).toBeInTheDocument())
    expect(screen.getByRole('button', { name: /save slot/i })).toBeInTheDocument()
  })

  it('hides the Set demand form for employees', async () => {
    clearAuth()
    setAuthenticatedUser('EMPLOYEE')
    renderWithProviders(<ForecastPage />, { initialRoute: '/forecast' })
    await waitFor(() => expect(screen.getByText('09:00')).toBeInTheDocument())
    expect(screen.queryByText('Set demand')).not.toBeInTheDocument()
  })

  it('shows delete buttons for managers', async () => {
    renderWithProviders(<ForecastPage />, { initialRoute: '/forecast' })
    await waitFor(() => {
      expect(screen.getAllByTitle('Remove slot').length).toBeGreaterThan(0)
    })
  })

  it('hides delete buttons for employees', async () => {
    clearAuth()
    setAuthenticatedUser('EMPLOYEE')
    renderWithProviders(<ForecastPage />, { initialRoute: '/forecast' })
    await waitFor(() => expect(screen.getByText('09:00')).toBeInTheDocument())
    expect(screen.queryByTitle('Remove slot')).not.toBeInTheDocument()
  })

  it('submits the upsert form', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ForecastPage />, { initialRoute: '/forecast' })
    await waitFor(() => expect(screen.getByRole('button', { name: /save slot/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /save slot/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /save slot/i })).not.toBeDisabled()
    })
  })
})
