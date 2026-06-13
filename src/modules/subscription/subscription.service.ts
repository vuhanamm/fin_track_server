import { PrismaClient } from '@prisma/client'
import {
  verifySubscriptionPurchase,
  acknowledgePurchase,
} from './google-play.client'
import { sendErrorAlert } from '../../shared/mailer'

export async function verifyAndUpgrade(
  prisma: PrismaClient,
  firebaseUid: string,
  purchaseToken: string,
  productId: string,
  packageName: string
) {
  let result
  try {
    result = await verifySubscriptionPurchase(packageName, productId, purchaseToken)
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[subscription] Google Play verify error:', err)
    sendErrorAlert(
      'Google Play verify thất bại',
      `uid: ${firebaseUid}\nproductId: ${productId}\npackageName: ${packageName}\ntoken: ${purchaseToken.slice(0, 30)}…\n\nLỗi:\n${detail}`
    )
    return { success: false, reason: 'GOOGLE_PLAY_ERROR', detail }
  }

  if (!result.isValid || !result.expiresAt) {
    const detail = `isValid=${result.isValid} expiresAt=${result.expiresAt} orderId=${result.orderId}`
    console.error('[subscription] Invalid purchase:', detail)
    sendErrorAlert(
      'Purchase không hợp lệ (INVALID_PURCHASE)',
      `uid: ${firebaseUid}\nproductId: ${productId}\ntoken: ${purchaseToken.slice(0, 30)}…\n\n${detail}`
    )
    return { success: false, reason: 'INVALID_PURCHASE', detail }
  }

  try {
    const tokenOwner = await prisma.user.findFirst({
      where: { purchase_token: purchaseToken },
      select: { firebase_uid: true },
    })

    if (tokenOwner && tokenOwner.firebase_uid !== firebaseUid) {
      console.warn('[subscription] Token already claimed by uid:', tokenOwner.firebase_uid)
      return { success: false, reason: 'TOKEN_ALREADY_CLAIMED' }
    }

    await prisma.user.upsert({
      where: { firebase_uid: firebaseUid },
      update: {
        plan: 'premium',
        plan_expires_at: result.expiresAt,
        purchase_token: purchaseToken,
        updated_at: new Date(),
      },
      create: {
        firebase_uid: firebaseUid,
        plan: 'premium',
        plan_expires_at: result.expiresAt,
        purchase_token: purchaseToken,
      },
    })
  } catch (err) {
    const detail = err instanceof Error ? err.message : String(err)
    console.error('[subscription] DB error:', err)
    sendErrorAlert(
      'DB error (DATABASE_ERROR)',
      `uid: ${firebaseUid}\ntoken: ${purchaseToken.slice(0, 30)}…\n\nLỗi:\n${detail}`
    )
    return { success: false, reason: 'DATABASE_ERROR' }
  }

  // Acknowledge bắt buộc — nếu không Google tự refund sau 3 ngày.
  // Nếu fail thì vẫn trả success vì user đã trả tiền và DB đã cập nhật.
  try {
    await acknowledgePurchase(packageName, productId, purchaseToken)
  } catch (err) {
    console.error('[subscription] Google Play acknowledge error (non-fatal):', err)
  }

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
  let user
  try {
    user = await prisma.user.findUnique({
      where: { firebase_uid: firebaseUid },
      select: { plan: true, plan_expires_at: true },
    })
  } catch (err) {
    console.error('[subscription] DB findUnique error:', err)
    return { plan: 'free', plan_expires_at: null, is_active: false }
  }

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
