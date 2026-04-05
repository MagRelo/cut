import { useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";

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
  "inline-flex shrink-0 items-center justify-center rounded-sm bg-emerald-600 px-5 py-2.5 text-center font-display font-medium text-white hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2";
/** Match primary control height; reset default button padding so flex cross-axis centers line up on mobile */
const ghostLink =
  "inline-flex shrink-0 cursor-pointer items-center justify-center border-0 bg-transparent px-2 py-2.5 text-left text-sm font-medium text-gray-400 hover:text-gray-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 rounded-sm underline-offset-2 hover:underline";

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [displayName, setDisplayName] = useState("");
  const [accentColor, setAccentColor] = useState(ACCENT_COLORS[0]);

  const goNext = () => setStep((s) => Math.min(s + 1, STEP_COUNT - 1));
  const goBack = () => setStep((s) => Math.max(s - 1, 0));

  const progressPct = ((step + 1) / STEP_COUNT) * 100;

  return (
    <div className="flex-1 w-full min-w-0 flex flex-col px-4 pt-4 pb-4 sm:px-5 md:px-6 bg-gray-50 rounded-sm">
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

      <div className="bg-white rounded-sm shadow px-6 py-6 md:px-8 md:py-7 flex flex-col">
        {step === 0 && (
          <>
            <div className="flex min-w-0 flex-row flex-nowrap items-center justify-center gap-4 pb-2 mb-2 sm:gap-6">
              <img
                src="/logo-transparent.png"
                alt="Cut Logo"
                className="h-28 sm:h-36 md:h-44 w-auto flex-shrink-0"
              />
              <h1 className="min-w-0 text-left text-4xl sm:text-5xl md:text-6xl font-bold text-black">
                the Cut
                <div className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-400">
                  Fantasy Golf{" "}
                </div>
              </h1>
            </div>

            <p className="text-gray-700 leading-relaxed font-display text-2xl mb-4 text-center">
              Welcome to <strong>the Cut</strong>!
            </p>
            <p className="text-gray-700 leading-relaxed font-display text-lg sm:text-xl text-center">
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
              Build Lineups
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-4">
              For each tournament, you build a lineup of <strong>four golfers</strong>. You can
              choose any four golfers from the field - no salary caps or restrictions.
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

        {step === 2 && (
          <>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-3">
              Enter Contests
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-4">
              A <strong>contest</strong> is a fantasy competition for a single tournament. Each
              lineup you enter is a separate buy-in; those fees build the{" "}
              <strong>prize pool</strong>. When the event wraps, <strong>payouts</strong> go to the
              best-scoring lineups.
            </p>
            <p className="text-gray-700 leading-relaxed font-display mb-6">
              You can join <strong>multiple contests</strong> in a week and enter{" "}
              <strong>more than one lineup</strong> in the same contest.
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

        {step === 3 && (
          <>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-2">
              How scoring works
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-3">
              Golfers earn points based on their performance on each hole:
            </p>
            <div className="rounded-sm border border-gray-200">
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
                <tbody>
                  {[
                    ["Eagle or better", "+5"],
                    ["Birdie", "+2"],
                    ["Par", "0"],
                    ["Bogey", "−1"],
                    ["Double bogey or worse", "−3"],
                  ].map(([label, pts], i) => {
                    const tone = pts.startsWith("+") ? "good" : pts === "0" ? "neutral" : "bad";
                    const valueClass =
                      tone === "good"
                        ? "text-emerald-600"
                        : tone === "bad"
                          ? "text-red-600"
                          : "text-gray-700";
                    return (
                      <tr key={label} className={i > 0 ? "border-t border-slate-100" : undefined}>
                        <td className="px-3 py-2.5 text-left leading-snug text-gray-800">
                          {label}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right font-medium tabular-nums ${valueClass}`}
                        >
                          {pts}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <p className="text-gray-700 leading-relaxed font-display text-base mt-4 mb-3">
              There are also bonus points:
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
                <tbody>
                  {[
                    ["1st place position", "+10"],
                    ["2nd place position", "+5"],
                    ["3rd place position", "+3"],
                    ["Making the cut", "+3"],
                  ].map(([label, pts], i) => {
                    const tone = pts.startsWith("+") ? "good" : pts === "0" ? "neutral" : "bad";
                    const valueClass =
                      tone === "good"
                        ? "text-emerald-600"
                        : tone === "bad"
                          ? "text-red-600"
                          : "text-gray-700";
                    return (
                      <tr key={label} className={i > 0 ? "border-t border-slate-100" : undefined}>
                        <td className="px-3 py-2.5 text-left leading-snug text-gray-800">
                          {label}
                        </td>
                        <td
                          className={`px-3 py-2.5 text-right font-medium tabular-nums ${valueClass}`}
                        >
                          {pts}
                        </td>
                      </tr>
                    );
                  })}
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

        {step === 4 && (
          <>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-3">
              Contest Winner Pool
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-6">
              The <strong> Winner Pool</strong> is a separate market that lets you trade shares on
              which lineup will win a contest. <strong>Buy early</strong> to get a better price -
              shares get more expensive as the tournament progresses. You can buy shares until round
              4 begins - keep an eye on the contest to optimize your investments.
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
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-3">
              Referral bonuses
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-5">
              When you win a contest, a portion of the prize pool is directed to your referral
              network. The more people you refer, the more you earn. These bonuses travel up to 10
              levels deep, so if you invite three people, and they invite three people - and so on -
              you could easily have hundreds of people paying you bonuses.
            </p>

            <p className="text-gray-700 leading-relaxed font-display mb-6">
              You can find your personal invite link on the account page - share it with your
              friends!
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

        {step === 6 && (
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

        {step === 7 && (
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

        {step === 8 && (
          <>
            <h1 className="text-2xl md:text-3xl font-display font-semibold text-gray-900 mb-3">
              Your team color
            </h1>
            <p className="text-gray-700 leading-relaxed font-display mb-2">
              Pick an accent color that appears next to your team name so you&apos;re easy to spot
              on leaderboards.
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
