import { describe, it, expect, beforeEach } from 'vitest'
import { useAuthStore } from '../../lib/store'

describe('useAuthStore', () => {
  beforeEach(() => {
    useAuthStore.setState({
      accessToken: null,
      user: null,
      workspace: null,
    })
  })

  it('starts with null state', () => {
    const { accessToken, user, workspace } = useAuthStore.getState()
    expect(accessToken).toBeNull()
    expect(user).toBeNull()
    expect(workspace).toBeNull()
  })

  it('setAuth stores all values', () => {
    const user = { id: 'u1', email: 'test@demo.com', name: 'Test User' }
    const workspace = { id: 'w1', name: 'Test WS', role: 'MANAGER' as const }
    useAuthStore.getState().setAuth('token-123', user, workspace)

    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('token-123')
    expect(state.user).toEqual(user)
    expect(state.workspace).toEqual(workspace)
  })

  it('setAccessToken updates only the token', () => {
    const user = { id: 'u1', email: 'test@demo.com', name: 'Test User' }
    const workspace = { id: 'w1', name: 'Test WS', role: 'MANAGER' as const }
    useAuthStore.getState().setAuth('old-token', user, workspace)
    useAuthStore.getState().setAccessToken('new-token')

    const state = useAuthStore.getState()
    expect(state.accessToken).toBe('new-token')
    expect(state.user).toEqual(user)
    expect(state.workspace).toEqual(workspace)
  })

  it('clear resets all values to null', () => {
    const user = { id: 'u1', email: 'test@demo.com', name: 'Test User' }
    const workspace = { id: 'w1', name: 'Test WS', role: 'MANAGER' as const }
    useAuthStore.getState().setAuth('token', user, workspace)
    useAuthStore.getState().clear()

    const state = useAuthStore.getState()
    expect(state.accessToken).toBeNull()
    expect(state.user).toBeNull()
    expect(state.workspace).toBeNull()
  })

  it('setAuth accepts null workspace', () => {
    const user = { id: 'u1', email: 'test@demo.com', name: 'Test User' }
    useAuthStore.getState().setAuth('token', user, null)
    expect(useAuthStore.getState().workspace).toBeNull()
  })
})
