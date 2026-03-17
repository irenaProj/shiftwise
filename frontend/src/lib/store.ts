import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface User {
  id: string
  email: string
  name: string
}

interface Workspace {
  id: string
  name: string
  role: 'OWNER' | 'MANAGER' | 'EMPLOYEE'
}

interface AuthState {
  accessToken: string | null
  user: User | null
  workspace: Workspace | null
  setAuth: (accessToken: string, user: User, workspace: Workspace | null) => void
  setAccessToken: (token: string) => void
  clear: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      user: null,
      workspace: null,
      setAuth: (accessToken, user, workspace) => set({ accessToken, user, workspace }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clear: () => set({ accessToken: null, user: null, workspace: null }),
    }),
    {
      name: 'shiftwise-auth',
      // Only persist non-sensitive state — access token lives in memory only
      partialize: (state) => ({ user: state.user, workspace: state.workspace }),
    }
  )
)
