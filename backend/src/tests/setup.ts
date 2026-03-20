import { mockDeep, mockReset } from 'jest-mock-extended'
import { PrismaClient } from '@prisma/client'

// Create a deep mock of PrismaClient
const prismaMock = mockDeep<PrismaClient>()

// Mock the prisma module so all imports get the mock
jest.mock('../lib/prisma', () => ({
  prisma: prismaMock,
}))

// Reset all mocks before each test so state never leaks
beforeEach(() => {
  mockReset(prismaMock)
})

export { prismaMock }
