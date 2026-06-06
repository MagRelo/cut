import React from "react";
import { Link } from "react-router-dom";
import {
  LegalList,
  LegalPageLayout,
  LegalSection,
  LegalSubsection,
  LegalSupportLink,
} from "../components/legal/LegalPageLayout";
import {
  BLOCKCHAIN_NETWORK,
  BRAND_ABBREV,
  COMPANY_LEGAL_NAME,
  COMPANY_SHORT_NAME,
} from "../lib/legalPlaceholders";

export const Disclosures: React.FC = () => {
  return (
    <LegalPageLayout title="Disclosures and Risk Statement">
      <p className="mb-8 text-gray-700 leading-relaxed">
        {COMPANY_SHORT_NAME} (&quot;{BRAND_ABBREV}&quot;) provides software tools that enable users to
        interact with blockchain-based fantasy sports contests and Winner Pool markets. By using the
        Platform, you acknowledge that participation involves inherent risks, including but not limited
        to those described below. Please read this document carefully before using the Platform.
      </p>

      <LegalSection title="1. Non-Custodial Platform">
        <p>{COMPANY_SHORT_NAME} operates as a non-custodial platform. This means:</p>
        <LegalList
          items={[
            <>
              <strong>No Custody of Funds:</strong> {BRAND_ABBREV} does not hold, control, or have
              access to your cryptocurrency or digital assets at any time
            </>,
            <>
              <strong>Smart Contract Custody:</strong> When you participate in a contest, funds are held
              by autonomous smart contracts deployed on the blockchain—not by {BRAND_ABBREV}
            </>,
            <>
              <strong>User Responsibility:</strong> You are solely responsible for securing your wallet,
              private keys, and seed phrases. Lost access cannot be recovered by {BRAND_ABBREV}
            </>,
            <>
              <strong>Direct Interaction:</strong> All transactions occur directly between your wallet
              and blockchain smart contracts. {BRAND_ABBREV} provides the interface, not custody
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="2. Third-Party Providers">
        <p>The Platform integrates with various third-party services:</p>
        <LegalSubsection title="Fiat Onramp/Offramp Services">
          <p>
            If you use third-party services to convert between fiat currency and cryptocurrency, those
            providers may temporarily custody your funds during the conversion process. Such services
            operate under their own terms of service, privacy policies, and regulatory frameworks.{" "}
            {BRAND_ABBREV} is not a party to those transactions and is not responsible for any issues
            arising from your use of third-party onramp/offramp services.
          </p>
        </LegalSubsection>
        <p>
          Other third-party integrations include wallet providers (including Privy), blockchain
          networks, data providers, and analytics services. Each operates independently with their own
          terms and policies. {BRAND_ABBREV} does not guarantee the availability, accuracy, or security
          of any third-party service.
        </p>
      </LegalSection>

      <LegalSection title="3. Smart Contract Risk">
        <p>
          Contest mechanics are executed by smart contracts deployed on blockchain networks. Smart
          contracts carry inherent risks:
        </p>
        <LegalList
          items={[
            "Code Vulnerabilities: Despite security efforts, no software is completely free from bugs, vulnerabilities, or exploits. Smart contract failures could result in loss of funds",
            "Immutability: Once deployed, smart contracts generally cannot be modified. Bugs may not be fixable without migrating to new contracts",
            "Execution Risk: Smart contracts execute exactly as coded, which may produce unexpected results in edge cases",
            "Dependency Risk: Smart contracts may depend on external data sources (oracles) that could fail, be manipulated, or provide inaccurate data",
          ]}
        />
      </LegalSection>

      <LegalSection title="4. Blockchain and Network Risk">
        <p>Blockchain networks are decentralized systems with their own risks:</p>
        <LegalList
          items={[
            "Network Congestion: High transaction volumes may cause delays, failed transactions, or significantly increased gas fees",
            "Chain Reorganizations: Blockchain reorgs can reverse transactions that appeared to be confirmed, potentially affecting contest entries or outcomes",
            `Gas Fees: Transaction fees are variable and paid to network validators on ${BLOCKCHAIN_NETWORK}, not to ${BRAND_ABBREV}. Fees can spike unexpectedly during high-demand periods`,
            "Network Outages: Blockchain networks may experience downtime, forks, or other disruptions that could prevent transactions or affect smart contract execution",
            "Irreversibility: Blockchain transactions are generally permanent and irreversible. Errors cannot be undone",
          ]}
        />
      </LegalSection>

      <LegalSection title="5. Regulatory and Legal Risk">
        <p>
          The regulatory environment for blockchain technology and fantasy contests is evolving:
        </p>
        <LegalList
          items={[
            "Jurisdictional Restrictions: The legality of contests, cryptocurrency transactions, and related activities varies by jurisdiction. Some locations may prohibit or restrict such activities",
            "User Responsibility: You are solely responsible for determining whether your use of the Platform complies with applicable laws in your jurisdiction",
            "Future Regulation: New laws or regulations could affect the Platform's operations or your ability to use it",
            "No Legal Advice: We do not provide legal, tax, or regulatory advice. Consult qualified professionals for guidance on your specific situation",
          ]}
        />
      </LegalSection>

      <LegalSection title="6. Financial Risk">
        <p className="rounded-sm border border-amber-200 bg-amber-50 p-4 font-semibold text-amber-900">
          Important Warning: Participating in contests and Winner Pool markets involves financial risk.
          You may lose some or all of the funds you contribute. There are no guarantees of returns.
        </p>
        <LegalList
          items={[
            "Loss of Funds: Contest and Winner Pool participation may result in partial or total loss of contributed funds",
            "Price Volatility: Cryptocurrency values fluctuate significantly, affecting the real-world value of entries and any winnings",
            "No Guarantees: Past performance does not guarantee future results. We make no representations about potential outcomes",
            "Not Investment Advice: Nothing on the Platform constitutes investment, financial, or professional advice",
            <>
              Participate Responsibly: Only use funds you can afford to lose. See our{" "}
              <Link to="/responsible-gaming" className="text-blue-600 hover:underline">
                Responsible Participation
              </Link>{" "}
              page for guidance
            </>,
          ]}
        />
      </LegalSection>

      <LegalSection title="Full Risk Disclosure">
        <LegalSubsection title="1. Platform Architecture & Non-Custodial Nature">
          <p className="mb-4 font-medium text-gray-900">Non-Custodial Platform Disclosure</p>
          <p className="mb-4">
            The Platform is a non-custodial software interface that allows users to interact with
            blockchain-based smart contracts. We do not hold, store, or control user funds or private
            keys. Users retain sole custody and control of their digital assets at all times, except
            where users elect to use third-party on-ramp, off-ramp, or other custodial services.
          </p>
          <p className="mb-2 font-medium text-gray-900">Third-Party Custody Disclosure</p>
          <p>
            Users may elect to use third-party on-ramp and off-ramp service providers to convert fiat
            currency to digital assets and vice versa. These providers perform identity verification,
            custody, and transaction processing independently of us. We do not control, operate, or
            guarantee these third-party services and are not responsible for their actions, omissions,
            security practices, or regulatory compliance.
          </p>
        </LegalSubsection>

        <LegalSubsection title="2. Wallets, Keys, and Authentication">
          <p className="mb-2 font-medium text-gray-900">Wallet Generation and Authentication</p>
          <p>
            Users may generate blockchain wallets via third-party authentication providers or connect
            self-custodied wallets. We do not generate, store, or have access to users&apos; private
            keys, seed phrases, or credentials. Loss of private keys may result in permanent loss of
            access to digital assets.
          </p>
        </LegalSubsection>

        <LegalSubsection title="3. Smart Contracts and Contest Creation">
          <p className="mb-2 font-medium text-gray-900">User-Deployed Smart Contracts</p>
          <p className="mb-4">
            Contests are deployed via factory smart contracts by individual users (&quot;Contest
            Creators&quot;). Contest Creators are independent third parties and are not agents,
            partners, or representatives of the Platform. Contest Creators do not have custody of
            pooled contest funds.
          </p>
        </LegalSubsection>

        <LegalSubsection title="4. Contest Resolution & Oracles">
          <p className="mb-2 font-medium text-gray-900">Oracle Dependency</p>
          <p className="mb-4">
            Contest outcomes depend on blockchain oracles that provide external data. We may operate
            certain oracles or rely on third-party oracle providers. Oracles may fail, be delayed,
            manipulated, or provide incorrect data, which could affect contest outcomes and payouts.
          </p>
          <p className="mb-2 font-medium text-gray-900">No Guarantee of Accuracy</p>
          <p>
            We do not guarantee the accuracy, completeness, or timeliness of oracle data and are not
            responsible for losses arising from oracle errors.
          </p>
        </LegalSubsection>

        <LegalSubsection title="5. ERC-1155 Participation Tokens">
          <p className="mb-2 font-medium text-gray-900">Winner Pool Tokens</p>
          <p>
            Upon entry into a Winner Pool market, users may receive ERC-1155 participation tokens
            representing their position. These tokens may be transferable and may fluctuate in value or
            become illiquid. They do not represent equity, ownership, or rights in the Platform.
          </p>
        </LegalSubsection>

        <LegalSubsection title="6. Geoblocking and Access Restrictions">
          <p className="mb-2 font-medium text-gray-900">Geographic and User Restrictions</p>
          <p className="mb-4">
            We reserve the right to restrict or geoblock access to the Platform by jurisdiction or user
            at any time. We may restrict access to the user interface but cannot prevent direct
            on-chain interaction with smart contracts except for globally blocked addresses required
            for compliance purposes.
          </p>
          <p className="mb-2 font-medium text-gray-900">Compliance Blacklisting</p>
          <p>
            Certain blockchain addresses may be blocked from interacting with the Platform or user
            interface to comply with applicable sanctions or regulatory requirements.
          </p>
        </LegalSubsection>

        <LegalSubsection title="7. Private Contests and Leagues">
          <p className="mb-2 font-medium text-gray-900">League and Private Contests</p>
          <p>
            Contest Creators may designate contests as private or league-scoped and restrict
            participation via invite links or membership. The Platform does not control or curate
            private contest participants and is not responsible for disputes among participants.
          </p>
        </LegalSubsection>

        <LegalSubsection title="8. Referral Network">
          <p className="mb-2 font-medium text-gray-900">Invite and Referral Payouts</p>
          <p>
            A portion of contest pots may be allocated to an on-chain invite/referral network at
            settlement. These allocations are enforced by smart contracts, not held in custody by the
            Platform. Referral payouts do not guarantee returns and are not investment advice.
          </p>
        </LegalSubsection>

        <LegalSubsection title="9. Smart Contract and Blockchain Risks">
          <p className="mb-2 font-medium text-gray-900">Smart Contract Risk</p>
          <p className="mb-4">
            Smart contracts may contain bugs, vulnerabilities, or unintended behavior that could result
            in partial or total loss of funds. Smart contracts are irreversible once deployed.
          </p>
          <p className="mb-2 font-medium text-gray-900">Blockchain Risks</p>
          <p>
            Blockchain networks may experience congestion, forks, attacks, or failures that affect
            transactions, settlement, and asset availability.
          </p>
        </LegalSubsection>

        <LegalSubsection title="10. No Fiduciary Duty, Agency, or Partnership">
          <p className="mb-2 font-medium text-gray-900">No Fiduciary Relationship</p>
          <p>
            We are not a broker, dealer, investment advisor, fiduciary, or custodian. Use of the
            Platform does not create any partnership, agency, or fiduciary relationship.
          </p>
        </LegalSubsection>

        <LegalSubsection title="11. Regulatory Uncertainty">
          <p className="mb-2 font-medium text-gray-900">Regulatory Risk</p>
          <p>
            Digital assets and blockchain-based contests are subject to evolving laws and regulations.
            Regulatory changes may restrict or prohibit certain activities and may affect the
            Platform&apos;s availability or functionality.
          </p>
        </LegalSubsection>

        <LegalSubsection title="12. Limitation of Liability (Short Form)">
          <p className="mb-2 font-medium text-gray-900">Limitation of Liability</p>
          <p>
            To the fullest extent permitted by law, we are not liable for losses arising from smart
            contracts, third-party services, oracle failures, user errors, market volatility, or
            regulatory changes.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="Questions">
        <p>
          If you have questions about these disclosures or any aspect of our platform, please contact
          us at <LegalSupportLink />.
        </p>
        <p>
          By using the {COMPANY_LEGAL_NAME} Platform, you acknowledge that you have read, understood,
          and accepted the risks described in this document.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
};
