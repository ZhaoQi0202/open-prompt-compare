import { create } from 'zustand'
import client from '../api/client'
import { login as apiLogin, fetchMe } from '../api/auth'

interface AuthState {
  token: string | null
  isAuthenticated: boolean
  username: string | null
  isAdmin: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  username: null,
  isAdmin: false,
  login: async (username: string, password: string) => {
    const res = await apiLogin(username, password)
    localStorage.setItem('token', res.data.token)
    const me = await fetchMe()
    set({
      token: res.data.token,
      isAuthenticated: true,
      username: me.data.username,
      isAdmin: me.data.is_admin,
    })
  },
  logout: () => {
    localStorage.removeItem('token')
    set({ token: null, isAuthenticated: false, username: null, isAdmin: false })
  },
  checkAuth: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ token: null, isAuthenticated: false, username: null, isAdmin: false })
      return
    }
    try {
      const me = await fetchMe()
      set({
        token,
        isAuthenticated: true,
        username: me.data.username,
        isAdmin: me.data.is_admin,
      })
    } catch {
      localStorage.removeItem('token')
      set({ token: null, isAuthenticated: false, username: null, isAdmin: false })
    }
  },
}))
