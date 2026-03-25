import client from './client'

export const login = (username: string, password: string) =>
  client.post<{ token: string }>('/api/auth/login', { username, password })

export const fetchMe = () => client.get<{ id: number; username: string; is_admin: boolean }>('/api/auth/me')
