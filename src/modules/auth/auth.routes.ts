import { FastifyInstance } from 'fastify'
import { syncUser } from './auth.service'

interface SyncUserBody {
  firebase_uid: string
  email?: string
}

export async function authRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: SyncUserBody }>(
    '/auth/sync-user',
    {
      schema: {
        body: {
          type: 'object',
          required: ['firebase_uid'],
          properties: {
            firebase_uid: { type: 'string', minLength: 1 },
            email: { type: 'string', format: 'email' },
          },
        },
      },
    },
    async (request, reply) => {
      const { firebase_uid, email } = request.body
      const result = await syncUser(fastify.prisma, firebase_uid, email)
      reply.code(200).send(result)
    }
  )
}
