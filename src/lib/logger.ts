import { env } from '@/config/env.js'
import pino from 'pino'

const isDev = env.NODE_ENV === 'development'

const logger = pino({
  level: env.LOG_LEVEL,
  ...(isDev
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
            translateTime: 'HH:MM:ss',
            ignore: 'pid,hostname',
          },
        },
      }
    : {}),
})

export default logger

export function createChildLogger(module: string): pino.Logger {
  return logger.child({ module })
}
