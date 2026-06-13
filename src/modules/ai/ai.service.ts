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
  const expenses = transactions.filter((t) => t.type === 'expense')
  const incomes  = transactions.filter((t) => t.type === 'income')

  const totalExpense = expenses.reduce((s, t) => s + t.amount, 0)
  const totalIncome  = incomes.reduce((s, t) => s + t.amount, 0)
  const savingsRate  = totalIncome > 0
    ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100)
    : null

  // Tổng chi theo từng danh mục, sắp xếp giảm dần
  const categoryTotals = expenses.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + t.amount
    return acc
  }, {})
  const topCategories = Object.entries(categoryTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 5)
    .map(([cat, amount]) => {
      const pct = totalExpense > 0 ? Math.round((amount / totalExpense) * 100) : 0
      return `${cat}: ${amount.toLocaleString('vi-VN')}đ (${pct}%)`
    })
    .join(', ')

  // Top 3 giao dịch lớn nhất
  const topTx = [...expenses]
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 3)
    .map((t) => `${t.category} ${t.amount.toLocaleString('vi-VN')}đ (${t.occurred_at})`)
    .join(', ')

  const savingsLine = savingsRate !== null
    ? `Tỷ lệ tiết kiệm: ${savingsRate}% (${(totalIncome - totalExpense).toLocaleString('vi-VN')}đ)`
    : 'Không có thu nhập trong tháng'

  const prompt = `Bạn là trợ lý tài chính cá nhân cho người dùng Việt Nam.
Dữ liệu tháng ${period}:
- Thu nhập: ${totalIncome.toLocaleString('vi-VN')}đ
- Chi tiêu: ${totalExpense.toLocaleString('vi-VN')}đ
- ${savingsLine}
- Chi theo danh mục: ${topCategories || 'Không có'}
- Giao dịch lớn nhất: ${topTx || 'Không có'}

Tạo đúng 3 đến 5 nhận xét tài chính ngắn gọn, thực tế, bằng tiếng Việt.
Chỉ trả về JSON, không giải thích thêm:
{
  "insights": [
    { "type": "summary" | "warning" | "tip", "title": "...", "description": "..." }
  ]
}`

  const raw = await generateContent(prompt)

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed.insights)) return parsed
    }
  } catch (e) {
    console.error('[getInsights] JSON parse error:', e, '| raw:', raw.slice(0, 200))
  }

  return { insights: [] }
}

interface OcrReceiptResult {
  amount: number
  date: number
  note: string
  category: string
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
  "date_str": "<chép lại ĐÚNG NGUYÊN VĂN chuỗi ngày giờ nhìn thấy trên hoá đơn, ví dụ: '29/03/2019 23:59:00' hoặc 'Ngày 23 tháng 05 năm 2026' hoặc '2024-01-15'. Chuỗi rỗng nếu không tìm thấy>",
  "note": "<tên cửa hàng hoặc mô tả ngắn, tối đa 50 ký tự, chuỗi rỗng nếu không tìm thấy>",
  "category": "<ưu tiên nhìn vào TÊN CÁC MẶT HÀNG trong hoá đơn để phân loại, sau đó mới xét tên cửa hàng. Chọn 1 giá trị phù hợp nhất:
    Ăn uống — đồ ăn, thức uống, nước ngọt (Coca, Pepsi, Sprite...), bia, cà phê, trà, bánh, nhà hàng, quán ăn, fastfood, delivery
    Di chuyển — xăng, dầu, grab, taxi, xe buýt, vé tàu, vé máy bay, phí gửi xe, dịch vụ vận chuyển
    Mua sắm — quần áo, giày dép, túi xách, đồ gia dụng, điện tử, mỹ phẩm, siêu thị, cửa hàng tiện lợi
    Y tế — thuốc (kháng sinh, vitamin, thuốc kê đơn...), bệnh viện, phòng khám, xét nghiệm, vật tư y tế
    Giáo dục — học phí, sách giáo khoa, văn phòng phẩm, khoá học, tài liệu
    Giải trí — vé xem phim, game, du lịch, spa, gym, karaoke, vui chơi
    Nhà ở — tiền thuê nhà, sửa chữa, nội thất, vật tư xây dựng, dọn dẹp
    Điện nước — hoá đơn tiền điện, nước, gas, internet, điện thoại, truyền hình
    Lương — phiếu lương, bảng lương, thưởng
    Freelance — thanh toán dịch vụ tự do, hợp đồng
    Đầu tư — chứng khoán, tiết kiệm, bảo hiểm nhân thọ
    Chi khác — không thuộc danh mục nào ở trên
    Thu khác — thu nhập không thuộc danh mục nào ở trên>"
}
Chỉ trả về JSON, không giải thích thêm.`

  const raw = await generateContentWithImage(prompt, base64Image, mimeType)

  try {
    const jsonMatch = raw.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        amount: Math.max(0, Math.round(parsed.amount ?? 0)),
        date: parseDateVN(String(parsed.date_str ?? '')),
        note: String(parsed.note ?? '').slice(0, 50),
        category: String(parsed.category ?? ''),
      }
    }
  } catch { /* fallback */ }

  return { amount: 0, date: 0, note: '', category: '' }
}

const VN_MONTH_MAP: Record<string, number> = {
  'tháng 1': 1, 'tháng 2': 2, 'tháng 3': 3, 'tháng 4': 4,
  'tháng 5': 5, 'tháng 6': 6, 'tháng 7': 7, 'tháng 8': 8,
  'tháng 9': 9, 'tháng 10': 10, 'tháng 11': 11, 'tháng 12': 12,
}

// Parse chuỗi ngày từ hoá đơn VN → unix ms (UTC+7). Trả 0 nếu không parse được hoặc ngoài ±5 năm.
function parseDateVN(raw: string): number {
  if (!raw) return 0
  const s = raw.trim()
  const UTC7 = 7 * 3600 * 1000

  let d = 0, m = 0, y = 0, h = 0, min = 0, sec = 0

  // "Ngày DD tháng MM năm YYYY" hoặc "DD tháng MM năm YYYY"
  const vnFull = s.match(/(\d{1,2})\s+tháng\s+(\d{1,2})\s+năm\s+(\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/i)
  if (vnFull) {
    ;[, d, m, y, h, min, sec] = vnFull.map(Number) as number[]
  }

  // "DD/MM/YYYY[ HH:mm[:ss]]" hoặc "DD-MM-YYYY" hoặc "DD.MM.YYYY"
  if (!y) {
    const dmy = s.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{4})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
    if (dmy) {
      ;[, d, m, y, h, min, sec] = dmy.map(Number) as number[]
    }
  }

  // "YYYY-MM-DD[ HH:mm[:ss]]" (ISO-like)
  if (!y) {
    const iso = s.match(/(\d{4})-(\d{2})-(\d{2})(?:[T\s](\d{1,2}):(\d{2})(?::(\d{2}))?)?/)
    if (iso) {
      ;[, y, m, d, h, min, sec] = iso.map(Number) as number[]
    }
  }

  if (!y || !m || !d) return 0

  // Tạo Date theo giờ địa phương UTC+7 rồi trừ offset để ra UTC
  const localMs = Date.UTC(y, m - 1, d, h || 0, min || 0, sec || 0)
  return localMs - UTC7
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
