import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = process.env.EMAIL_FROM ?? 'AutoBanking <noreply@autobanking.com.br>'

export async function sendOtpEmail(to: string, name: string, code: string) {
  await resend.emails.send({
    from: FROM,
    to,
    subject: `${code} — seu código de acesso AutoBanking`,
    html: `
      <!DOCTYPE html>
      <html>
      <body style="margin:0;padding:0;background:#08080f;font-family:sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#08080f;padding:40px 20px;">
          <tr><td align="center">
            <table width="480" cellpadding="0" cellspacing="0" style="background:#0d0d1f;border-radius:16px;border:1px solid #1e1b4b;overflow:hidden;">
              <tr>
                <td style="padding:32px;border-bottom:1px solid #1e1b4b;">
                  <table cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="background:linear-gradient(135deg,#7c3aed,#4c1d95);border-radius:12px;width:48px;height:48px;text-align:center;vertical-align:middle;">
                        <span style="color:white;font-size:20px;font-weight:bold;">AB</span>
                      </td>
                      <td style="padding-left:12px;">
                        <p style="margin:0;color:#f8fafc;font-size:18px;font-weight:700;">AutoBanking</p>
                        <p style="margin:0;color:#7c6fa0;font-size:12px;">Sistema de Cobrança</p>
                      </td>
                    </tr>
                  </table>
                </td>
              </tr>
              <tr>
                <td style="padding:32px;">
                  <p style="color:#f8fafc;font-size:16px;margin:0 0 8px;">Olá, <strong>${name}</strong>!</p>
                  <p style="color:#7c6fa0;font-size:14px;margin:0 0 24px;">
                    Seu código de verificação é:
                  </p>
                  <div style="background:#12122a;border:1px solid #7c3aed;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
                    <span style="font-size:40px;font-weight:700;letter-spacing:12px;color:#a78bfa;">${code}</span>
                  </div>
                  <p style="color:#4b5563;font-size:13px;margin:0;">
                    Este código expira em <strong style="color:#7c6fa0;">10 minutos</strong>.
                    Não compartilhe com ninguém.
                  </p>
                </td>
              </tr>
            </table>
          </td></tr>
        </table>
      </body>
      </html>
    `,
  })
}
