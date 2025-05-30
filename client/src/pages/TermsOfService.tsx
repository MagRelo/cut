import React from 'react';

export const TermsOfService: React.FC = () => {
  return (
    <div className='container mx-auto px-4 py-8 max-w-4xl'>
      <h1 className='text-3xl font-bold mb-6'>
        Terms of Use for the Cut Website
      </h1>

      <section className='mb-6'>
        <h2 className='text-2xl font-semibold mb-4'>
          Introduction and Acceptance
        </h2>
        <p>
          By accessing or using the Cut website (the "Service"), you agree to be
          bound by these Terms of Use ("Terms"). If you do not agree with any
          part of these Terms, you must not use the Service.
        </p>
      </section>

      <section className='mb-6'>
        <h2 className='text-2xl font-semibold mb-4'>Eligibility</h2>
        <p>
          You must be at least 13 years of age to use the Service. If you are
          under 18, you must have the consent of a parent or legal guardian.
        </p>
      </section>

      <section className='mb-6'>
        <h2 className='text-2xl font-semibold mb-4'>
          User Information and Consent
        </h2>
        <ul className='list-disc pl-6 space-y-2'>
          <li>
            <strong>Phone Numbers and Email Addresses:</strong> By providing
            your phone number or email address, you consent to receive
            notifications and communications from us, including but not limited
            to updates, alerts, and promotional messages.
          </li>
          <li>
            <strong>Opt-In Consent:</strong> You will be given the option to
            opt-in to receive notifications via SMS and/or email. You may opt
            out at any time by following the instructions provided in our
            communications or by contacting us directly.
          </li>
          <li>
            <strong>Data Use:</strong> Your phone number and email address will
            be used solely for the purpose of providing the Service and sending
            notifications as requested by you.
          </li>
        </ul>
      </section>

      <section className='mb-6'>
        <h2 className='text-2xl font-semibold mb-4'>Notification Practices</h2>
        <ul className='list-disc pl-6 space-y-2'>
          <li>
            <strong>SMS Notifications:</strong> Message and data rates may
            apply. You can opt out of SMS notifications at any time by updating
            your user preferences, or replying STOP to any message. For help,
            reply HELP.
          </li>
          <li>
            <strong>Email Notifications:</strong> You can unsubscribe from email
            notifications by updating your user preferences.
          </li>
          <li>
            <strong>Frequency:</strong> The frequency of notifications will be
            disclosed at the time of opt-in and may vary depending on the
            features you select.
          </li>
        </ul>
      </section>

      <section className='mb-6'>
        <h2 className='text-2xl font-semibold mb-4'>Privacy Policy</h2>
        <p>
          Your use of the Service is also governed by our Privacy Policy, which
          explains how we collect, use, and protect your personal information.
          The Privacy Policy is a separate document and is available on our
          website.
        </p>
      </section>

      <section className='mb-6'>
        <h2 className='text-2xl font-semibold mb-4'>Changes to Terms</h2>
        <p>
          We reserve the right to modify these Terms at any time. If we make
          significant changes, we will notify you via email or through the
          Service. Your continued use of the Service after such changes
          constitutes your acceptance of the new Terms.
        </p>
      </section>

      <section className='mb-6'>
        <h2 className='text-2xl font-semibold mb-4'>Limitation of Liability</h2>
        <p>
          The Service is provided "as is" and "as available." We do not
          guarantee that the Service will be uninterrupted or error-free. To the
          fullest extent permitted by law, we disclaim all liability for any
          loss or damage arising from your use of the Service.
        </p>
      </section>

      <section className='mb-6'>
        <h2 className='text-2xl font-semibold mb-4'>Contact Information</h2>
        <p>
          If you have any questions about these Terms, please contact us at the
          following address:
        </p>
        <p className='mt-2'>
          <a href='mailto:support@cut.com'>support@cut.com</a>
        </p>
      </section>

      {/* <footer className='text-sm text-gray-600 mt-8'>
        <p>
          This is a simplified, generic template. For legal compliance, consult
          with a legal professional to ensure the terms meet all applicable laws
          and regulations.
        </p>
      </footer> */}
    </div>
  );
};
