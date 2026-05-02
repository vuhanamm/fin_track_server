import { FastifyInstance } from 'fastify'
import { verifyAndUpgrade, getSubscriptionStatus } from './subscription.service'

interface VerifyBody {
  purchase_token: string
  product_id: string
  package_name: string
}

export async function subscriptionRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: VerifyBody }>(
    '/subscription/verify',
    {
      preHandler: [fastify.verifyFirebaseToken],
      schema: {
        body: {
          type: 'object',
          required: ['purchase_token', 'product_id', 'package_name'],
          properties: {
            purchase_token: { type: 'string', minLength: 1 },
            product_id: { type: 'string', minLength: 1 },
            package_name: { type: 'string', minLength: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { purchase_token, product_id, package_name } = request.body
      const result = await verifyAndUpgrade(
        fastify.prisma,
        request.user.uid,
        purchase_token,
        product_id,
        package_name
      )

      if (!result.success) {
        reply.code(400).send({ error: result.reason })
        return
      }

      reply.code(200).send(result)
    }
  )

  fastify.get(
    '/subscription/status',
    {
      preHandler: [fastify.verifyFirebaseToken],
    },
    async (request, reply) => {
      const status = await getSubscriptionStatus(
        fastify.prisma,
        request.user.uid
      )
      reply.code(200).send(status)
    }
  )
}
