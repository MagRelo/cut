import React, { useEffect } from "react";
import {
  CurrencyDollarIcon,
  LockClosedIcon,
  TicketIcon,
  UserGroupIcon,
} from "@heroicons/react/24/outline";
import { Link, useLocation } from "react-router-dom";
import { PageSection } from "../components/layout/PageSection";

export const LEAGUE_STARTER_GUIDE_PATH = "/guides/start-a-league";

export const LeagueStarterGuidePage: React.FC = () => {
  const location = useLocation();

  useEffect(() => {
    const id = location.hash.replace(/^#/, "");
    if (!id) return;

    const run = () => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handle = window.requestAnimationFrame(() => {
      window.requestAnimationFrame(run);
    });
    return () => window.cancelAnimationFrame(handle);
  }, [location.pathname, location.hash]);

  return (
    <>
      <h1 className="mb-3 font-display text-3xl font-bold text-gray-900">Start a League</h1>
      <div className="text-sm text-gray-700">
        <p>Leagues are private groups. All real-money contests happen inside leagues.</p>
        {/* 
      <PageSection>
        <h3 className="mb-2 font-display text-sm font-semibold text-gray-700">Jump to Section</h3>
        <ul className="list-disc space-y-1 pl-6">
          <li>
            <a href="#why" className="text-blue-600 hover:underline">
              Why start a league?
            </a>
          </li>
          <li>
            <a href="#get-started" className="text-blue-600 hover:underline">
              Get started
            </a>
          </li>
          <li>
            <a href="#admin" className="text-blue-600 hover:underline">
              Running your league (admin)
            </a>
          </li>
        </ul>
      </PageSection> */}

        <PageSection id="why" className="scroll-mt-4">
          <h2 className="mb-2 font-display text-2xl font-bold text-gray-900">
            Why start a league?
          </h2>

          <ul>
            <li className="flex gap-3 p-4 sm:gap-4 sm:px-5 sm:py-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                <LockClosedIcon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-base font-semibold text-gray-900">
                  You control who&apos;s in
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">
                  Membership is invite-only. You decide who can join, so contests stay among people
                  you trust.
                </p>
              </div>
            </li>
            <li className="flex gap-3 p-4 sm:gap-4 sm:px-5 sm:py-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                <CurrencyDollarIcon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-base font-semibold text-gray-900">
                  Generate referral rewards
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">
                  When players in your network win, referral rewards can flow back to you. Onboard
                  the whole league and every contest is another chance to generate rewards.{" "}
                  <Link to="/faq#referral-network" className="text-blue-600 hover:underline">
                    Learn more about referral rewards...
                  </Link>
                </p>
              </div>
            </li>
          </ul>
        </PageSection>

        <PageSection id="admin" className="scroll-mt-4">
          <h2 className="mb-2 font-display text-2xl font-bold text-gray-900">Create Contests</h2>

          <p className="mb-2">You&apos;re in control:</p>
          <ul>
            <li className="flex gap-3 p-4 sm:gap-4 sm:px-5 sm:py-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                <TicketIcon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-base font-semibold text-gray-900">Entry Fee</h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">
                  Cost to enter a lineup in the contest.
                </p>
              </div>
            </li>
            <li className="flex gap-3 p-4 sm:gap-4 sm:px-5 sm:py-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-700">
                <UserGroupIcon className="h-5 w-5" aria-hidden />
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-base font-semibold text-gray-900">
                  Referral Rewards %
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">
                  Amount of the pot that pays out as referral rewards
                </p>
              </div>
            </li>
          </ul>
        </PageSection>

        <PageSection id="invite" className="scroll-mt-4">
          <h2 className="mb-4 font-display text-2xl font-bold text-gray-900">League Referral Link</h2>
          <p>
            One link does two jobs: it adds someone to your league and sets you as their referrer
            for referral rewards when they sign up. Share it when onboarding new players.
          </p>
        </PageSection>

        <PageSection id="get-started" className="scroll-mt-4">
          <h2 className="mb-2 font-display text-2xl font-bold text-gray-900">Get started</h2>

          <ol>
            <li className="flex gap-3 p-4 sm:gap-4 sm:px-5 sm:py-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 font-display text-sm font-bold text-blue-700">
                1
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-base font-semibold text-gray-900">
                  Create a league
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">takes 5 seconds</p>
              </div>
            </li>
            <li className="flex gap-3 p-4 sm:gap-4 sm:px-5 sm:py-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 font-display text-sm font-bold text-blue-700">
                2
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-base font-semibold text-gray-900">
                  Share the referral link
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">
                  Share via email, text, iMessage, etc.
                </p>
              </div>
            </li>
            <li className="flex gap-3 p-4 sm:gap-4 sm:px-5 sm:py-4">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-blue-50 font-display text-sm font-bold text-blue-700">
                3
              </span>
              <div className="min-w-0">
                <h3 className="font-display text-base font-semibold text-gray-900">
                  Create contests
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-gray-700">party time</p>
              </div>
            </li>
          </ol>

          <div className="mt-2 px-4 sm:px-5">
            <Link
              to="/leagues/create"
              className="inline-block rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700"
            >
              Create a League
            </Link>
          </div>
        </PageSection>

        <aside
          aria-labelledby="guide-more-help"
          className="mt-6 rounded-sm border border-blue-200 bg-blue-50 p-4 sm:p-5"
        >
          <h2 id="guide-more-help" className="mb-1 font-display text-lg font-bold text-gray-900">
            More help
          </h2>
          <p className="mb-3">Gameplay, scoring, and contest rules:</p>
          <nav className="flex flex-col gap-2 font-display" aria-label="Guide resources">
            <Link to="/faq" className="font-medium text-blue-600 hover:underline">
              Frequently Asked Questions
            </Link>
            <Link to="/faq#referral-network" className="font-medium text-blue-600 hover:underline">
              Referral rewards deep dive
            </Link>
            <Link to="/leagues/create" className="font-medium text-blue-600 hover:underline">
              Create a league
            </Link>
          </nav>
        </aside>
      </div>
    </>
  );
};
