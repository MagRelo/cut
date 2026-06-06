import React from "react";
import { Link } from "react-router-dom";
import {
  LegalPageLayout,
  LegalSection,
  LegalSubsection,
  LegalSupportLink,
} from "../components/legal/LegalPageLayout";
import { COMPANY_LEGAL_NAME, MIN_AGE_TEXT } from "../lib/legalPlaceholders";

export const ResponsibleGaming: React.FC = () => {
  return (
    <LegalPageLayout title="Responsible Participation">
      <p className="mb-8 text-gray-700 leading-relaxed">
        We encourage all users who use the Interface to access the Protocol to participate
        responsibly and within their means.
      </p>

      <LegalSection title="Guidelines for Responsible Participation">
        <LegalSubsection title="Set Financial Limits">
          <p>
            Only participate with funds you can afford to lose. Decide on a budget before joining any
            activity and stick to it. Never use money earmarked for essential expenses.
          </p>
        </LegalSubsection>
        <LegalSubsection title="Don't Chase Losses">
          <p>
            If things don&apos;t go your way, resist the urge to &quot;win it back&quot; by making
            larger or more frequent entries. Accept outcomes and move on.
          </p>
        </LegalSubsection>
        <LegalSubsection title="Take Breaks">
          <p>
            Step away periodically. Don&apos;t let participation interfere with work, relationships,
            or other responsibilities. Balance is important.
          </p>
        </LegalSubsection>
        <LegalSubsection title="Keep Perspective">
          <p>
            Activities should be entertainment, not a financial strategy. Approach participation as
            a fun way to engage, not as a source of income.
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="Know Your Local Laws">
        <p>
          <strong>Important:</strong> The legality of activities accessible via the Interface may vary
          by jurisdiction. It is your responsibility to understand and comply with all applicable laws
          and regulations in your location before participating.
        </p>
        <p>
          {COMPANY_LEGAL_NAME} does not provide legal advice. If you are unsure whether participation
          is permitted in your jurisdiction, consult with a legal professional.
        </p>
      </LegalSection>

      <LegalSection title="Age Requirement">
        <p>
          You must be at least {MIN_AGE_TEXT} to use the Interface and access the Protocol.
        </p>
      </LegalSection>

      <LegalSection title="Taking a Break">
        <p>
          If you feel you need time away from the platform, you can request a voluntary
          self-exclusion period. During this time, your account will be restricted from
          participating. Contact us at <LegalSupportLink /> to arrange this.
        </p>
      </LegalSection>

      <LegalSection title="Support Resources">
        <p>If you or someone you know needs support, the following organizations offer confidential assistance:</p>
        <LegalSubsection title="National Council on Problem Gambling (NCPG)">
          <p>
            24/7 Confidential Helpline:{" "}
            <a href="tel:1-800-522-4700" className="text-blue-600 hover:underline">
              1-800-522-4700
            </a>
          </p>
          <p>
            <a
              href="https://www.ncpgambling.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              ncpgambling.org
            </a>
          </p>
        </LegalSubsection>
        <LegalSubsection title="Gamblers Anonymous">
          <p>
            <a
              href="https://www.gamblersanonymous.org/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline"
            >
              gamblersanonymous.org
            </a>
          </p>
        </LegalSubsection>
      </LegalSection>

      <LegalSection title="Questions or Concerns">
        <p>
          If you have questions about responsible participation, need to request a self-exclusion, or
          have other concerns, please contact us at <LegalSupportLink />.
        </p>
        <p>
          For additional risk information, see our{" "}
          <Link to="/disclosures" className="text-blue-600 hover:underline">
            Disclosures and Risk Statement
          </Link>
          .
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
};
