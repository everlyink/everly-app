import { Resend } from 'resend';

let resendClient = null;

export function getResend() {
  if (resendClient) return resendClient;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error('RESEND_API_KEY is not set');
  resendClient = new Resend(key);
  return resendClient;
}

const FROM_ADDRESS = process.env.EVERLY_FROM_EMAIL || 'everly <hello@everly.ink>';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.everly.ink';

function previewLine(body, max = 100) {
  if (!body) return '';
  const trimmed = body.trim().replace(/\s+/g, ' ');
  return trimmed.length <= max ? trimmed : trimmed.slice(0, max).trimEnd() + '…';
}

export async function sendDeliveryEmail(message) {
  const resend = getResend();
  const link = `${APP_URL}/delivered/${message.delivery_token}`;
  const preview = previewLine(message.body, 100);
  const subject = `a message for you, ${message.recipient_name}.`;

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;padding:0;background:#FAFAF8;font-family:Georgia,serif;color:#1C1C1A;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#FAFAF8;padding:32px 16px;">
      <tr>
        <td align="center">
          <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="520" style="max-width:520px;">
            <tr><td style="padding:8px 0 24px;font-family:Georgia,serif;color:#C0604A;font-size:20px;"><a href="https://everly.ink" style="color:#C0604A;text-decoration:none;">everly</a></td></tr>
            <tr>
              <td style="background:#FAFAF8;border:1px solid #E8D5B0;border-radius:6px;padding:32px;">
                <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;color:#1C1C1A;">dear ${escapeHtml(message.recipient_name)},</p>
                <p style="margin:0 0 24px;font-family:Georgia,serif;font-style:italic;font-size:17px;color:rgba(28,28,26,0.7);line-height:1.7;">${escapeHtml(preview)}</p>
                <p style="margin:0 0 28px;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:rgba(28,28,26,0.6);">someone wrote this for you — and chose today to send it.</p>
                <p style="margin:0;">
                  <a href="${link}" style="display:inline-block;background:#2C4A3E;color:#FAFAF8;text-decoration:none;padding:14px 28px;border-radius:4px;font-family:Georgia,serif;font-size:16px;">read your message →</a>
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:24px 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:rgba(28,28,26,0.5);text-align:center;">
                <a href="https://everly.ink" style="color:rgba(28,28,26,0.5);text-decoration:none;">everly</a> · now in words. always in time. · <a href="https://everly.ink" style="color:rgba(28,28,26,0.5);text-decoration:underline;">everly.ink</a><br><br>if this email landed in your spam folder, please mark it as not spam so future messages reach you safely.
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;

  const text = `dear ${message.recipient_name},

${preview}

someone wrote this for you — and chose today to send it.

read your message: ${link}

everly · now in words. always in time. · https://everly.ink`;

  return resend.emails.send({
    from: FROM_ADDRESS,
    to: message.recipient_email,
    subject,
    html,
    text,
  });
}

export async function sendCheckoutConfirmationEmail({ to, firstName, planLabel }) {
  const resend = getResend();
  const subject = `welcome to everly · ${planLabel}.`;
  const html = `<!doctype html>
<html lang="en"><body style="margin:0;padding:0;background:#FAFAF8;font-family:Georgia,serif;color:#1C1C1A;">
  <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="padding:32px 16px;">
    <tr><td align="center"><table width="520" style="max-width:520px;">
      <tr><td style="padding:8px 0 24px;font-family:Georgia,serif;color:#C0604A;font-size:20px;"><a href="https://everly.ink" style="color:#C0604A;text-decoration:none;">everly</a></td></tr>
      <tr><td style="background:#FAFAF8;border:1px solid #E8D5B0;border-radius:6px;padding:32px;">
        <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:22px;">thank you${firstName ? `, ${escapeHtml(firstName)}` : ''}.</p>
        <p style="margin:0 0 16px;font-family:Georgia,serif;font-size:17px;line-height:1.7;color:rgba(28,28,26,0.8);">your <strong>${escapeHtml(planLabel)}</strong> plan is active. your word clock is ready whenever you are.</p>
        <p style="margin:0;"><a href="${APP_URL}/dashboard" style="display:inline-block;background:#2C4A3E;color:#FAFAF8;text-decoration:none;padding:14px 28px;border-radius:4px;font-family:Georgia,serif;font-size:16px;">go to your word clock →</a></p>
      </td></tr>
      <tr>
        <td style="padding:24px 0 8px;font-family:Helvetica,Arial,sans-serif;font-size:12px;color:rgba(28,28,26,0.5);text-align:center;">
          <a href="https://everly.ink" style="color:rgba(28,28,26,0.5);text-decoration:none;">everly</a> · now in words. always in time. · <a href="https://everly.ink" style="color:rgba(28,28,26,0.5);text-decoration:underline;">everly.ink</a>
        </td>
      </tr>
    </table></td></tr>
  </table></body></html>`;

  return resend.emails.send({
    from: FROM_ADDRESS,
    to,
    subject,
    html,
  });
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}