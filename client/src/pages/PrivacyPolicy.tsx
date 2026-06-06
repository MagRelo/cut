import React from "react";
import {
  LegalList,
  LegalPageLayout,
  LegalSection,
  LegalSubsection,
  LegalSupportLink,
} from "../components/legal/LegalPageLayout";
import { COMPANY_LEGAL_NAME, INTERFACE_NAME, MIN_AGE } from "../lib/legalPlaceholders";

export const PrivacyPolicy: React.FC = () => {
  return (
    <LegalPageLayout title="Privacy Policy">
      <LegalSection title="1. Introduction">
        <p>
          {COMPANY_LEGAL_NAME} (the &quot;Company,&quot; &quot;we,&quot; &quot;us,&quot; or
          &quot;our&quot;) operates a non-custodial website interface (&quot;Interface&quot;) that
          enables users to create and participate in various activities through blockchain-based smart
          contracts (the &quot;Protocol&quot;). This Privacy Policy explains what information we
          collect, how we use it, and your choices regarding your data.
        </p>
        <p>
          By using the Interface to access the Protocol, you acknowledge that you have read and
          understood this Privacy Policy. If you do not agree with our practices, please do not use
          the Interface.
        </p>
      </LegalSection>

      <LegalSection title="2. Information We Collect">
        <LegalSubsection title="2.1 Information You Provide Directly">
          <LegalList
            items={[
              <>
                <strong>Email Address:</strong> If you sign in, subscribe to updates, or contact
                support, we collect your email address
              </>,
              <>
                <strong>Support Communications:</strong> When you contact us for support, we collect
                the information you provide in your messages
              </>,
              <>
                <strong>Profile Information:</strong> Optional display name or username you may set
                within the Interface
              </>,
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="2.2 Information Collected Through Wallet Connection">
          <LegalList
            items={[
              <>
                <strong>Public Wallet Address:</strong> When you connect a wallet, we can see your
                public wallet address (this is inherently public on the blockchain)
              </>,
              <>
                <strong>Transaction Metadata:</strong> We may access publicly available on-chain
                transaction data related to your interactions with the Protocol&apos;s smart contracts
              </>,
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="2.3 Information Collected Automatically">
          <LegalList
            items={[
              "Device and Browser Information: Browser type, operating system, device type, and screen resolution",
              "Usage Data: Pages visited, features used, clicks, and time spent on the Interface",
              "IP Address: Your IP address, which may indicate approximate geographic location",
              "Cookies and Similar Technologies: See Section 7 below for details",
            ]}
          />
        </LegalSubsection>

        <LegalSubsection title="2.4 Information We Do NOT Collect">
          <p>
            <strong>Important:</strong> We never collect, store, or have access to:
          </p>
          <LegalList
            items={[
              <>
                <strong>Private Keys or Seed Phrases:</strong> We never collect, store, or have access
                to your wallet&apos;s private keys, seed phrases, or passwords
              </>,
              <>
                <strong>Wallet Control:</strong> We do not control your wallet. You retain sole custody
                of your digital assets at all times
              </>,
              <>
                <strong>Sensitive Financial Information:</strong> We do not collect bank account
                numbers, credit card numbers, or similar traditional financial data (any fiat
                onramp/offramp is handled by third-party providers)
              </>,
            ]}
          />
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="3. How We May Use Your Information">
        <p>We may use the information we collect for the following purposes:</p>
        <LegalList
          items={[
            "Operate and Maintain the Interface: Display your activity related to the Protocol on the Interface",
            "Improve the Platform: Analyze usage patterns to enhance features, fix bugs, and improve user experience",
            "Communicate with You: Respond to support requests, send service announcements, and (if you opted in) notify you about contests or features",
            "Security and Fraud Prevention: Detect and prevent fraudulent activity, abuse, or violations of our Terms of Service",
            "Legal Compliance: Comply with applicable laws, regulations, and legal processes",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Information Sharing">
        <p>We may share your information with the following categories of recipients:</p>
        <LegalSubsection title="4.1 Service Providers">
          <LegalList
            items={[
              "Hosting and Infrastructure: Cloud providers that host the Interface or relate to the Protocol",
              "Analytics Providers: Services that help us understand Interface and/or Protocol usage",
              "Wallet Providers: Third-party vendors including Privy that facilitate wallet creation and authentication",
              "Fiat Onramp/Offramp Providers: Third-party services that enable cryptocurrency purchases (they have their own privacy policies)",
            ]}
          />
        </LegalSubsection>
        <LegalSubsection title="4.2 Legal and Safety Disclosures">
          <p>We may disclose your information if we believe it is necessary to:</p>
          <LegalList
            items={[
              "Comply with applicable laws, regulations, or legal processes",
              "Respond to lawful requests from law enforcement or government authorities",
              "Protect the rights, property, or safety of the Company, our users, or others",
              "Enforce our Terms of Service or investigate potential violations",
            ]}
          />
        </LegalSubsection>
        <LegalSubsection title="4.3 Business Transfers">
          <p>
            If the Company is involved in a merger, acquisition, or sale of assets, your information
            may be transferred as part of that transaction. We will notify you of any such change and
            any choices you may have.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="5. Blockchain and Public Data">
        <p>Please understand the nature of blockchain technology:</p>
        <LegalList
          items={[
            "Public Transactions: Transactions on blockchain networks are public and permanent. Your wallet address and transaction history are visible to anyone and cannot be deleted",
            "No Control Over Blockchain: We do not control blockchain networks and cannot modify, delete, or hide on-chain data",
            "Pseudonymity, Not Anonymity: While wallet addresses are pseudonymous, they can potentially be linked to your identity through various means",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Data Retention">
        <p>We retain your information for as long as reasonably necessary to:</p>
        <LegalList
          items={[
            "Fulfill the purposes described in this policy",
            "Comply with legal obligations (such as tax or record-keeping requirements)",
            "Resolve disputes and enforce our agreements",
          ]}
        />
        <p>
          <strong>Deletion Requests:</strong> You may request deletion of your personal data (such as
          email address or profile information) by contacting us at <LegalSupportLink />. Note that
          on-chain data (wallet addresses, transactions) cannot be deleted as it exists on the public
          blockchain, not on our servers.
        </p>
      </LegalSection>

      <LegalSection title="7. Cookies and Analytics">
        <LegalSubsection title="7.1 What Are Cookies?">
          <p>
            Cookies are small text files stored on your device when you visit a website. We use cookies
            and similar technologies (such as local storage) to operate and improve the Interface.
          </p>
        </LegalSubsection>
        <LegalSubsection title="7.2 How We Use Cookies">
          <LegalList
            items={[
              "Essential Cookies: Required for the Interface to function (e.g., maintaining your session, remembering wallet connection)",
              "Analytics Cookies: Help us understand how users interact with the Interface so we can improve it",
              "Preference Cookies: Remember your settings and preferences",
            ]}
          />
        </LegalSubsection>
        <LegalSubsection title="7.3 Your Choices">
          <p>You can control cookies through your browser settings:</p>
          <LegalList
            items={[
              "Most browsers allow you to block or delete cookies",
              "You can set your browser to warn you before accepting cookies",
              "Note that disabling certain cookies may affect Interface functionality (e.g., you may need to reconnect your wallet more frequently)",
            ]}
          />
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="8. Data Security">
        <p>
          We implement reasonable technical and organizational measures to protect your information,
          including:
        </p>
        <LegalList
          items={[
            "Encryption of data in transit (HTTPS)",
            "Access controls limiting who can access user data",
            "Regular review of our security practices",
          ]}
        />
        <p>
          <strong>No Guarantees:</strong> While we strive to protect your information, no method of
          transmission over the Internet or electronic storage is completely secure. We cannot
          guarantee absolute security and you use the Interface and access the Protocol at your own
          risk.
        </p>
      </LegalSection>

      <LegalSection title="9. Children's Privacy">
        <p>
          The Interface and Protocol are not intended for individuals under {MIN_AGE} years of age. We
          do not knowingly collect personal information from children. If you are a parent or guardian
          and believe your child has provided us with personal information, please contact us at{" "}
          <LegalSupportLink /> and we will take steps to delete such information.
        </p>
      </LegalSection>

      <LegalSection title="10. Your Rights">
        <p>
          Depending on your jurisdiction, you may have certain rights regarding your personal data,
          including access, correction, deletion (subject to legal retention requirements and
          blockchain limitations), and objection to certain processing.
        </p>
        <p>
          To exercise these rights, please contact us at <LegalSupportLink />. We will respond to your
          request within a reasonable timeframe.
        </p>
      </LegalSection>

      <LegalSection title="11. Third-Party Links and Services">
        <p>
          The Interface may contain links to third-party websites or integrate with third-party
          services. This Privacy Policy applies only to the Company. We are not responsible for the
          privacy practices of third parties. We encourage you to review the privacy policies of any
          third-party services you use.
        </p>
      </LegalSection>

      <LegalSection title="12. Changes to This Privacy Policy">
        <p>
          We may update this Privacy Policy from time to time to reflect changes in our practices or
          for legal, operational, or regulatory reasons. When we make changes, we will update the
          &quot;Last Updated&quot; date at the top of this page. Your continued use of the Interface
          after changes constitutes acceptance of the updated policy.
        </p>
        <p>We encourage you to review this Privacy Policy periodically.</p>
      </LegalSection>

      <LegalSection title="13. Contact Us">
        <p>
          If you have questions, concerns, or requests regarding this Privacy Policy or our data
          practices, please contact us at <LegalSupportLink />.
        </p>
        <p>
          By using the {INTERFACE_NAME}, you acknowledge that you have read and understood this
          Privacy Policy.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
};
