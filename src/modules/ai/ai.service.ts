import { generateContent, generateContentWithImage } from './ai.provider'

interface Transaction {
  amount: number
  type: 'income' | 'expense'
  category: string
  occurred_at: string
}

interface BudgetSuggestion {
  category: string
  suggested_amount: number
  reason: string
}

export async function analyzeSpending(
  question: string,
  transactions: Transaction[],
  period: string
): Promise<{ answer: string; suggestions: string[] }> {
  const txSummary = transactions
    .map(
      (t) =>
        `- ${t.occurred_at}: [${t.type}] ${t.category} — ${t.amount.toLocaleString('vi-VN')}đ`
    )
    .join('\n')

  const prompt = `Bạn là trợ lý tài chính cá nhân cho người dùng Việt Nam.
Dưới đây là danh sách giao dịch tháng ${period}:
${txSummary}

Câu hỏi của người dùng: ${question}

Hãy trả lời ngắn gọn, rõ ràng bằng tiếng Việt. Chỉ trả về JSON với format:
{"answer": "...", "suggestions": []}`

  const raw = await generateContent(prompt)

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // fallback nếu Gemini không trả JSON đúng format
  }

  return { answer: raw, suggestions: [] }
}

export interface Insight {
  type: 'warning' | 'tip' | 'summary'
  title: string
  description: string
}

export async function getInsights(
  transactions: Transaction[],
  period: string
): Promise<{ insights: Insight[] }> {
  const txSummary = transactions
    .map(
      (t) =>
        `- ${t.occurred_at}: [${t.type}] ${t.category} — ${t.amount.toLocaleString('vi-VN')}đ`
    )
    .join('\n')

  const prompt = `Bạn là trợ lý tài chính cá nhân cho người dùng Việt Nam.
Dưới đây là danh sách giao dịch tháng ${period}:
${txSummary}

Hãy phân tích và tạo các nhận xét tài chính tổng quan (không cần người dùng hỏi).
Tập trung vào: danh mục chi nhiều nhất, tỷ lệ tiết kiệm, cảnh báo chi tiêu bất thường, lời khuyên cải thiện.
Chỉ trả về JSON với format:
{
  "insights": [
    { "type": "summary" | "warning" | "tip", "title": "...", "description": "..." }
  ]
}`

  const raw = await generateContent(prompt)

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // fallback
  }

  return { insights: [] }
}

interface OcrReceiptResult {
  amount: number
  date: number
  note: string
}

export async function suggestCategory(
  description: string,
  categories: string[]
): Promise<{ category: string }> {
  if (categories.length === 0) return { category: '' }

  const prompt = `Giao dịch: "${description}".
Từ danh sách danh mục: [${categories.join(', ')}].
Gợi ý 1 danh mục phù hợp nhất. Chỉ trả về đúng tên danh mục, không giải thích.`

  const raw = (await generateContent(prompt)).trim()
  const matched = categories.find(c => raw.toLowerCase().includes(c.toLowerCase()))
  return { category: matched ?? categories[0] }
}

export async function analyzeReceipt(
  base64Image: string,
  mimeType: string
): Promise<OcrReceiptResult> {
  const prompt = `Bạn là trợ lý phân tích hoá đơn cho người dùng Việt Nam.
Nhìn vào ảnh hoá đơn/receipt này và trả về JSON với format chính xác:
{
  "amount": <tổng tiền cần thanh toán, đơn vị đồng VND, kiểu số nguyên, 0 nếu không tìm thấy>,
  "date": <ngày giao dịch dạng unix milliseconds, 0 nếu không tìm thấy>,
  "note": "<tên cửa hàng hoặc mô tả ngắn, tối đa 50 ký tự, chuỗi rỗng nếu không tìm thấy>"
}
Chỉ trả về JSON, không giải thích thêm.`

  const raw = await generateContentWithImage(prompt, base64Image, mimeType)

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        amount: Math.max(0, Math.round(parsed.amount ?? 0)),
        date: Math.max(0, Math.round(parsed.date ?? 0)),
        note: String(parsed.note ?? '').slice(0, 50),
      }
    }
  } catch { /* fallback */ }

  return { amount: 0, date: 0, note: '' }
}

export async function suggestBudget(
  transactions: Transaction[],
  periodMonths: number
): Promise<{ suggestions: BudgetSuggestion[] }> {
  const txSummary = transactions
    .map(
      (t) =>
        `- ${t.occurred_at}: [${t.type}] ${t.category} — ${t.amount.toLocaleString('vi-VN')}đ`
    )
    .join('\n')

  const prompt = `Bạn là trợ lý tài chính cá nhân cho người dùng Việt Nam.
Dưới đây là lịch sử giao dịch ${periodMonths} tháng gần nhất:
${txSummary}

Hãy gợi ý ngân sách hàng tháng cho từng danh mục chi tiêu.
Chỉ trả về JSON với format:
{
  "suggestions": [
    { "category": "...", "suggested_amount": 0, "reason": "..." }
  ]
}`

  const raw = await generateContent(prompt)

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      return JSON.parse(jsonMatch[0])
    }
  } catch {
    // fallback
  }

  return { suggestions: [] }
}
