import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { http, HttpResponse } from 'msw'
import { renderWithProviders } from '../utils'
import { AddEmployeeModal } from '../../components/AddEmployeeModal'
import { server } from '../setup'

const onClose = vi.fn()
const workspaceId = 'workspace-1'

function renderModal() {
  return renderWithProviders(
    <AddEmployeeModal workspaceId={workspaceId} onClose={onClose} />
  )
}

describe('AddEmployeeModal', () => {
  beforeEach(() => onClose.mockClear())

  it('renders the form fields', () => {
    renderModal()
    expect(screen.getByText('Add team member')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Alex Johnson')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('alex@company.com')).toBeInTheDocument()
    expect(screen.getByRole('combobox')).toBeInTheDocument()
  })

  it('calls onClose when cancel is clicked', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('calls onClose when X button is clicked', async () => {
    const user = userEvent.setup()
    renderModal()
    await user.click(screen.getAllByRole('button')[0])
    expect(onClose).toHaveBeenCalledOnce()
  })

  it('submits the form and closes on success', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByPlaceholderText('Alex Johnson'), 'Tim Buktu')
    await user.type(screen.getByPlaceholderText('alex@company.com'), 'tim.buktu@demo.com')
    await user.click(screen.getByRole('button', { name: /add member/i }))

    await waitFor(() => expect(onClose).toHaveBeenCalledOnce())
  })

  it('shows error when employee is already a member', async () => {
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByPlaceholderText('Alex Johnson'), 'Lou Poles')
    await user.type(screen.getByPlaceholderText('alex@company.com'), 'duplicate@demo.com')
    await user.click(screen.getByRole('button', { name: /add member/i }))

    await waitFor(() => {
      expect(screen.getByText('User is already a member of this workspace')).toBeInTheDocument()
    })
    expect(onClose).not.toHaveBeenCalled()
  })

  it('shows loading state while submitting', async () => {
    server.use(
      http.post(`http://localhost:3001/api/workspaces/${workspaceId}/employees`, async () => {
        await new Promise(r => setTimeout(r, 100))
        return HttpResponse.json({}, { status: 201 })
      })
    )
    const user = userEvent.setup()
    renderModal()

    await user.type(screen.getByPlaceholderText('Alex Johnson'), 'Tim Buktu')
    await user.type(screen.getByPlaceholderText('alex@company.com'), 'tim@demo.com')
    await user.click(screen.getByRole('button', { name: /add member/i }))

    expect(screen.getByText('Adding…')).toBeInTheDocument()
  })
})
