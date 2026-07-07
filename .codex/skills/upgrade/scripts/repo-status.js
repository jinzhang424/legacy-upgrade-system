#!/usr/bin/env node
// Single-call replacement for the orchestrator's separate git status / branch /
// log / artifact-existence checks. Emits one compact JSON blob per checkpoint.
//
// Usage: node repo-status.js --repo <repo_path> [--run-dir <run_artifact_dir>]
const { execFileSync } = require("child_process");
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function git(repo, args, { trim = true } = {}) {
  try {
    const out = execFileSync("git", ["-C", repo, ...args], { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
    // Porcelain lines start with a significant status column; a global trim
    // would eat the leading space of the first line and shift the path offset.
    return trim ? out.trim() : out.replace(/\s+$/, "");
  } catch (error) {
    return `<git-error: ${String(error.message).split("\n")[0]}>`;
  }
}

function sha256(file) {
  return crypto.createHash("sha256").update(fs.readFileSync(file)).digest("hex").slice(0, 16);
}

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 2) {
    args[argv[i].replace(/^--/, "")] = argv[i + 1];
  }
  return args;
}

const EXPECTED_ARTIFACTS = [
  "manifest.json",
  "impact-report.json",
  "change-plan.json",
  "test-plan.json",
  "test-result.json",
  "run-guide.md",
  "harness/run.js",
  "harness/baseline.json"
];

function main() {
  const args = parseArgs(process.argv);
  if (!args.repo) {
    console.error("Usage: node repo-status.js --repo <repo_path> [--run-dir <run_artifact_dir>]");
    process.exit(2);
  }

  const statusLines = git(args.repo, ["status", "--porcelain=v1"], { trim: false }).split("\n").filter(Boolean);
  const out = {
    branch: git(args.repo, ["rev-parse", "--abbrev-ref", "HEAD"]),
    head: git(args.repo, ["log", "-1", "--format=%h %s"]),
    staged: statusLines.filter((l) => l[0] !== " " && l[0] !== "?").map((l) => l.slice(3)),
    modified_unstaged: statusLines.filter((l) => l[1] === "M" || l[1] === "D").map((l) => l.slice(3)),
    untracked: statusLines.filter((l) => l.startsWith("??")).map((l) => l.slice(3))
  };

  if (args["run-dir"]) {
    out.artifacts = {};
    for (const rel of EXPECTED_ARTIFACTS) {
      const file = path.join(args["run-dir"], rel);
      out.artifacts[rel] = fs.existsSync(file) ? { hash: sha256(file) } : null;
    }
    const vdir = path.join(args["run-dir"], "validation-results");
    out.validation_results = fs.existsSync(vdir)
      ? fs.readdirSync(vdir).filter((f) => f.endsWith(".json"))
      : [];
  }

  console.log(JSON.stringify(out, null, 2));
}

main();
