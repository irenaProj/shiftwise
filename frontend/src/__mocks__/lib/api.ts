import axios from 'axios'
import { useAuthStore } from '../lib/store'

export const api = axios.create({
  baseURL: 'http://localhost:3001/api',
  withCredentials: true,
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().accessToken
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})
