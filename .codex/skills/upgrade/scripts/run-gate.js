#!/usr/bin/env node
// Runs one validation gate command and records tamper-evident evidence for it.
// Executors must run every validation gate through this script; the artifact
// validator (E12) only accepts evidence JSON written here, so a gate that was
// never actually run cannot be self-certified as passed.
//
// Usage:
//   node run-gate.js --run-dir <run_artifact_dir> --stage <execute-N> --gate <name>
//                    [--cwd <dir>] [--timeout <seconds>] -- <command...>
//
// Writes:
//   <run-dir>/validation-results/evidence/<stage>/<gate>.log   (full stdout+stderr)
//   <run-dir>/validation-results/evidence/<stage>/<gate>.json  (evidence record)
// Prints a compact JSON summary (evidence path, exit code, output tail) and
// exits with the command's exit code.
const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function main() {
  const argv = process.argv.slice(2);
  const sep = argv.indexOf("--");
  if (sep === -1) usage();
  const opts = {};
  for (let i = 0; i < sep; i += 2) opts[argv[i].replace(/^--/, "")] = argv[i + 1];
  const command = argv.slice(sep + 1).join(" ");
  if (!opts["run-dir"] || !opts.stage || !opts.gate || !command) usage();

  const evidenceDir = path.join(opts["run-dir"], "validation-results", "evidence", opts.stage);
  fs.mkdirSync(evidenceDir, { recursive: true });
  const logPath = path.join(evidenceDir, `${opts.gate}.log`);
  const evidencePath = path.join(evidenceDir, `${opts.gate}.json`);

  const startedAt = new Date().toISOString();
  const start = Date.now();
  const run = spawnSync(command, {
    shell: true,
    cwd: opts.cwd || process.cwd(),
    encoding: "utf8",
    timeout: (Number(opts.timeout) || 600) * 1000,
    maxBuffer: 64 * 1024 * 1024
  });
  const output = `${run.stdout || ""}${run.stderr || ""}`;
  const timedOut = run.error && run.error.code === "ETIMEDOUT";
  const exitCode = timedOut ? 124 : run.error ? 127 : run.status === null ? 1 : run.status;

  fs.writeFileSync(logPath, output);
  fs.writeFileSync(evidencePath, JSON.stringify({
    gate: opts.gate,
    stage: opts.stage,
    command,
    cwd: opts.cwd || process.cwd(),
    started_at: startedAt,
    duration_ms: Date.now() - start,
    exit_code: exitCode,
    timed_out: Boolean(timedOut),
    spawn_error: run.error ? String(run.error.message) : null,
    log_path: `${opts.gate}.log`
  }, null, 2) + "\n");

  const tail = output.split(/\r?\n/).filter(Boolean).slice(-15);
  console.log(JSON.stringify({ evidence_path: evidencePath.replace(/\\/g, "/"), exit_code: exitCode, output_tail: tail }, null, 2));
  process.exit(exitCode);
}

function usage() {
  console.error("Usage: node run-gate.js --run-dir <dir> --stage <execute-N> --gate <name> [--cwd <dir>] [--timeout <sec>] -- <command...>");
  process.exit(2);
}

main();
