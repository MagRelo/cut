#!/usr/bin/env node
/**
 * Validates tournament summary JSON against the schema used by
 * packages/sport-pga-golf (parseSummarySections / getEventBlurb).
 *
 * Usage:
 *   node .cursor/skills/tournament-summary/scripts/validate-summary.mjs path/to/summary.json
 */

import { readFile } from "node:fs/promises";

const CANONICAL_SECTIONS = [
  "From the 19th Hole",
  "Event Blurb",
  "Best Players and Odds",
  "Course and Format",
  "Broadcast Information",
];

function isSummaryItem(value) {
  if (!value || typeof value !== "object") return false;
  if (typeof value.body !== "string" || value.body.trim() === "") return false;
  if (value.label !== undefined && typeof value.label !== "string") return false;
  if (value.attribution !== undefined && typeof value.attribution !== "string") return false;
  if (value.color !== undefined && typeof value.color !== "string") return false;
  return true;
}

function isSummarySection(value) {
  if (!value || typeof value !== "object") return false;
  if (typeof value.title !== "string" || value.title.trim() === "") return false;
  if (!Array.isArray(value.items) || value.items.length === 0) return false;
  return value.items.every(isSummaryItem);
}

function validateSummarySections(json) {
  const errors = [];
  const warnings = [];

  if (!Array.isArray(json) || json.length === 0) {
    errors.push("Root must be a non-empty array of sections.");
    return { errors, warnings };
  }

  if (!json.every(isSummarySection)) {
    errors.push("Every section must have title (string) and items (non-empty array with body strings).");
  }

  const titles = json.map((s) => s.title.trim());
  for (const expected of CANONICAL_SECTIONS) {
    if (!titles.includes(expected)) {
      if (expected === "Event Blurb" && titles.includes("Tournament History")) {
        warnings.push(
          'Prefer canonical section "Event Blurb" (legacy "Tournament History" still works).',
        );
      } else {
        warnings.push(`Missing canonical section: "${expected}"`);
      }
    }
  }

  const quotesSection = json.find((s) => {
    const key = s.title.trim().toLowerCase();
    return key === "from the 19th hole" || key === "summary";
  });
  if (quotesSection) {
    if (quotesSection.items.length < 1 || quotesSection.items.length > 4) {
      warnings.push("From the 19th Hole should have 1–4 quote items (CutBot + up to 3 user quotes).");
    }
    for (const [index, item] of quotesSection.items.entries()) {
      if (item.body.includes("•")) {
        warnings.push("Quote body should be prose, not bullet characters.");
      }
      if (index > 0 && !item.attribution?.trim()) {
        warnings.push(`Quote item ${index + 1} should include attribution.`);
      }
      if (item.color && !/^#[0-9a-fA-F]{6}$/.test(item.color.trim())) {
        warnings.push(`Quote item ${index + 1} color should be a 6-digit hex value like #00abb8.`);
      }
    }
  }

  const blurbSection = json.find((s) => {
    const key = s.title.trim().toLowerCase();
    return key === "event blurb" || key === "tournament history";
  });
  if (blurbSection) {
    if (blurbSection.items.length !== 1) {
      warnings.push(
        "Event Blurb should be a single prose item (one body, no labels) for the announcement card.",
      );
    }
    const item = blurbSection.items[0];
    if (item?.label?.trim()) {
      warnings.push("Event Blurb item should omit label — body only.");
    }
    if (item?.body?.includes("•")) {
      warnings.push("Event Blurb should be prose, not bullet characters.");
    }
  }

  const oddsSection = json.find((s) => s.title.trim() === "Best Players and Odds");
  if (oddsSection) {
    if (oddsSection.items.length < 8) {
      warnings.push(`Best Players and Odds has ${oddsSection.items.length} items; aim for 8–10.`);
    }
    const withOdds = oddsSection.items.filter((item) => /\+\d/.test(item.label ?? ""));
    const withoutOdds = oddsSection.items.filter((item) => !/\+\d/.test(item.label ?? ""));
    if (withOdds.length > 0 && withoutOdds.length > 0) {
      warnings.push(
        "Best Players and Odds mixes labels with and without odds — use all sourced odds or omit odds entirely until books post.",
      );
    }
    if (withoutOdds.length === oddsSection.items.length) {
      warnings.push(
        "No American odds in labels — OK only if 2+ sportsbooks have not posted this week's board yet. Never invent odds.",
      );
    }
    for (const item of oddsSection.items) {
      if (!item.label?.trim()) {
        warnings.push("Odds item missing label (use \"Player Name:\" or \"Player Name (+low to +high):\").");
      }
      const body = item.body ?? "";
      const riskyPhrases = [
        ["first win of", "season win claim — verify 2026 results"],
        ["major winner", "major title — verify player has won a major"],
        ["national open", "may confuse Scottish Open with The Open — be specific"],
        ["won here", "verify win was at THIS event (PGA past results)"],
        ["wins this season", "win count — verify on PGA Tour"],
      ];
      for (const [phrase, hint] of riskyPhrases) {
        if (body.toLowerCase().includes(phrase)) {
          warnings.push(`Odds blurb "${item.label ?? ""}": contains "${phrase}" — ${hint}`);
        }
      }
    }
  }

  // JSON syntax sanity: no smart quotes
  const raw = JSON.stringify(json);
  if (/[\u2018\u2019\u201C\u201D]/.test(raw)) {
    warnings.push("Found smart quotes; use straight ASCII quotes in JSON.");
  }

  return { errors, warnings };
}

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    console.error("Usage: node validate-summary.mjs <path-to-summary.json>");
    process.exit(1);
  }

  let parsed;
  try {
    const raw = await readFile(filePath, "utf8");
    parsed = JSON.parse(raw);
  } catch (err) {
    console.error(`FAIL: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const { errors, warnings } = validateSummarySections(parsed);

  for (const w of warnings) {
    console.warn(`WARN: ${w}`);
  }
  for (const e of errors) {
    console.error(`ERROR: ${e}`);
  }

  if (errors.length > 0) {
    console.error("\nValidation failed.");
    process.exit(1);
  }

  console.log(`OK: ${filePath} (${parsed.length} sections)`);
  process.exit(0);
}

main();
