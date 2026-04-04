import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

import { HARDCODED_PLAYERS } from "../lib/marketingDummies";

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

const STEP_COUNT = 10;

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
  "inline-flex shrink-0 items-center justify-center rounded-sm bg-emerald-600 px-5 py-2.5 text-center font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2";
/** Match primary control height; reset default button padding so flex cross-axis centers line up on mobile */
const ghostLink =
  "inline-flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent px-2 py-2.5 text-left text-sm font-medium text-gray-600 hover:text-gray-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-sm underline-offset-2 hover:underline";

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0]);

  const goNext = () => setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const progressPct = ((step + 1) / STEP_COUNT) * 100;

  return (
    <div className="flex-1 w-full min-w-0 flex flex-col px-4 pt-4 pb-2 sm:px-5 md:px-6 bg-gray-50 rounded-sm">
      <div className="mb-5">
        <div className="flex items-center justify-between text-xs text-gray-500 mb-2">
          <span>
            Step {step + 1} of {STEP_COUNT}
          </span>
          <Link
            to="/"
            className="text-green-600 hover:text-green-700 font-medium underline-offset-2 hover:underline"
          >
            Exit
          </Link>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-200 overflow-hidden">
          <div
            className="h-full rounded-full bg-green-600 transition-[width] duration-300 ease-out"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-sm shadow px-6 py-6 md:px-8 md:py-7 flex flex-col min-h-0 max-h-[min(78vh,820px)] overflow-y-auto">
        {step === 0 && (
          <>
            <div className="flex min-w-0 flex-row flex-nowrap items-center justify-center gap-3 pb-2 mb-2 sm:gap-5">
              <img
                src="/logo-transparent.png"
                alt="Cut Logo"
                className="h-20 sm:h-24 w-auto flex-shrink-0"
              />
              <h1 className="min-w-0 text-left text-3xl sm:text-4xl md:text-5xl font-bold text-black">
                the Cut
                <div className="text-lg sm:text-xl font-bold text-gray-400">Fantasy Golf + </div>
                <div className="text-lg sm:text-xl font-bold text-gray-400">Prediction Market</div>
              </h1>
            </div>

            <p className="text-gray-700 leading-relaxed font-display mb-4 text-center">
              <strong>the Cut</strong> is a weekly fantasy golf game and prediction market. Pick
              four PGA Tour players each week & compete in contests with real stakes.
            </p>
            <p className="text-gray-700 leading-relaxed font-display text-center">
              This tour will get you started.
            </p>
            <StepActions>
              <button type="button" onClick={() => navigate("/")} className={ghostLink}>
                Skip for now
              </button>
              <button type="button" onClick={goNext} className={primaryBtn}>
                Start
              </button>
            </StepActions>
          </>
        )}

        {step === 1 && (
          <>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-3">
              Your team name
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
                TEAM NAME
              </label>
              <input
                id="onboarding-display-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Enter your team name"
                className="mt-1 block w-full rounded-sm border border-gray-300 bg-white py-2.5 px-3 text-base focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <StepActions>
              <button type="button" onClick={goBack} className={ghostLink}>
                Back
              </button>
              <button type="button" onClick={goNext} className={primaryBtn}>
                Continue
              </button>
            </StepActions>
          </>
        )}

        {step === 2 && (
          <>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-3">
              Your team color
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-2">
              Pick an accent color that appears next to your team name so you&apos;re easy to spot
              on leaderboards.
            </p>
            <div>
              {/* <span className="block text-sm font-medium text-gray-700">COLOR</span> */}

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
              <button type="button" onClick={goNext} className={primaryBtn}>
                Continue
              </button>
            </StepActions>
          </>
        )}

        {step === 3 && (
          <>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-3">
              Create a new lineup each week
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-4">
              For each tournament, you build a <strong>lineup</strong> of{" "}
              <strong>four golfers</strong>. You can choose any four golfers from the field. Make
              some sneaky picks to avoid splitting the pot with other teams.
            </p>
            <div className="bg-white rounded-sm shadow p-4 border border-gray-100">
              <div className="grid grid-cols-2 gap-4">
                {HARDCODED_PLAYERS.map((player, i) => (
                  <div key={i} className="flex flex-col items-center">
                    {player.pga_imageUrl && (
                      <div className="flex-shrink-0 mb-2">
                        <img
                          className="h-10 w-10 rounded-full object-cover border border-gray-300"
                          src={player.pga_imageUrl}
                          alt={player.name}
                          style={{ objectPosition: "center top" }}
                        />
                      </div>
                    )}
                    <div className="text-sm font-semibold text-gray-900 text-center">
                      {player.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <StepActions>
              <button type="button" onClick={goBack} className={ghostLink}>
                Back
              </button>
              <button type="button" onClick={goNext} className={primaryBtn}>
                Continue
              </button>
            </StepActions>
          </>
        )}

        {step === 4 && (
          <>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-3">
              Enter your lineup(s) into Contests
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-6">
              A <strong>contest</strong> is tied to <strong>one tournament</strong>. You{" "}
              <strong>enter with a lineup</strong> and pay an <strong>entry fee in CUT</strong>.
              Everyone&apos;s entries feed the <strong>primary prize pool</strong> for the{" "}
              <strong>fantasy competition</strong>—<strong>highest lineup scores</strong> win that
              pool; <strong>ties split</strong> their share.
            </p>
            <p className="text-sm text-center">
              <Link
                to="/faq#gameplay"
                className="text-green-600 font-medium underline-offset-2 hover:underline"
              >
                Learn more in the FAQ
              </Link>
            </p>
            <StepActions>
              <button type="button" onClick={goBack} className={ghostLink}>
                Back
              </button>
              <button type="button" onClick={goNext} className={primaryBtn}>
                Continue
              </button>
            </StepActions>
          </>
        )}

        {step === 5 && (
          <>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-2">
              How scoring works
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-3">
              Each golfer earns points based on their performance on each hole:
            </p>
            <div className="mb-4 rounded-sm border border-gray-200">
              <table className="w-full border-collapse text-sm font-display">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-100">
                    <th className="px-3 py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-600">
                      Result
                    </th>
                    <th className="w-[5.5rem] px-3 py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-600 tabular-nums">
                      Points
                    </th>
                  </tr>
                </thead>
                <tbody className="text-gray-800">
                  {[
                    ["Eagle or better", "+5"],
                    ["Birdie", "+2"],
                    ["Par", "0"],
                    ["Bogey", "−1"],
                    ["Double bogey or worse", "−3"],
                  ].map(([label, pts], i) => (
                    <tr key={label} className={i > 0 ? "border-t border-slate-100" : undefined}>
                      <td className="px-3 py-2.5 text-left leading-snug">{label}</td>
                      <td className="px-3 py-2.5 text-right font-medium tabular-nums text-slate-900">
                        {pts}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <StepActions>
              <button type="button" onClick={goBack} className={ghostLink}>
                Back
              </button>
              <button type="button" onClick={goNext} className={primaryBtn}>
                Got it
              </button>
            </StepActions>
          </>
        )}

        {step === 6 && (
          <>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-3">
              Contest Winner Pool
            </h1>
            <div className="bg-white rounded-sm shadow p-5 border-2 border-blue-200 mb-4">
              <p className="text-xs font-display text-blue-600 font-medium mb-2">Winner Pool</p>
              <p className="text-gray-700 leading-relaxed font-display text-sm">
                A <strong>secondary prediction market</strong> on <strong>which lineup</strong> wins
                the contest—not swapping golfers. You take <strong>positions</strong> (shares);{" "}
                <strong>prices move</strong> with the event. When the contest{" "}
                <strong>settles</strong>, winner pool payouts are <strong>separate</strong> from
                primary lineup prizes.
              </p>
            </div>
            <p className="text-gray-700 leading-relaxed font-display text-sm mb-4">
              <strong>When you can buy, sell, or only buy</strong> follows contest status—see the
              FAQ for the full timeline.
            </p>
            <p className="text-sm mb-2">
              <Link
                to="/faq#contest-status"
                className="text-green-600 font-medium underline-offset-2 hover:underline"
              >
                Contest status &amp; timeline (FAQ)
              </Link>
            </p>
            <StepActions>
              <button type="button" onClick={goBack} className={ghostLink}>
                Back
              </button>
              <button type="button" onClick={goNext} className={primaryBtn}>
                Continue
              </button>
            </StepActions>
          </>
        )}

        {step === 7 && (
          <>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-3">
              Referral bonuses
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-5">
              Invite friends and earn when they join and play. The program is{" "}
              <strong>multi-level</strong>: you can also earn when <em>they</em> refer people, and
              when those invites keep spreading—so rewards aren&apos;t limited to only your direct
              referrals.
            </p>
            <div className="rounded-sm border-2 border-orange-200 bg-white shadow-sm p-4 mb-2">
              <div className="space-y-3 text-sm text-gray-700 font-display leading-snug">
                <div className="flex gap-3">
                  <span className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                    1
                  </span>
                  <p>
                    <strong>Direct referrals</strong> — someone uses your link, signs up, and plays.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-orange-500 text-xs font-bold text-white">
                    2
                  </span>
                  <p>
                    <strong>Second level</strong> — your referrals invite their own friends; you can
                    earn on that activity too.
                  </p>
                </div>
                <div className="flex gap-3">
                  <span className="flex-shrink-0 flex h-7 w-7 items-center justify-center rounded-full bg-orange-400 text-xs font-bold text-white">
                    +
                  </span>
                  <p>
                    <strong>More levels</strong> — bonuses can continue down the chain; exact rates
                    and rules are in your account when the program is live.
                  </p>
                </div>
              </div>
            </div>
            <StepActions>
              <button type="button" onClick={goBack} className={ghostLink}>
                Back
              </button>
              <button type="button" onClick={goNext} className={primaryBtn}>
                Continue
              </button>
            </StepActions>
          </>
        )}

        {step === 8 && (
          <>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-3">
              Add funds to your account
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-6">
              You&apos;ll need funds in your account to compete in contests. Any player can send you
              funds at any time. Send your Account ID to the person that referred you to get
              started.
            </p>

            <StepActions>
              <button type="button" onClick={goBack} className={ghostLink}>
                Back
              </button>
              <button type="button" onClick={goNext} className={primaryBtn}>
                Continue
              </button>
            </StepActions>
          </>
        )}

        {step === 9 && (
          <>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-3">
              Done!
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-6">
              You&apos;re ready to play. Build a lineup for this week&apos;s tournament whenever you
              want—then enter contests when you have funds in your account.
            </p>
            <StepActions>
              <button type="button" onClick={goBack} className={ghostLink}>
                Back
              </button>
              <Link to="/lineups/create" className={primaryBtn}>
                Create a lineup
              </Link>
            </StepActions>
          </>
        )}
      </div>
    </div>
  );
}
