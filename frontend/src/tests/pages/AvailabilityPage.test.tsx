import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, setAuthenticatedUser, clearAuth } from '../utils'
import { AvailabilityPage } from '../../pages/AvailabilityPage'

window.confirm = vi.fn(() => true)

describe('AvailabilityPage', () => {
  beforeEach(() => {
    clearAuth()
    setAuthenticatedUser('MANAGER')
  })

  it('renders the page heading', () => {
    renderWithProviders(<AvailabilityPage />, { initialRoute: '/availability' })
    expect(screen.getByRole('heading', { name: 'Availability' })).toBeInTheDocument()
  })

  it('loads and displays employees in the dropdown', async () => {
    renderWithProviders(<AvailabilityPage />, { initialRoute: '/availability' })
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Will Power' })).toBeInTheDocument()
      expect(screen.getByRole('option', { name: 'Lou Poles' })).toBeInTheDocument()
    })
  })

  it('loads and displays availability windows', async () => {
    renderWithProviders(<AvailabilityPage />, { initialRoute: '/availability' })
    await waitFor(() => {
      expect(screen.getAllByText('07:00 – 15:00').length).toBeGreaterThan(0)
    })
  })

  it('displays day abbreviations for windows', async () => {
    renderWithProviders(<AvailabilityPage />, { initialRoute: '/availability' })
    await waitFor(() => {
      expect(screen.getAllByText('Mon').length).toBeGreaterThan(0)
    })
  })

  it('shows add form for managers', async () => {
    renderWithProviders(<AvailabilityPage />, { initialRoute: '/availability' })
    await waitFor(() => expect(screen.getAllByText('07:00 – 15:00').length).toBeGreaterThan(0))
    expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument()
  })

  it('hides add form for employees', async () => {
    clearAuth()
    setAuthenticatedUser('EMPLOYEE')
    renderWithProviders(<AvailabilityPage />, { initialRoute: '/availability' })
    await waitFor(() => expect(screen.getAllByText('07:00 – 15:00').length).toBeGreaterThan(0))
    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()
  })

  it('shows delete buttons for managers', async () => {
    renderWithProviders(<AvailabilityPage />, { initialRoute: '/availability' })
    await waitFor(() => {
      expect(screen.getAllByTitle('Remove window').length).toBeGreaterThan(0)
    })
  })

  it('hides delete buttons for employees', async () => {
    clearAuth()
    setAuthenticatedUser('EMPLOYEE')
    renderWithProviders(<AvailabilityPage />, { initialRoute: '/availability' })
    await waitFor(() => expect(screen.getAllByText('07:00 – 15:00').length).toBeGreaterThan(0))
    expect(screen.queryByTitle('Remove window')).not.toBeInTheDocument()
  })

  it('switches employee when dropdown changes', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AvailabilityPage />, { initialRoute: '/availability' })
    await waitFor(() => expect(screen.getByRole('option', { name: 'Lou Poles' })).toBeInTheDocument())
    await user.selectOptions(screen.getByRole('combobox', { name: /employee/i }), 'Lou Poles')
    await waitFor(() => {
      expect(screen.getAllByText('07:00 – 15:00').length).toBeGreaterThan(0)
    })
  })

  it('submits the add availability form', async () => {
    const user = userEvent.setup()
    renderWithProviders(<AvailabilityPage />, { initialRoute: '/availability' })
    await waitFor(() => expect(screen.getByRole('button', { name: /^save$/i })).toBeInTheDocument())
    await user.click(screen.getByRole('button', { name: /^save$/i }))
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /^save$/i })).not.toBeDisabled()
    })
  })
})
