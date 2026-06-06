import React from "react";
import {
  LegalList,
  LegalPageLayout,
  LegalSection,
  LegalSupportLink,
} from "../components/legal/LegalPageLayout";
import {
  ARBITRATION_BODY,
  BLOCKCHAIN_NETWORK,
  COMPANY_LEGAL_NAME,
  GOVERNING_LAW_STATE,
  INTERFACE_NAME,
  MIN_AGE_TEXT,
  PAYMENT_TOKEN,
  SITE_URL,
} from "../lib/legalPlaceholders";

export const TermsOfService: React.FC = () => {
  return (
    <LegalPageLayout title="Terms of Service">
      <LegalSection title="1. Acceptance of Terms">
        <p>
          These Terms of Service (&quot;Terms&quot;) govern your access to and use of the{" "}
          {INTERFACE_NAME} (&quot;Interface&quot;) operated by {COMPANY_LEGAL_NAME} (the
          &quot;Company&quot; or &quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) and associated
          applications, smart contracts, and related services (the &quot;Protocol&quot;) that may
          be made accessible through the Interface (collectively, the &quot;Platform&quot;). The
          Interface is not the exclusive means of access to the Protocol.
        </p>
        <p>
          By using the Interface to access the Protocol, connecting a cryptocurrency wallet,
          creating or joining a contest, or otherwise interacting with the Platform, you acknowledge
          that you have read, understood, and agree to be bound by these Terms. If you do not agree
          to these Terms, you must not use the Interface to access the Protocol or in any way use
          the Platform.
        </p>
        <p>
          These Terms constitute a legally binding agreement between you and the Company. You
          represent and warrant that you have the legal capacity and authority to enter into this
          agreement. If you are using the Interface to access the Protocol on behalf of an
          organization, you represent that you have authority to bind that organization to these
          Terms.
        </p>
      </LegalSection>

      <LegalSection title="2. Platform Overview">
        <p>
          The Company provides a website interface that enables users to access a smart contract
          protocol whereby they can create, manage, and participate in fantasy sports contests and
          related Winner Pool markets. The Protocol facilitates peer-to-peer interactions through
          smart contracts deployed on blockchain networks.
        </p>
        <p>
          <strong>Important:</strong> The Company is a technology provider. We provide the software
          infrastructure and user interface that allows users to interact with smart contracts. Any
          action undertaken by a user via the smart contracts, including the creation of contests
          or leagues, are created by users (&quot;Contest Creators&quot;), not by the Company. We do
          not operate, manage, or control individual contests, and we do not determine contest
          rules, entry requirements, or distributions—those are established by Contest Creators and
          enforced by smart contracts.
        </p>
        <p>
          The Platform does not constitute a gambling, gaming, or betting service operated by the
          Company. We do not accept wagers, hold stakes, or determine outcomes. All contest mechanics
          are executed by autonomous smart contracts based on predefined rules and external data
          sources.
        </p>
      </LegalSection>

      <LegalSection title="3. Eligibility and Jurisdiction">
        <p>
          To use the Interface to access the Protocol or in any way use the Platform, you must be
          at least {MIN_AGE_TEXT}. By using the Platform, you represent and warrant that you meet
          these age requirements.
        </p>
        <p>
          <strong>Jurisdictional Restrictions:</strong> You are solely responsible for determining
          whether your use of the Platform complies with all applicable laws, regulations, and rules
          in your jurisdiction.
        </p>
        <p>
          The Interface is not available to residents of jurisdictions where such services are
          prohibited. We reserve the right to restrict access to the Interface from certain
          jurisdictions at our sole discretion.
        </p>
        <p>You acknowledge and agree that:</p>
        <LegalList
          items={[
            "It is your responsibility to ensure compliance with local laws before using the Interface to access the Protocol",
            "The Company does not provide legal advice regarding the legality of using the Interface to access the Protocol in your jurisdiction",
            "Your use of the Platform where prohibited may result in civil or criminal penalties",
            "The Company may cooperate with law enforcement or regulatory authorities as required by applicable law",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Accounts and Wallets">
        <p>
          To access certain features of the Protocol, you must connect a compatible cryptocurrency
          wallet. You may use a wallet created through a third-party provider Privy, or connect your
          own external wallet (&quot;BYO Wallet&quot;).
        </p>
        <p>
          <strong>Account Security:</strong> You are solely responsible for:
        </p>
        <LegalList
          items={[
            "Maintaining the confidentiality and security of your wallet credentials, private keys, seed phrases, and any authentication methods",
            "All activities that occur through your wallet or account, whether or not authorized by you",
            "Ensuring the security of any devices used to access the Platform",
          ]}
        />
        <p>
          <strong>Lost Access:</strong> The Company does not have access to your private keys, seed
          phrases, or wallet credentials. If you lose access to your wallet, we cannot recover your
          funds or restore access to your account. You acknowledge that lost wallet access may result
          in permanent loss of any associated digital assets.
        </p>
        <p>
          <strong>Account Termination:</strong> We reserve the right to suspend or terminate your
          access to the Interface at any time, with or without cause, and with or without notice,
          particularly if we reasonably believe you have violated these Terms or applicable law.
        </p>
      </LegalSection>

      <LegalSection title="5. Non-Custodial Nature; No Custody of Funds">
        <p>
          The Company is a software provider and operates on a strictly non-custodial basis. This is
          a fundamental aspect of the Interface that you must understand and accept before using our
          services:
        </p>
        <LegalList
          items={[
            <>
              <strong>No Custody:</strong> The Company does not hold, control, manage, or have access
              to your cryptocurrency or digital assets at any time
            </>,
            <>
              <strong>No Wallet Control:</strong> We do not control your wallet, private keys, or seed
              phrases, and we cannot execute transactions on your behalf
            </>,
            <>
              <strong>Smart Contracts:</strong> When you participate in any activity enabled by the
              Protocol, your digital assets are deployed by you onto autonomous smart contracts
              deployed on the blockchain and the Company has no custody or control of your digital
              assets at any time in the process
            </>,
            <>
              <strong>Direct Transactions:</strong> All transactions occur directly between your wallet
              and the relevant smart contracts on the blockchain
            </>,
            <>
              <strong>No Recovery:</strong> We cannot reverse, cancel, or modify blockchain
              transactions, nor can we recover funds sent to incorrect addresses or lost due to user
              error
            </>,
          ]}
        />
        <p>
          You acknowledge that you are interacting directly with blockchain-based smart contracts and
          that the Company serves only as a software interface to facilitate such interactions. The
          non-custodial nature of the Interface means you retain full control—and full
          responsibility—for your digital assets at all times.
        </p>
      </LegalSection>

      <LegalSection title="6. Contest Creators and Rules">
        <p>
          Activities on the Protocol are created by users (&quot;Contest Creators&quot;), not by the
          Company. Contest Creators establish the rules, parameters, and entry requirements for their
          contests.
        </p>
        <p>
          <strong>Contest Creator Responsibilities:</strong> Contest Creators are solely responsible
          for:
        </p>
        <LegalList
          items={[
            "Ensuring their created activities comply with all applicable laws and regulations",
            "Setting fair and clearly communicated rules for their activity",
            "Any representations made about their activity to potential participants",
            "Disputes arising from their activity rules or administration",
          ]}
        />
        <p>
          <strong>Participant Acknowledgments:</strong> By participating in an activity, you
          acknowledge that:
        </p>
        <LegalList
          items={[
            "The Company does not endorse, verify, or guarantee any activity or Contest Creator",
            "Rules are determined by the Contest Creator and enforced by smart contracts",
            "The Company is not responsible for disputes between Contest Creators and participants",
            "You should review rules carefully before participating",
            "Outcomes are determined by smart contract logic and external data sources, not by the Company",
          ]}
        />
        <p>
          The Company reserves the right, but has no obligation, to restrict access via the Interface
          to activities that we believe, in our sole discretion, violate these Terms or applicable
          law.
        </p>
      </LegalSection>

      <LegalSection title="7. Fees">
        <p>Your use of the Platform may be subject to fees, including but not limited to:</p>
        <LegalList
          items={[
            <>
              <strong>No Platform Fees:</strong> {COMPANY_LEGAL_NAME} does not charge platform fees
              for use of the Interface
            </>,
            <>
              <strong>Oracle Fees:</strong> A portion of contest deposits may be allocated to the
              contest oracle as disclosed in the contest smart contract
            </>,
            <>
              <strong>Referral Network Allocation:</strong> A portion of each contest pot (typically
              around 7%) may be allocated to the invite/referral network at settlement, as enforced by
              smart contracts
            </>,
            <>
              <strong>Network Fees:</strong> Blockchain transaction fees (commonly called &quot;gas
              fees&quot;) paid to network validators on {BLOCKCHAIN_NETWORK}, which are separate from
              and not controlled by the Company
            </>,
            <>
              <strong>Third-Party Fees:</strong> Fees charged by third-party service providers (such as
              onramp/offramp services)
            </>,
          ]}
        />
        <p>
          Where feasible and within the control of the Company, applicable fees will be disclosed to
          you before you confirm a transaction. By confirming a transaction, you agree to pay all
          associated fees. Fees paid are non-refundable unless otherwise stated or required by
          applicable law.
        </p>
        <p>
          Contest entry and Winner Pool participation use {PAYMENT_TOKEN} and other digital assets as
          configured per contest. We reserve the right to modify fee disclosures in these Terms when
          material changes occur.
        </p>
      </LegalSection>

      <LegalSection title="8. Third-Party Services">
        <p>
          The Interface may integrate with or provide access to third-party services, networks, or
          applications, including but not limited to:
        </p>
        <LegalList
          items={[
            "Fiat Onramp/Offramp Providers: Services that allow you to convert between fiat currency and cryptocurrency",
            "Wallet Providers: Including Privy and other compatible wallet services",
            `Blockchain Networks: The underlying blockchain infrastructure on ${BLOCKCHAIN_NETWORK} on which smart contracts operate`,
            "Data Providers: Third-party sources of data used to determine activity outcomes",
            "Analytics Services: Tools used to improve Platform functionality and user experience",
          ]}
        />
        <p>
          <strong>Third-Party Terms:</strong> Your use of third-party services is subject to those
          providers&apos; own terms of service, privacy policies, and other agreements. The Company
          is not a party to those agreements and is not responsible for the acts or omissions of
          third-party service providers.
        </p>
        <p>
          The Company does not endorse, guarantee, or assume responsibility for the accuracy,
          reliability, availability, or security of any third-party services. Your use of third-party
          services is at your own risk.
        </p>
      </LegalSection>

      <LegalSection title="9. Smart Contract and Blockchain Risks">
        <p>
          By using the Platform, you acknowledge and accept the inherent risks associated with
          blockchain technology and smart contracts:
        </p>
        <LegalList
          items={[
            "Smart Contract Risk: Smart contracts are autonomous software programs and have inherent risks including but not limited to bugs, vulnerabilities, or exploits. Smart contract failures could result in complete and total loss of funds",
            "Blockchain Risk: Blockchain networks may experience congestion, forks, reorganizations, or other disruptions that could affect transactions or smart contract execution",
            "Irreversibility: Blockchain transactions are generally irreversible. Errors in transaction execution, including sending funds to incorrect addresses, cannot be undone",
            "Regulatory Risk: The regulatory status of blockchain technology and digital assets is evolving. Future regulations could affect the Platform or your ability to use the Interface",
            "Price Volatility: Cryptocurrency values can fluctuate significantly. Stablecoins may depeg from their intended value. The value of your digital assets may decrease substantially and result in total loss of funds",
            "Network Fees: Blockchain network fees are variable and can increase significantly during periods of high demand",
            "Technology Risk: Advances in technology, including cryptographic algorithms, could compromise the security of blockchain systems",
          ]}
        />
        <p>
          You acknowledge that you have sufficient knowledge and experience to evaluate the risks of
          using blockchain-based services and that you accept full responsibility for such risks.
        </p>
      </LegalSection>

      <LegalSection title="10. Prohibited Uses">
        <p>You agree not to use the Platform to:</p>
        <LegalList
          items={[
            "Violate any applicable law, regulation, or rule",
            "Engage in money laundering, terrorist financing, or other financial crimes",
            "Circumvent geographic restrictions or access the Platform from prohibited jurisdictions",
            "Create activities that violate applicable law or these Terms",
            "Manipulate activity outcomes, collude with other users, or engage in any form of fraud",
            "Exploit bugs, vulnerabilities, or errors in the Platform or smart contracts",
            "Use automated systems, bots, or scripts without explicit authorization",
            "Attempt to gain unauthorized access to the Platform, other users' accounts, or related systems",
            "Interfere with or disrupt the Platform or servers/networks connected to the Platform",
            "Infringe upon the intellectual property rights of the Company or third parties",
            "Harass, abuse, or harm other users",
            "Create multiple accounts to circumvent restrictions or manipulate the Platform",
            "Provide false, inaccurate, or misleading information",
          ]}
        />
        <p>
          Violation of these prohibitions may result in immediate termination of your access to the
          Platform and may be reported to appropriate authorities.
        </p>
      </LegalSection>

      <LegalSection title="11. Intellectual Property">
        <p>
          The Interface, including its design, text, graphics, logos, icons, images, audio clips,
          software, and other content, is owned by the Company or its licensors and is protected by
          copyright, trademark, and other intellectual property laws.
        </p>
        <p>
          <strong>Limited License:</strong> Subject to your compliance with these Terms, we grant you
          a limited, non-exclusive, non-transferable, revocable license to use the Interface for your
          personal, non-commercial use.
        </p>
        <p>
          <strong>Restrictions:</strong> You may not copy, modify, distribute, sell, or lease any
          part of the Platform; reverse engineer or attempt to extract the source code of the
          Platform (except as permitted by law); remove, alter, or obscure any proprietary notices;
          or use the Company name, logo, or trademarks without prior written consent.
        </p>
        <p>
          <strong>User Content:</strong> You retain ownership of content you submit to the Interface.
          By submitting content, you grant the Company a worldwide, non-exclusive, royalty-free
          license to use, reproduce, modify, and display such content in connection with operating
          the Interface.
        </p>
      </LegalSection>

      <LegalSection title="12. Disclaimer of Warranties">
        <p className="font-semibold uppercase">
          THE PLATFORM IS PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT
          WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY.
        </p>
        <p className="font-semibold uppercase">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE COMPANY EXPRESSLY DISCLAIMS ALL
          WARRANTIES, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR
          A PARTICULAR PURPOSE, AND NON-INFRINGEMENT; WARRANTIES THAT THE PLATFORM WILL BE
          UNINTERRUPTED, TIMELY, SECURE, OR ERROR-FREE; WARRANTIES REGARDING THE ACCURACY,
          RELIABILITY, OR COMPLETENESS OF ANY INFORMATION ON THE PLATFORM; WARRANTIES THAT DEFECTS
          WILL BE CORRECTED OR THAT THE PLATFORM IS FREE OF VIRUSES OR OTHER HARMFUL COMPONENTS;
          WARRANTIES REGARDING THE PERFORMANCE OR SECURITY OF SMART CONTRACTS; AND WARRANTIES
          REGARDING THE ACTIONS OF THIRD-PARTY SERVICE PROVIDERS.
        </p>
        <p>
          YOU ACKNOWLEDGE THAT YOUR USE OF THE INTERFACE TO ACCESS THE PROTOCOL IS AT YOUR SOLE RISK.
          SOME JURISDICTIONS DO NOT ALLOW THE EXCLUSION OF IMPLIED WARRANTIES, SO SOME OF THE ABOVE
          EXCLUSIONS MAY NOT APPLY TO YOU.
        </p>
      </LegalSection>

      <LegalSection title="13. Limitation of Liability">
        <p className="font-semibold uppercase">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL THE COMPANY, ITS
          AFFILIATES, OFFICERS, DIRECTORS, EMPLOYEES, AGENTS, OR LICENSORS BE LIABLE FOR ANY
          INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, PUNITIVE, OR EXEMPLARY DAMAGES; LOSS OF
          DIGITAL ASSETS, PROFITS, REVENUE, DATA, USE, GOODWILL, OR OTHER INTANGIBLE LOSSES; DAMAGES
          RESULTING FROM YOUR USE OF OR INABILITY TO USE THE INTERFACE TO ACCESS THE PROTOCOL; DAMAGES
          RESULTING FROM ANY CONDUCT OR CONTENT OF ANY THIRD PARTY ON THE PLATFORM; DAMAGES RESULTING
          FROM SMART CONTRACT FAILURES, BUGS, OR EXPLOITS; DAMAGES RESULTING FROM UNAUTHORIZED ACCESS
          TO YOUR WALLET OR ACCOUNT; DAMAGES RESULTING FROM BLOCKCHAIN NETWORK DISRUPTIONS OR
          FAILURES; OR DAMAGES RESULTING FROM ACTIONS OF THIRD-PARTY SERVICE PROVIDERS.
        </p>
        <p className="font-semibold uppercase">
          IN NO EVENT SHALL OUR TOTAL LIABILITY TO YOU FOR ALL CLAIMS ARISING FROM OR RELATED TO
          THESE TERMS OR THE PLATFORM EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID TO THE COMPANY IN
          FEES DURING THE TWELVE (12) MONTHS PRECEDING THE CLAIM, OR (B) ONE HUNDRED U.S. DOLLARS
          ($100).
        </p>
        <p>
          SOME JURISDICTIONS DO NOT ALLOW THE LIMITATION OR EXCLUSION OF LIABILITY FOR CERTAIN
          DAMAGES, SO SOME OF THE ABOVE LIMITATIONS MAY NOT APPLY TO YOU.
        </p>
      </LegalSection>

      <LegalSection title="14. Indemnification">
        <p>
          You agree to indemnify, defend, and hold harmless the Company, its affiliates, officers,
          directors, employees, agents, and licensors from and against any and all claims, damages,
          losses, liabilities, costs, and expenses (including reasonable attorneys&apos; fees) arising
          from or related to:
        </p>
        <LegalList
          items={[
            "Your use of the Interface to access the Protocol",
            "Your violation of these Terms",
            "Your violation of any applicable law or regulation",
            "Your violation of any rights of a third party",
            "Activities you create and any disputes with participants",
            "Content you submit to the Interface",
            "Any negligent or wrongful conduct by you",
          ]}
        />
        <p>
          We reserve the right to assume the exclusive defense and control of any matter subject to
          indemnification by you, in which event you will cooperate with us in asserting any available
          defenses.
        </p>
      </LegalSection>

      <LegalSection title="15. Dispute Resolution and Governing Law">
        <p>
          <strong>Governing Law:</strong> These Terms shall be governed by and construed in
          accordance with the laws of the State of {GOVERNING_LAW_STATE}, without regard to its
          conflict of law provisions. You hereby irrevocably submit to the exclusive jurisdiction of
          the state and federal courts located within the State of {GOVERNING_LAW_STATE} for the
          resolution of any dispute arising out of or relating to this Agreement and agree not to
          commence any such action except in such courts. You waive any objection to venue or any
          claim that such courts constitute an inconvenient forum.
        </p>
        <p>
          <strong>Informal Resolution:</strong> Before initiating any formal dispute resolution
          process, you agree to first contact us at <LegalSupportLink /> to attempt to resolve any
          dispute informally. We will attempt to resolve disputes within thirty (30) days of receiving
          notice.
        </p>
        <p>
          <strong>Binding Arbitration:</strong> Any dispute, claim, or controversy arising out of or
          relating to this Agreement or the breach, termination, enforcement, interpretation, or
          validity thereof shall be resolved exclusively by final and binding arbitration administered
          by the {ARBITRATION_BODY} (&quot;AAA&quot;) in accordance with its Commercial Arbitration
          Rules then in effect. The arbitration shall be conducted in {GOVERNING_LAW_STATE}, New York
          by a single arbitrator. Judgment on the award rendered by the arbitrator may be entered in
          any court having jurisdiction thereof. Each party hereby irrevocably waives any right to a
          trial by jury in any proceeding arising out of or relating to this Agreement.
          Notwithstanding the foregoing, the Company shall have the right to seek temporary,
          preliminary, or permanent injunctive relief in any court of competent jurisdiction to
          prevent or remedy any breach of the provisions of these Terms.
        </p>
        <p className="font-semibold uppercase">
          Class Action Waiver: TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, YOU AND THE COMPANY
          AGREE THAT EACH PARTY MAY BRING CLAIMS AGAINST THE OTHER ONLY IN YOUR OR ITS INDIVIDUAL
          CAPACITY AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS OR REPRESENTATIVE
          PROCEEDING.
        </p>
      </LegalSection>

      <LegalSection title="16. Changes to Terms">
        <p>
          We reserve the right to modify these Terms at any time. When we make material changes, we
          will notify you by posting the updated Terms on the Interface with a new &quot;Last
          Updated&quot; date.
        </p>
        <p>
          Your continued use of the Interface to access the Protocol after the effective date of any
          changes constitutes your acceptance of the modified Terms. If you do not agree to the
          modified Terms, you must stop using the Interface.
        </p>
        <p>We encourage you to review these Terms periodically for any updates.</p>
      </LegalSection>

      <LegalSection title="17. Contact Information">
        <p>
          If you have any questions, concerns, or feedback regarding these Terms of Service or the
          Platform, please contact us at <LegalSupportLink /> or visit{" "}
          <a href={SITE_URL} className="text-blue-600 hover:underline">
            {SITE_URL.replace("https://", "")}
          </a>
          .
        </p>
        <p>
          By using the Company Interface and accessing the Protocol, you acknowledge that you have
          read, understood, and agree to be bound by these Terms of Service.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
};
