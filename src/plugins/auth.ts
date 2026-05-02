import fp from 'fastify-plugin'
import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify'
import * as admin from 'firebase-admin'

declare module 'fastify' {
  interface FastifyRequest {
    user: admin.auth.DecodedIdToken
  }
}

export default fp(async (fastify: FastifyInstance) => {
  fastify.decorate(
    'verifyFirebaseToken',
    async (request: FastifyRequest, reply: FastifyReply) => {
      const authHeader = request.headers.authorization
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        reply.code(401).send({ error: 'UNAUTHORIZED' })
        return
      }

      const token = authHeader.slice(7)
      try {
        const decoded = await admin.auth().verifyIdToken(token)
        request.user = decoded
      } catch {
        reply.code(401).send({ error: 'INVALID_TOKEN' })
      }
    }
  )
})

declare module 'fastify' {
  interface FastifyInstance {
    verifyFirebaseToken: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>
  }
}
