#!/usr/bin/env node
/**
 * Fails if platform server paths import sport packages (except @cut/sport-sdk).
 *
 * Allowed sport-package imports:
 *   - server/src/sports/** (IO + boot registries)
 *   - packages/sport-* (the packages themselves)
 *   - client/src/sports/** (UI plugins)
 *   - server/src/scripts/** (ops scripts; may target a single sport)
 *
 * Forbidden:
 *   - server/src/services/**
 *   - server/src/lib/**
 *   - server/src/utils/**
 *   - server/src/routes/**
 *   - server/src/cron/**
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const SPORT_PACKAGES = ["@cut/sport-pga-golf", "@cut/sport-f1", "@cut/sport-commodities"];
const FORBIDDEN_DIRS = [
  "server/src/services",
  "server/src/lib",
  "server/src/utils",
  "server/src/routes",
  "server/src/cron",
];

const importRe = new RegExp(
  String.raw`from\s+["'](${SPORT_PACKAGES.map(escapeRegExp).join("|")})["']|require\(\s*["'](${SPORT_PACKAGES.map(escapeRegExp).join("|")})["']\s*\)`,
);

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === "dist") continue;
      walk(full, out);
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      out.push(full);
    }
  }
  return out;
}

const violations = [];
for (const rel of FORBIDDEN_DIRS) {
  const abs = path.join(root, rel);
  for (const file of walk(abs)) {
    const text = fs.readFileSync(file, "utf8");
    const lines = text.split("\n");
    lines.forEach((line, i) => {
      if (importRe.test(line)) {
        violations.push(`${path.relative(root, file)}:${i + 1}:${line.trim()}`);
      }
    });
  }
}

if (violations.length === 0) {
  console.log("Sport boundary check passed: no sport-package imports in platform paths.");
  process.exit(0);
}

console.error("Sport boundary violations — platform paths must not import sport packages:");
console.error("(Allowed: server/src/sports/**, boot registries, packages/, client/src/sports/**)\n");
for (const line of violations) {
  console.error(`  ${line}`);
}
console.error(
  `\n${violations.length} violation(s). Use requireSportModule / email content registry instead.`,
);
process.exit(1);
