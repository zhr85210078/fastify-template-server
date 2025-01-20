import { z } from 'zod'

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production']).default('production'),
  FASTIFY_CLOSE_GRACE_DELAY: z.number({ coerce: true }).default(500),
  PORT: z.number({ coerce: true }).default(80),
})

export const env = environmentSchema.parse(process.env)
