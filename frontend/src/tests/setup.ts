import '@testing-library/jest-dom'
import { beforeAll, afterEach, afterAll } from 'vitest'
import { setupServer } from 'msw/node'
import { handlers } from './msw/handlers'
import { api } from '../lib/api'

// Fix relative baseURL — jsdom has no base URL so axios relative URLs fail
// Set absolute URL so MSW can intercept requests
api.defaults.baseURL = 'http://localhost:3001/api'

export const server = setupServer(...handlers)

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }))
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
