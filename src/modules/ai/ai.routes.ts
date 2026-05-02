import { FastifyInstance } from 'fastify'
import { premiumGuard } from '../../shared/middleware/premium-guard'
import { analyzeSpending, suggestBudget, getInsights, analyzeReceipt, suggestCategory } from './ai.service'

interface Transaction {
  amount: number
  type: 'income' | 'expense'
  category: string
  occurred_at: string
}

interface AnalyzeBody {
  question: string
  transactions: Transaction[]
  period: string
}

interface SuggestBudgetBody {
  transactions: Transaction[]
  period_months: number
}

interface InsightsBody {
  transactions: Transaction[]
  period: string
}

interface OcrReceiptBody {
  image: string
  mime_type: string
}

interface SuggestCategoryBody {
  description: string
  categories: string[]
}

const transactionSchema = {
  type: 'object',
  required: ['amount', 'type', 'category', 'occurred_at'],
  properties: {
    amount: { type: 'number' },
    type: { type: 'string', enum: ['income', 'expense'] },
    category: { type: 'string' },
    occurred_at: { type: 'string' },
  },
}

export async function aiRoutes(fastify: FastifyInstance) {
  fastify.post<{ Body: AnalyzeBody }>(
    '/ai/analyze',
    {
      preHandler: [fastify.verifyFirebaseToken, premiumGuard],
      schema: {
        body: {
          type: 'object',
          required: ['question', 'transactions', 'period'],
          properties: {
            question: { type: 'string', minLength: 1 },
            transactions: { type: 'array', items: transactionSchema },
            period: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { question, transactions, period } = request.body
      const result = await analyzeSpending(question, transactions, period)
      reply.code(200).send(result)
    }
  )

  fastify.post<{ Body: SuggestBudgetBody }>(
    '/ai/suggest-budget',
    {
      preHandler: [fastify.verifyFirebaseToken, premiumGuard],
      schema: {
        body: {
          type: 'object',
          required: ['transactions', 'period_months'],
          properties: {
            transactions: { type: 'array', items: transactionSchema },
            period_months: { type: 'integer', minimum: 1, maximum: 12 },
          },
        },
      },
    },
    async (request, reply) => {
      const { transactions, period_months } = request.body
      const result = await suggestBudget(transactions, period_months)
      reply.code(200).send(result)
    }
  )

  fastify.post<{ Body: InsightsBody }>(
    '/ai/insights',
    {
      preHandler: [fastify.verifyFirebaseToken, premiumGuard],
      schema: {
        body: {
          type: 'object',
          required: ['transactions', 'period'],
          properties: {
            transactions: { type: 'array', items: transactionSchema },
            period: { type: 'string' },
          },
        },
      },
    },
    async (request, reply) => {
      const { transactions, period } = request.body
      const result = await getInsights(transactions, period)
      reply.code(200).send(result)
    }
  )

  fastify.post<{ Body: OcrReceiptBody }>(
    '/ai/ocr-receipt',
    {
      preHandler: [fastify.verifyFirebaseToken, premiumGuard],
      schema: {
        body: {
          type: 'object',
          required: ['image', 'mime_type'],
          properties: {
            image: { type: 'string', minLength: 1 },
            mime_type: { type: 'string', enum: ['image/jpeg', 'image/png', 'image/webp'] },
          },
        },
      },
    },
    async (request, reply) => {
      const { image, mime_type } = request.body
      const result = await analyzeReceipt(image, mime_type)
      reply.code(200).send(result)
    }
  )

  fastify.post<{ Body: SuggestCategoryBody }>(
    '/ai/suggest-category',
    {
      preHandler: [fastify.verifyFirebaseToken, premiumGuard],
      schema: {
        body: {
          type: 'object',
          required: ['description', 'categories'],
          properties: {
            description: { type: 'string', minLength: 1 },
            categories: { type: 'array', items: { type: 'string' }, minItems: 1 },
          },
        },
      },
    },
    async (request, reply) => {
      const { description, categories } = request.body
      const result = await suggestCategory(description, categories)
      reply.code(200).send(result)
    }
  )
}
