/**
 * Read or write PGA golf tournament summarySections on CompetitionEvent.metadata.
 *
 *   pnpm run script:write-tournament-summary R2026013 path/to/summary.json
 *   pnpm run script:write-tournament-summary R2026013 -   # stdin
 *   pnpm run script:write-tournament-summary R2026013 --dump
 */

import { readFile } from "node:fs/promises";
import { prisma } from "../lib/prisma.js";
import { PGA_GOLF_SPORT_ID, parseSummarySections } from "@cut/sport-pga-golf";

async function readJsonInput(source: string): Promise<unknown> {
  const raw =
    source === "-" ? await readStdin() : await readFile(source, "utf8");
  return JSON.parse(raw) as unknown;
}

function readStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    process.stdin.on("data", (chunk: Buffer) => chunks.push(chunk));
    process.stdin.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    process.stdin.on("error", reject);
  });
}

async function findGolfEvent(externalId: string) {
  const event = await prisma.competitionEvent.findFirst({
    where: { sportId: PGA_GOLF_SPORT_ID, externalId },
  });
  if (!event) {
    throw new Error(
      `No pga-golf CompetitionEvent for externalId=${externalId}. Run service:init-event first.`,
    );
  }
  return event;
}

async function dumpSummary(externalId: string) {
  const event = await findGolfEvent(externalId);
  const meta =
    event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
      ? (event.metadata as Record<string, unknown>)
      : {};
  const sections = parseSummarySections(meta.summarySections);
  if (!sections) {
    console.error(`No summarySections on event ${event.id} (${externalId})`);
    process.exit(1);
  }
  console.log(JSON.stringify(sections, null, 2));
}

async function writeSummary(externalId: string, source: string) {
  const parsed = await readJsonInput(source);
  const sections = parseSummarySections(parsed);
  if (!sections) {
    throw new Error("Invalid summary JSON — expected a non-empty array of sections with body items");
  }

  const event = await findGolfEvent(externalId);
  const existing =
    event.metadata && typeof event.metadata === "object" && !Array.isArray(event.metadata)
      ? (event.metadata as Record<string, unknown>)
      : {};

  await prisma.competitionEvent.update({
    where: { id: event.id },
    data: {
      metadata: {
        ...existing,
        summarySections: sections,
      },
    },
  });

  console.log(
    `Wrote summarySections (${sections.length} sections) to event ${event.id} (${externalId})`,
  );
}

async function main() {
  const argv = process.argv.slice(2);
  const externalId = argv[0]?.trim();
  if (!externalId) {
    console.error(
      "Usage: pnpm run script:write-tournament-summary <pgaTourId> <path|-|--dump>",
    );
    process.exit(1);
  }

  if (argv.includes("--dump")) {
    await dumpSummary(externalId);
  } else {
    const source = argv[1];
    if (!source) {
      console.error(
        "Usage: pnpm run script:write-tournament-summary <pgaTourId> <path|-|--dump>",
      );
      process.exit(1);
    }
    await writeSummary(externalId, source);
  }
}

main()
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
