import fp from 'fastify-plugin'
import { FastifyInstance } from 'fastify'
import * as admin from 'firebase-admin'

export default fp(async (_fastify: FastifyInstance) => {
  if (admin.apps.length > 0) return

  const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON
  if (!serviceAccount) {
    throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON env var is required')
  }

  admin.initializeApp({
    credential: admin.credential.cert(JSON.parse(serviceAccount)),
  })
})
