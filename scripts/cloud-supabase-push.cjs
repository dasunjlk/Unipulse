/**
 * Loads SUPABASE_ACCESS_TOKEN from .env.local (if unset in the environment),
 * links the CLI to the hosted project ref, runs a small SQL step so app_config.grid_n
 * is at least 10 (seeded campus pins require it), then runs supabase db push.
 *
 * Required: SUPABASE_ACCESS_TOKEN=sbp_... (Dashboard → Account → Access Tokens)
 * Optional: SUPABASE_PROJECT_REF (defaults to UniPulse hosted ref in README)
 */

"use strict";

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const root = path.join(__dirname, "..");

/** @returns {boolean} */
function isValidProjectRef(ref) {
  return typeof ref === "string" && /^[a-z0-9]{20}$/.test(ref);
}

function loadEnvLocal() {
  const fp = path.join(root, ".env.local");
  if (!fs.existsSync(fp)) return;
  const text = fs.readFileSync(fp, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env) || process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

/** Quotes an argv segment for exec under cmd.exe */
function escapeCmdArg(arg) {
  const s = String(arg);
  if (!/[ "&]/.test(s)) return s;
  return '"' + s.replace(/"/g, '\\"') + '"';
}

function runNpx(args) {
  const line = ["npx", "supabase", ...args].map(escapeCmdArg).join(" ");
  execSync(line, {
    cwd: root,
    env: process.env,
    stdio: "inherit",
    windowsHide: true,
    shell: true,
  });
}

const ensureGridSql = path.join(__dirname, "ensure-grid-for-seed.sql");

loadEnvLocal();

const token = process.env.SUPABASE_ACCESS_TOKEN;
if (!token || !token.startsWith("sbp_")) {
  console.error(
    [
      "Missing or invalid SUPABASE_ACCESS_TOKEN (must start with sbp_).",
      "",
      "1) Dashboard → Account → Access Tokens → create a CLI token.",
      '2) Add to .env.local: SUPABASE_ACCESS_TOKEN=sbp_...',
      "",
      "Or run migrations manually:",
      '  Paste supabase/cloud_apply_bundle.sql into Dashboard → SQL (run once).',
      "",
    ].join("\n"),
  );
  process.exit(1);
}

const ref = process.env.SUPABASE_PROJECT_REF || "bjwscldakcwuqorlrwif";
if (!isValidProjectRef(ref)) {
  console.error(`Invalid SUPABASE_PROJECT_REF: "${ref}". Expected 20-char ref.`);
  process.exit(1);
}

runNpx(["link", "--project-ref", ref, "--yes"]);
// Bump grid_n enough for seeded pins (migration 20250518 uses cells up to row 8 col 9)
runNpx(["db", "query", "--linked", "-f", ensureGridSql]);
runNpx(["db", "push", "--yes"]);
console.log("[cloud-supabase-push] Done. Next: npm run dev and GET /api/locations.");
