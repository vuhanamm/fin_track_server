import { FastifyRequest, FastifyReply } from 'fastify'

export async function premiumGuard(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { prisma, user } = request.server as any

  const dbUser = await prisma.user.findUnique({
    where: { firebase_uid: user.uid },
  })

  if (
    !dbUser ||
    dbUser.plan !== 'premium' ||
    !dbUser.plan_expires_at ||
    dbUser.plan_expires_at < new Date()
  ) {
    reply.code(403).send({ error: 'PREMIUM_REQUIRED' })
  }
}
