import { appPath } from "../appUrl.js";
import { renderCtaBlock } from "../blocks/cta.js";
import { renderBulletList, renderProseBlock, renderProseHtml } from "../blocks/resultsTable.js";
import { escapeHtml } from "../escape.js";
import { BODY_TITLE_H1_STYLE, SECTION_TITLE_STYLE } from "../styles.js";
import { wrapEmailHtml } from "../templates.js";
import type { RenderedEmail } from "../types.js";

export type WelcomeEmailData = {
  tournamentName?: string;
};

export function welcomeSubject(): string {
  return "Welcome to Play The Cut";
}

function renderSection(sectionTitle: string, ...blocks: string[]): string {
  return `<div style="margin:0 0 24px;">
<h2 style="${SECTION_TITLE_STYLE}">${escapeHtml(sectionTitle)}</h2>
${blocks.join("\n")}
</div>`;
}

export function buildWelcomeHtml(data: WelcomeEmailData): string {
  const tournamentBlock = data.tournamentName
    ? renderSection(
        "This week",
        renderProseHtml(
          `<span style="font-weight:600;color:#18181b;">${escapeHtml(data.tournamentName)}</span> is the active tournament on Play The Cut. The field is set, lineups are open, and contests are filling up. Build your four-player team, then browse open contests when you are ready to compete.`,
        ),
      )
    : renderProseBlock(
        "When a new tournament week opens, you will see previews, the field, and open contests right on the home page. Your first move is always the same: build a four-player lineup for the week.",
      );

  const bodyHtml = `<h1 style="${BODY_TITLE_H1_STYLE};margin:0 0 20px;">Welcome to Play The Cut!</h1>
${renderProseBlock(
  "Getting started is simple. Choose your four-player lineup, and you're in—your lineup powers every contest and game format.",
)}
${renderSection(
  "Three ways to Play",
  renderProseBlock(
    "There is more than one way to win on Play The Cut. Most players mix and match these three—start with a lineup, then choose how you want to compete:",
  ),
  renderBulletList([
    {
      title: "Fantasy Contests",
      description:
        "Fantasy contests are the heart of the game. Enter an open contest with your four-player lineup, pay the buy-in, and climb the leaderboard as your players score points.",
    },
    {
      title: "Winner Pool",
      description:
        "Every contest also runs a Winner Pool—a live market on which lineup wins the field. Back the entry you like, watch prices move as money flows in, and track projected odds as the tournament unfolds. When the contest settles, wagers on the winner share the pool.",
    },
    {
      title: "Parlays",
      description:
        "Turn your lineup into fixed-odds tickets. Combine finish predictions across your four golfers—how many will land Top 5, Top 10, or Top 20—and lock in a price before the tournament runs its course. A focused way to back your card without entering a full fantasy contest.",
    },
  ]),
)}
${tournamentBlock}
${renderCtaBlock({ label: "Build your lineup", href: appPath("/contests") })}`;

  return wrapEmailHtml({ title: welcomeSubject(), bodyHtml });
}

export function renderWelcomeEmail(data: WelcomeEmailData): RenderedEmail {
  return { subject: welcomeSubject(), html: buildWelcomeHtml(data) };
}
