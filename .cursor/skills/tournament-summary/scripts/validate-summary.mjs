#!/usr/bin/env node
/**
 * Validates tournament summary JSON against the schema used by
 * server/src/lib/tournamentSummary.ts
 *
 * Usage:
 *   node .cursor/skills/tournament-summary/scripts/validate-summary.mjs path/to/R2026023.json
 */

import { readFile } from "node:fs/promises";
import path from "node:path";

const CANONICAL_SECTIONS = [
  "Summary",
  "Best Players and Odds",
  "Tournament History",
  "Course and Format",
  "Broadcast Information",
];

function isSummaryItem(value) {
  if (!value || typeof value !== "object") return false;
  if (typeof value.body !== "string" || value.body.trim() === "") return false;
  if (value.label !== undefined && typeof value.label !== "string") return false;
  return true;
}

function isSummarySection(value) {
  if (!value || typeof value !== "object") return false;
  if (typeof value.title !== "string" || value.title.trim() === "") return false;
  if (!Array.isArray(value.items) || value.items.length === 0) return false;
  return value.items.every(isSummaryItem);
}

function validateSummarySections(json, filePath) {
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
      warnings.push(`Missing canonical section: "${expected}"`);
    }
  }

  const summarySection = json.find((s) => s.title.trim().toLowerCase() === "summary");
  if (summarySection) {
    if (summarySection.items.length !== 1) {
      warnings.push('Summary section should have exactly one item.');
    }
    const lead = summarySection.items[0];
    if (lead && lead.label !== "") {
      warnings.push('Summary lead item should use an empty label ("").');
    }
    if (lead && lead.body.includes("•")) {
      warnings.push("Summary body should be prose, not bullet characters.");
    }
  }

  const oddsSection = json.find((s) => s.title.trim() === "Best Players and Odds");
  if (oddsSection) {
    if (oddsSection.items.length < 8) {
      warnings.push(`Best Players and Odds has ${oddsSection.items.length} items; aim for 8–10.`);
    }
    for (const item of oddsSection.items) {
      if (!item.label || !item.label.includes("+")) {
        warnings.push(`Odds item missing American odds in label: "${item.label ?? ""}"`);
      }
    }
  }

  // JSON syntax sanity: no smart quotes
  const raw = JSON.stringify(json);
  if (/[\u2018\u2019\u201C\u201D]/.test(raw)) {
    warnings.push("Found smart quotes; use straight ASCII quotes in JSON.");
  }

  if (filePath && !path.basename(filePath).match(/^R\d+\.json$/)) {
    warnings.push(`Filename should match R{pgaTourId}.json (got ${path.basename(filePath)}).`);
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

  const { errors, warnings } = validateSummarySections(parsed, filePath);

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
  process.exit(warnings.length > 0 ? 0 : 0);
}

main();
