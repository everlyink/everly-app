import twilio from 'twilio';

let twilioClient = null;

export function getTwilio() {
  if (twilioClient) return twilioClient;
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  if (!sid || !token) throw new Error('Twilio env vars missing — set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN');
  twilioClient = twilio(sid, token);
  return twilioClient;
}

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.everly.ink';

export async function sendDeliverySms(message, senderFirstName) {
  const client = getTwilio();
  const from = process.env.TWILIO_PHONE_NUMBER;
  if (!from) throw new Error('TWILIO_PHONE_NUMBER is not set');

  const link = `${APP_URL}/delivered/${message.delivery_token}`;
  const body = `you have a message from ${senderFirstName || 'someone'}. read it here: ${link}`;

  return client.messages.create({
    from,
    to: message.recipient_phone,
    body,
  });
}
