import twilio from 'twilio';

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.TWILIO_PHONE_NUMBER;

/**
 * Sends a scheduled Everly message via SMS.
 *
 * @param {object} message  - row from the messages table
 * @param {string} senderFirstName - first name of the message author
 * @returns Twilio message resource
 */
export async function sendDeliverySms(message, senderFirstName) {
  if (!accountSid || !authToken || !fromNumber) {
    throw new Error(
      'Twilio env vars missing: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_PHONE_NUMBER'
    );
  }

  if (!message.recipient_phone) {
    throw new Error(`Message ${message.id} has no recipient_phone`);
  }

  const client = twilio(accountSid, authToken);

  // Format the recipient's phone number — ensure it has a + prefix
  const to = message.recipient_phone.startsWith('+')
    ? message.recipient_phone
    : `+${message.recipient_phone}`;

  // Build the SMS body
  // SMS has a 160-char limit per segment; we keep the header short
  // and truncate the message body if needed to stay within 2 segments (320 chars)
  const sender = senderFirstName || 'someone you know';
  const recipient = message.recipient_name || '';
  const greeting = recipient ? `hi ${recipient},` : 'hi,';
  const link = `https://app.everly.ink/delivered/${message.delivery_token}`;
  const header = `${greeting}\n\n${sender} wrote you a message and asked everly to deliver it today.\n\n`;
  const footer = `\n\nread it here: ${link}`;

  const maxBody = 320 - header.length - footer.length;
  const bodyText =
    message.body.length > maxBody
      ? message.body.slice(0, maxBody - 1) + '…'
      : message.body;

  const fullText = `${header}${bodyText}${footer}`;

  const result = await client.messages.create({
    body: fullText,
    from: fromNumber,
    to,
  });

  return {
    sid: result.sid,
    status: result.status,
    to: result.to,
  };
}
