import { FastifyRequest, FastifyReply } from 'fastify'
import { PrismaClient } from '@prisma/client'

interface ServerWithDeps {
  prisma: PrismaClient
  user: { uid: string }
}

export async function premiumGuard(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const { prisma, user } = request.server as unknown as ServerWithDeps

  let dbUser
  try {
    dbUser = await prisma.user.findUnique({
      where: { firebase_uid: user.uid },
    })
  } catch {
    return reply.code(500).send({ error: 'INTERNAL_ERROR' })
  }

  if (
    !dbUser ||
    dbUser.plan !== 'premium' ||
    !dbUser.plan_expires_at ||
    dbUser.plan_expires_at < new Date()
  ) {
    return reply.code(403).send({ error: 'PREMIUM_REQUIRED' })
  }
}
