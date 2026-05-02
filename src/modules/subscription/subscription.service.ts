import { PrismaClient } from '@prisma/client'
import {
  verifySubscriptionPurchase,
  acknowledgePurchase,
} from './google-play.client'

export async function verifyAndUpgrade(
  prisma: PrismaClient,
  firebaseUid: string,
  purchaseToken: string,
  productId: string,
  packageName: string
) {
  const result = await verifySubscriptionPurchase(
    packageName,
    productId,
    purchaseToken
  )

  if (!result.isValid || !result.expiresAt) {
    return { success: false, reason: 'INVALID_PURCHASE' }
  }

  await prisma.user.update({
    where: { firebase_uid: firebaseUid },
    data: {
      plan: 'premium',
      plan_expires_at: result.expiresAt,
      purchase_token: purchaseToken,
      updated_at: new Date(),
    },
  })

  // Acknowledge bắt buộc — nếu không Google tự refund sau 3 ngày
  await acknowledgePurchase(packageName, productId, purchaseToken)

  return {
    success: true,
    plan: 'premium',
    plan_expires_at: result.expiresAt,
  }
}

export async function getSubscriptionStatus(
  prisma: PrismaClient,
  firebaseUid: string
) {
  const user = await prisma.user.findUnique({
    where: { firebase_uid: firebaseUid },
    select: { plan: true, plan_expires_at: true },
  })

  if (!user) {
    return { plan: 'free', plan_expires_at: null, is_active: false }
  }

  const is_active =
    user.plan === 'premium' &&
    user.plan_expires_at !== null &&
    user.plan_expires_at > new Date()

  return {
    plan: user.plan,
    plan_expires_at: user.plan_expires_at,
    is_active,
  }
}
