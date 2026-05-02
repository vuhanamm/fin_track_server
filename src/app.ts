import Fastify from 'fastify'
import { registerRateLimit } from './shared/middleware/rate-limit'

// Plugins
import prismaPlugin from './plugins/prisma'
import firebasePlugin from './plugins/firebase'
import authPlugin from './plugins/auth'

// Routes
import { authRoutes } from './modules/auth/auth.routes'
import { subscriptionRoutes } from './modules/subscription/subscription.routes'
import { aiRoutes } from './modules/ai/ai.routes'

async function buildApp() {
  const fastify = Fastify({
    logger: {
      level: process.env.NODE_ENV === 'production' ? 'warn' : 'info',
    },
  })

  // Rate limiting (must register before routes)
  await registerRateLimit(fastify)

  // Core plugins
  await fastify.register(firebasePlugin)
  await fastify.register(prismaPlugin)
  await fastify.register(authPlugin)

  // Routes
  await fastify.register(authRoutes)
  await fastify.register(subscriptionRoutes)
  await fastify.register(aiRoutes)

  // Health check
  fastify.get('/health', async () => ({ status: 'ok' }))

  return fastify
}

async function main() {
  const app = await buildApp()
  const port = parseInt(process.env.PORT ?? '3000', 10)

  try {
    await app.listen({ port, host: '0.0.0.0' })
    console.log(`Server listening on port ${port}`)
  } catch (err) {
    app.log.error(err)
    process.exit(1)
  }
}

main()

export { buildApp }
