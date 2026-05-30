/**
 * Write email HTML to tmp/email-preview.html for browser preview.
 *
 *   pnpm --filter server run script:email-preview
 *   pnpm --filter server run script:email-preview open
 *   pnpm --filter server run script:email-preview new-tournament
 *
 * Kinds: welcome | new-tournament | reminder | recap | behind-the-scenes | player-withdrawal | minimal
 */

import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { execSync } from "child_process";
import {
  buildPreviewHtmlByKind,
  PREVIEW_KINDS,
  type PreviewKind,
} from "../lib/email/index.js";

const serverRoot = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outPath = join(serverRoot, "tmp/email-preview.html");

function parseKind(argv: string[]): PreviewKind {
  const arg = argv.find((a) => !a.startsWith("-") && a !== "open");
  if (!arg) return "new-tournament";
  if (PREVIEW_KINDS.includes(arg as PreviewKind)) return arg as PreviewKind;
  console.error(`Unknown kind "${arg}". Use: ${PREVIEW_KINDS.join(" | ")}`);
  process.exit(1);
}

async function main() {
  const kind = parseKind(process.argv.slice(2));
  const html = await buildPreviewHtmlByKind(kind);
  await mkdir(join(serverRoot, "tmp"), { recursive: true });
  await writeFile(outPath, html, "utf8");
  console.log(`Wrote ${outPath} (${kind})`);

  const shouldOpen =
    process.argv.includes("open") || process.env.OPEN === "1" || process.env.OPEN === "true";
  if (shouldOpen && process.platform === "darwin") {
    execSync(`open "${outPath}"`, { stdio: "inherit" });
  } else {
    console.log(`Preview: open "${outPath}"`);
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
