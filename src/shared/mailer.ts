import nodemailer from 'nodemailer'

const ALERT_TO = 'vund.0709@gmail.com'

function createTransport() {
  const user = process.env.MAIL_USER
  const pass = process.env.MAIL_APP_PASSWORD
  if (!user || !pass) return null

  return nodemailer.createTransport({
    service: 'gmail',
    auth: { user, pass },
  })
}

export async function sendErrorAlert(subject: string, body: string): Promise<void> {
  const transport = createTransport()
  if (!transport) {
    console.warn('[mailer] MAIL_USER / MAIL_APP_PASSWORD chưa set, bỏ qua gửi mail')
    return
  }

  try {
    await transport.sendMail({
      from: process.env.MAIL_USER,
      to: ALERT_TO,
      subject: `[FinTrack BE] ${subject}`,
      text: body,
    })
    console.log(`[mailer] Alert sent: ${subject}`)
  } catch (err) {
    console.error('[mailer] Gửi mail thất bại:', err)
  }
}