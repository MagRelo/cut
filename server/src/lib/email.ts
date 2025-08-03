import { MailerSend, EmailParams, Sender, Recipient } from 'mailersend';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const mailerSend = new MailerSend({
  apiKey: process.env.MAILERSEND_API_KEY || 'authorization@mattlovan.dev',
});

export const sendEmail = async ({ to, subject, html }: EmailOptions) => {
  // console.log('Sending email to:', to);

  try {
    const sentFrom = new Sender(
      process.env.MAILERSEND_FROM_EMAIL || '',
      process.env.MAILERSEND_FROM_NAME || 'Cut App'
    );

    const recipients = [
      new Recipient(to, to.split('@')[0]), // Use email prefix as name
    ];

    const emailParams = new EmailParams()
      .setFrom(sentFrom)
      .setTo(recipients)
      .setReplyTo(sentFrom)
      .setSubject(subject)
      .setHtml(html)
      .setText(html.replace(/<[^>]*>/g, '')); // Strip HTML tags for text version

    await mailerSend.email.send(emailParams);
    // console.log('Email sent successfully');
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email');
  }
};
