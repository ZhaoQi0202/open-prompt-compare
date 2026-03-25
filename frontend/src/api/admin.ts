import client from './client'

export interface UserDetail {
  id: number
  username: string
  is_admin: boolean
  project_ids: number[]
  model_config_ids: number[]
}

export const listUsers = () => client.get<UserDetail[]>('/api/admin/users')

export const createUser = (data: {
  username: string
  password: string
  is_admin?: boolean
  project_ids?: number[]
  model_config_ids?: number[]
}) => client.post<UserDetail>('/api/admin/users', data)

export const updateUser = (
  id: number,
  data: {
    username?: string
    password?: string
    is_admin?: boolean
    project_ids?: number[]
    model_config_ids?: number[]
  }
) => client.put<UserDetail>(`/api/admin/users/${id}`, data)

export const deleteUser = (id: number) => client.delete(`/api/admin/users/${id}`)
