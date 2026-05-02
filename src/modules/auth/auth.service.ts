import { PrismaClient } from '@prisma/client'

export async function syncUser(
  prisma: PrismaClient,
  firebase_uid: string,
  email: string | undefined
) {
  const user = await prisma.user.upsert({
    where: { firebase_uid },
    update: { email, updated_at: new Date() },
    create: { firebase_uid, email },
  })

  return {
    id: user.id,
    plan: user.plan,
    plan_expires_at: user.plan_expires_at,
  }
}
