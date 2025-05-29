import twilio from 'twilio';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Twilio client
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER;

if (!accountSid || !authToken || !twilioPhoneNumber) {
  throw new Error('Missing required Twilio environment variables');
}

const twilioClient = twilio(accountSid, authToken);

interface SendSMSOptions {
  to: string;
  body: string;
}

/**
 * Sends an SMS message using Twilio
 * @param options - The SMS options including recipient and message body
 * @returns Promise with the message SID if successful
 * @throws Error if the message fails to send
 */
export async function sendSMS({ to, body }: SendSMSOptions): Promise<string> {
  console.log('Sending SMS to:', to);

  try {
    const message = await twilioClient.messages.create({
      body,
      to,
      from: twilioPhoneNumber,
    });

    console.log('SMS sent:', message.sid, message.status);

    return message.sid;
  } catch (error) {
    console.error('Failed to send SMS:', error);
    throw new Error('Failed to send SMS message');
  }
}

/**
 * Validates a phone number format
 * @param phoneNumber - The phone number to validate
 * @returns boolean indicating if the phone number is valid
 */
export function isValidPhoneNumber(phoneNumber: string): boolean {
  // Basic E.164 format validation (e.g., +12345678900)
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  return phoneRegex.test(phoneNumber);
}
