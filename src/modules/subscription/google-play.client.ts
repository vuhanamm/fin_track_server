import { google } from 'googleapis'

const androidpublisher = google.androidpublisher('v3')

function getAuthClient() {
  const serviceAccountJson = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON
  if (!serviceAccountJson) {
    throw new Error('GOOGLE_PLAY_SERVICE_ACCOUNT_JSON env var is required')
  }

  const credentials = JSON.parse(serviceAccountJson)
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/androidpublisher'],
  })
}

export interface VerifyPurchaseResult {
  isValid: boolean
  expiresAt: Date | null
  orderId: string | null
}

export async function verifySubscriptionPurchase(
  packageName: string,
  productId: string,
  purchaseToken: string
): Promise<VerifyPurchaseResult> {
  const auth = getAuthClient()
  const authClient = await auth.getClient()

  const response = await androidpublisher.purchases.subscriptions.get({
    auth: authClient as any,
    packageName,
    subscriptionId: productId,
    token: purchaseToken,
  })

  const data = response.data
  const expiryMs = data.expiryTimeMillis ? parseInt(data.expiryTimeMillis) : null
  const isValid =
    data.paymentState === 1 && // 1 = payment received
    expiryMs !== null &&
    expiryMs > Date.now()

  return {
    isValid,
    expiresAt: expiryMs ? new Date(expiryMs) : null,
    orderId: data.orderId ?? null,
  }
}

export async function acknowledgePurchase(
  packageName: string,
  productId: string,
  purchaseToken: string
): Promise<void> {
  const auth = getAuthClient()
  const authClient = await auth.getClient()

  await androidpublisher.purchases.subscriptions.acknowledge({
    auth: authClient as any,
    packageName,
    subscriptionId: productId,
    token: purchaseToken,
  })
}
