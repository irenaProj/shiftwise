import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, setAuthenticatedUser, clearAuth } from '../utils'
import { ShiftTemplatesPage } from '../../pages/ShiftTemplatesPage'

window.confirm = vi.fn(() => true)

describe('ShiftTemplatesPage', () => {
  beforeEach(() => {
    clearAuth()
    setAuthenticatedUser('MANAGER')
  })

  it('renders the page heading', () => {
    renderWithProviders(<ShiftTemplatesPage />, { initialRoute: '/shift-templates' })
    expect(screen.getByText('Shift templates')).toBeInTheDocument()
  })

  it('loads and displays templates', async () => {
    renderWithProviders(<ShiftTemplatesPage />, { initialRoute: '/shift-templates' })
    await waitFor(() => {
      expect(screen.getByText('Morning')).toBeInTheDocument()
      expect(screen.getByText('Afternoon')).toBeInTheDocument()
    })
  })

  it('displays start and end times', async () => {
    renderWithProviders(<ShiftTemplatesPage />, { initialRoute: '/shift-templates' })
    await waitFor(() => {
      expect(screen.getByText('06:00 – 14:00')).toBeInTheDocument()
      expect(screen.getByText('14:00 – 22:00')).toBeInTheDocument()
    })
  })

  it('shows add form for managers', async () => {
    renderWithProviders(<ShiftTemplatesPage />, { initialRoute: '/shift-templates' })
    await waitFor(() => expect(screen.getByText('Morning')).toBeInTheDocument())
    expect(screen.getByPlaceholderText('e.g. Morning')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /add template/i })).toBeInTheDocument()
  })

  it('hides add form for employees', async () => {
    clearAuth()
    setAuthenticatedUser('EMPLOYEE')
    renderWithProviders(<ShiftTemplatesPage />, { initialRoute: '/shift-templates' })
    await waitFor(() => expect(screen.getByText('Morning')).toBeInTheDocument())
    expect(screen.queryByPlaceholderText('e.g. Morning')).not.toBeInTheDocument()
  })

  it('shows delete buttons for managers', async () => {
    renderWithProviders(<ShiftTemplatesPage />, { initialRoute: '/shift-templates' })
    await waitFor(() => expect(screen.getByText('Morning')).toBeInTheDocument())
    expect(screen.getAllByTitle('Delete template').length).toBe(2)
  })

  it('hides delete buttons for employees', async () => {
    clearAuth()
    setAuthenticatedUser('EMPLOYEE')
    renderWithProviders(<ShiftTemplatesPage />, { initialRoute: '/shift-templates' })
    await waitFor(() => expect(screen.getByText('Morning')).toBeInTheDocument())
    expect(screen.queryByTitle('Delete template')).not.toBeInTheDocument()
  })

  it('adds a new template', async () => {
    const user = userEvent.setup()
    renderWithProviders(<ShiftTemplatesPage />, { initialRoute: '/shift-templates' })
    await waitFor(() => expect(screen.getByPlaceholderText('e.g. Morning')).toBeInTheDocument())

    await user.type(screen.getByPlaceholderText('e.g. Morning'), 'Night')

    const [startInput, endInput] = screen.getAllByDisplayValue('')
    await user.type(startInput, '22:00')
    await user.type(endInput, '06:00')

    await user.click(screen.getByRole('button', { name: /add template/i }))
    await waitFor(() => {
      expect(screen.getByPlaceholderText('e.g. Morning')).toHaveValue('')
    })
  })
})
