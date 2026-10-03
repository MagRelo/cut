import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate, type Location } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { BrandLogo } from "../components/common/BrandLogo";
import { BRAND_PROSE, BRAND_WORDMARK } from "../lib/brand";
import { ONBOARDING_DISMISSED_KEY } from "../lib/onboardingSettings";
import { getPendingLeagueInviteCode } from "../lib/leagueInviteCapture";
import {
  ODDS_FORMAT_OPTIONS,
  ODDS_FORMAT_SETTING_KEY,
  parseOddsDisplayFormat,
} from "../lib/oddsSettings";
import type { OddsDisplayFormat } from "../lib/oddsFormat";

const ACCENT_COLORS = [
  "#0a73eb",
  "#A3A3A3",
  "#FF48BF",
  "#F58300",
  "#00ABB8",
  "#FFD60A",
  "#E00000",
  "#4700E0",
  "#9600CC",
  "#00B86B",
];

const STEP_COUNT = 7;

function StepActions({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`mt-6 pt-5 border-t border-gray-100 flex w-full flex-row flex-wrap items-center justify-between gap-x-3 gap-y-2 ${className}`}
    >
      {children}
    </div>
  );
}

const primaryBtn =
  "inline-flex shrink-0 items-center justify-center rounded-sm bg-blue-600 px-5 py-2.5 text-center font-display font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
/** Match primary control height; reset default button padding so flex cross-axis centers line up on mobile */
const ghostLink =
  "inline-flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent px-2 py-2.5 text-left text-sm font-medium text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 rounded-sm underline-offset-2 hover:underline disabled:opacity-50";

export function OnboardingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, updateUser, updateUserSettings } = useAuth();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0]);
  const [oddsFormat, setOddsFormat] = useState<OddsDisplayFormat>("american");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setDisplayName(user.name || "");
    const c = user.settings?.color;
    if (typeof c === "string" && ACCENT_COLORS.includes(c)) {
      setAccentColor(c);
    }
    setOddsFormat(parseOddsDisplayFormat(user.settings));
  }, [user]);

  const navigateAfterDismiss = () => {
    const from = (location.state as { from?: Location })?.from;
    if (from) {
      navigate(`${from.pathname}${from.search || ""}${from.hash || ""}`, { replace: true });
      return;
    }
    const pendingCode = getPendingLeagueInviteCode();
    if (pendingCode) {
      navigate(`/leagues/join/${pendingCode}`, { replace: true });
      return;
    }
    navigate("/", { replace: true });
  };

  const dismissOnboarding = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserSettings({ [ONBOARDING_DISMISSED_KEY]: true });
      navigateAfterDismiss();
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNameContinue = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const nextName = displayName.trim() || user.name;
      if (nextName !== user.name) {
        await updateUser({ name: nextName });
      }
      setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveColorContinue = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserSettings({ color: accentColor });
      setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
    } finally {
      setSaving(false);
    }
  };

  const handleSaveOddsContinue = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await updateUserSettings({ [ODDS_FORMAT_SETTING_KEY]: oddsFormat });
      setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const progressPct = ((step + 1) / STEP_COUNT) * 100;

  return (
    <div className="flex-1 w-full min-w-0 flex flex-col px-1 sm:px-0 pb-4">
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>
            Step {step + 1} of {STEP_COUNT}
          </span>
          <button
            type="button"
            onClick={() => void dismissOnboarding()}
            disabled={saving}
            className="text-blue-600 hover:text-blue-700 font-medium underline-offset-2 hover:underline"
          >
            Exit
          </button>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-blue-600 transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="flex flex-col">
        {step === 0 && (
          <>
            <div className="flex min-w-0 flex-row flex-nowrap items-center justify-center gap-4 pb-2 mb-2 sm:gap-6">
              <BrandLogo decorative={false} className="h-28 w-auto flex-shrink-0 sm:h-36 md:h-44" />
              <h1 className="min-w-0 text-left text-4xl sm:text-5xl md:text-6xl font-bold text-black">
                {BRAND_WORDMARK}
              </h1>
            </div>

            <p className="text-gray-700 leading-relaxed font-display text-2xl mb-4 text-center">
              Welcome to <strong>{BRAND_PROSE}</strong>!
            </p>
            <p className="text-gray-700 leading-relaxed font-display text-lg sm:text-xl text-center">
              Let&apos;s set up your account.
            </p>
            <StepActions>
              <button
                type="button"
                onClick={() => void dismissOnboarding()}
                disabled={saving}
                className={ghostLink}
              >
                Skip for now
              </button>
              <button type="button" onClick={goNext} disabled={saving} className={primaryBtn}>
                Start
              </button>
            </StepActions>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-3">
              Your name
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-6">
              This is the name other players see on leaderboards and results. You can change it
              anytime in Account settings.
            </p>
            <div>
              <label
                htmlFor="onboarding-display-name"
                className="block text-sm font-medium text-gray-700"
              >
                Name
              </label>
              <input
                id="onboarding-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your name"
                className="mt-1 block w-full rounded-sm border border-gray-300 bg-white py-2.5 px-3 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <StepActions>
              <button type="button" onClick={goBack} className={ghostLink}>
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleSaveNameContinue()}
                disabled={saving}
                className={primaryBtn}
              >
                Save & Continue
              </button>
            </StepActions>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-3">
              Your color
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-2">
              Pick an accent color that appears next to your name so you&apos;re easy to spot on
              leaderboards.
            </p>
            <div>
              <div className="grid grid-cols-5 gap-3 mt-3">
                {ACCENT_COLORS.map((color) => (
                  <label key={color} className="flex flex-col items-center cursor-pointer">
                    <input
                      type="radio"
                      name="onboarding-color"
                      value={color}
                      checked={accentColor === color}
                      onChange={() => setAccentColor(color)}
                      className="sr-only"
                    />
                    <span
                      className={`h-8 w-8 rounded-full border-4 ${
                        accentColor === color ? "border-white ring-2 ring-gray-400" : "border-white"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  </label>
                ))}
              </div>
            </div>
            <StepActions>
              <button type="button" onClick={goBack} className={ghostLink}>
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleSaveColorContinue()}
                disabled={saving}
                className={primaryBtn}
              >
                Save & Continue
              </button>
            </StepActions>
          </>
        )}

        {step === 3 && (
          <>
            <h1
              id="onboarding-odds-format"
              className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-3"
            >
              Odds format
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-6">
              Choose how odds are shown on your account. You can change this anytime in Account
              settings.
            </p>
            <div
              className="grid grid-cols-3 gap-4 p-1"
              role="radiogroup"
              aria-labelledby="onboarding-odds-format"
            >
              {ODDS_FORMAT_OPTIONS.map((option) => {
                const selected = oddsFormat === option.value;
                return (
                  <label key={option.value} className="cursor-pointer">
                    <input
                      type="radio"
                      name="onboarding-odds-format"
                      value={option.value}
                      checked={selected}
                      onChange={() => setOddsFormat(option.value)}
                      className="sr-only"
                    />
                    <span
                      className={`flex min-h-[2.75rem] w-full flex-col items-center justify-center rounded-md border px-1 py-1.5 text-center font-display shadow-sm transition-colors ${
                        selected
                          ? "border-white bg-blue-500 text-white ring-2 ring-gray-400 ring-offset-4"
                          : "border-gray-300 bg-white hover:border-gray-400 hover:bg-gray-50"
                      }`}
                    >
                      <span
                        className={`text-sm font-medium leading-tight ${
                          selected ? "text-white" : "text-gray-900"
                        }`}
                      >
                        {option.label}
                      </span>
                      <span
                        className={`mt-0.5 text-xs tabular-nums ${
                          selected ? "text-blue-100" : "text-gray-500"
                        }`}
                      >
                        {option.example}
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
            <StepActions>
              <button type="button" onClick={goBack} className={ghostLink}>
                Back
              </button>
              <button
                type="button"
                onClick={() => void handleSaveOddsContinue()}
                disabled={saving}
                className={primaryBtn}
              >
                Save & Continue
              </button>
            </StepActions>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-3">
              Account Wallet
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-6">
              Your Play The Cut wallet is yours—you stay in control of your funds. Contests use{" "}
              <strong>USDC</strong>, a digital dollar, on the Base network. Add USDC when
              you&apos;re ready to play, and send it out anytime.
            </p>

            <StepActions>
              <button type="button" onClick={goBack} className={ghostLink}>
                Back
              </button>
              <button type="button" onClick={goNext} disabled={saving} className={primaryBtn}>
                nice
              </button>
            </StepActions>
          </>
        )}

        {step === 5 && (
          <>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-3">
              Referral Rewards
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-5">
              Play The Cut is different—
              <strong>no fees, no ads, no middlemen</strong>. We grow through referrals, so when you
              bring in new players, you earn Referral Rewards.
            </p>
            <p className="text-gray-700 leading-relaxed font-display mb-6">
              <strong>Referral Rewards</strong> make Play The Cut a team sport. As friends invite
              friends, your network grows—and <strong>when they win, you win too</strong>. Share
              your referral link under Referral Network to start building your team!
            </p>

            <StepActions>
              <button type="button" onClick={goBack} className={ghostLink}>
                Back
              </button>
              <button type="button" onClick={goNext} disabled={saving} className={primaryBtn}>
                sweet
              </button>
            </StepActions>
          </>
        )}

        {step === 6 && (
          <>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-3">
              Done!
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-6">
              Your account is ready.
            </p>
            <StepActions>
              <button type="button" onClick={goBack} className={ghostLink}>
                Back
              </button>
              <button
                type="button"
                onClick={() => void dismissOnboarding()}
                disabled={saving}
                className={primaryBtn}
              >
                Continue
              </button>
            </StepActions>
          </>
        )}
      </div>
    </div>
  );
}
