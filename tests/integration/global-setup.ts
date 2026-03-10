/**
 * Vitest globalSetup — runs in the main process BEFORE any test worker.
 * Checks that PostgreSQL and Redis are reachable and sets SERVICES_AVAILABLE
 * so that describe.runIf() can skip entire suites cleanly.
 */
import net from 'node:net'

function checkPort(host: string, port: number, timeoutMs = 2000): Promise<boolean> {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port })
    const timer = setTimeout(() => {
      socket.destroy()
      resolve(false)
    }, timeoutMs)
    socket.on('connect', () => {
      clearTimeout(timer)
      socket.destroy()
      resolve(true)
    })
    socket.on('error', () => {
      clearTimeout(timer)
      resolve(false)
    })
  })
}

export async function setup(): Promise<void> {
  const [pg, redis] = await Promise.all([
    checkPort('127.0.0.1', 5432),
    checkPort('127.0.0.1', 6379),
  ])

  const available = pg && redis
  process.env['SERVICES_AVAILABLE'] = available ? 'true' : 'false'

  if (!available) {
    const missing = [!pg && 'PostgreSQL :5432', !redis && 'Redis :6379'].filter(Boolean).join(', ')
    console.warn(`\n⚠️  Integration tests will be SKIPPED — services not reachable: ${missing}`)
    console.warn('   Start them with: docker-compose up -d\n')
  }
}
