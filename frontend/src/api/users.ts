import { apiClient } from './client'

export interface User {
  id: number
  username: string
  is_active: boolean
  is_admin: boolean
  created_at: string | null
}

export interface UserCreate {
  username: string
  password: string
  is_admin?: boolean
}

export const getUsers = async (): Promise<User[]> => {
  const res = await apiClient.get<User[]>('/users/')
  return res.data
}

export const createUser = async (payload: UserCreate): Promise<User> => {
  const res = await apiClient.post<User>('/users/', payload)
  return res.data
}

export const changeUserPassword = async (userId: number, password: string): Promise<User> => {
  const res = await apiClient.patch<User>(`/users/${userId}/password`, { password })
  return res.data
}

export const toggleUserActive = async (userId: number, is_active: boolean): Promise<User> => {
  const res = await apiClient.patch<User>(`/users/${userId}/active`, { is_active })
  return res.data
}

export const deleteUser = async (userId: number): Promise<void> => {
  await apiClient.delete(`/users/${userId}`)
}
