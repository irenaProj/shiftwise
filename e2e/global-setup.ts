import { execSync } from 'child_process'
import path from 'path'
import { config } from 'dotenv'

config({ path: path.join(process.cwd(), '.env') })

export default async function globalSetup() {
  // In CI the workflow resets the DB explicitly before starting servers
  // Only reset here when running locally
  if (process.env.CI) {
    console.log('ℹ️  CI detected — skipping local DB reset (handled by workflow)')
    return
  }

  const e2eDb = process.env.E2E_DATABASE_URL
  if (!e2eDb) {
    console.warn('⚠️  E2E_DATABASE_URL not set — skipping database reset')
    return
  }

  console.log('🔄 Resetting E2E test database...')
  execSync('npx tsx e2e/seed.ts', {
    cwd: process.cwd(),
    env: { ...process.env, E2E_DATABASE_URL: e2eDb },
    stdio: 'inherit',
  })
  console.log('✅ E2E database ready')
}
