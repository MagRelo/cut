import sgMail from '@sendgrid/mail';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

sgMail.setApiKey(process.env.SENDGRID_API_KEY || '');

export const sendEmail = async ({ to, subject, html }: EmailOptions) => {
  // console.log('Sending email to:', to);

  try {
    const msg = {
      to,
      from: process.env.SENDGRID_FROM_EMAIL || '',
      subject,
      html,
    };

    await sgMail.send(msg);
    // console.log('Email sent:', result);
  } catch (error) {
    console.error('Failed to send email:', error);
    throw new Error('Failed to send email');
  }
};
