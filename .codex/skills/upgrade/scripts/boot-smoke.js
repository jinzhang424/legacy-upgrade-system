#!/usr/bin/env node
// Change-agnostic boot + smoke gate, driven entirely by upgrade.config.json.
// Starts the app (start_cmd/start_cwd), polls health_url until it answers,
// requests every smoke_route, then kills the process tree. No LLM involvement:
// this is generated-free, replayable validation. Run it through run-gate.js so
// the exit code and output become E12 evidence.
//
// Usage: node boot-smoke.js --config <upgrade.config.json> --repo <repo_path> [--boot-timeout <sec>]
// Requires any backing services declared in the config's "services" block to
// already be provisioned by the harness; pass their connection strings via the
// config "env" block or the parent environment.
//
// Exit 0: app booted, every route returned < 400, no uncaught exceptions in
// server logs, no configured error_strings in any response body. Exit 1 otherwise.
const { spawn } = require("child_process");
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");
const http = require("http");
const https = require("https");

function fetchUrl(url, timeoutMs) {
  return new Promise((resolve) => {
    const lib = url.startsWith("https") ? https : http;
    const req = lib.get(url, { timeout: timeoutMs }, (res) => {
      let body = "";
      res.on("data", (chunk) => { if (body.length < 512 * 1024) body += chunk; });
      res.on("end", () => resolve({ status: res.statusCode, body }));
    });
    req.on("timeout", () => { req.destroy(); resolve({ status: 0, body: "", error: "timeout" }); });
    req.on("error", (error) => resolve({ status: 0, body: "", error: error.code || error.message }));
  });
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function killTree(pid) {
  try {
    if (process.platform === "win32") execSync(`taskkill /PID ${pid} /T /F`, { stdio: "ignore" });
    else process.kill(-pid, "SIGKILL");
  } catch (_) { /* already exited */ }
}

async function main() {
  const argv = process.argv.slice(2);
  const opts = {};
  for (let i = 0; i < argv.length; i += 2) opts[argv[i].replace(/^--/, "")] = argv[i + 1];
  if (!opts.config || !opts.repo) {
    console.error("Usage: node boot-smoke.js --config <upgrade.config.json> --repo <repo_path> [--boot-timeout <sec>]");
    process.exit(2);
  }

  const config = JSON.parse(fs.readFileSync(opts.config, "utf8"));
  if (!config.start_cmd || !config.health_url) {
    console.error(JSON.stringify({ error: "upgrade.config.json must define start_cmd and health_url for the boot-smoke gate" }));
    process.exit(2);
  }
  const bootTimeoutMs = (Number(opts["boot-timeout"]) || 60) * 1000;
  const cwd = config.start_cwd ? path.join(opts.repo, config.start_cwd) : opts.repo;
  const env = { ...process.env, ...(config.env || {}) };

  let serverLog = "";
  const child = spawn(config.start_cmd, { shell: true, cwd, env, detached: process.platform !== "win32" });
  child.stdout.on("data", (d) => { serverLog += d; });
  child.stderr.on("data", (d) => { serverLog += d; });
  let exited = null;
  child.on("exit", (code) => { exited = code === null ? 1 : code; });

  const failures = [];
  const routes = [];

  // Boot: poll health_url.
  const bootDeadline = Date.now() + bootTimeoutMs;
  let booted = false;
  while (Date.now() < bootDeadline && exited === null) {
    const res = await fetchUrl(config.health_url, 3000);
    if (res.status >= 200 && res.status < 500) { booted = true; break; }
    await sleep(500);
  }
  if (!booted) {
    failures.push(exited !== null
      ? `server process exited with code ${exited} before becoming healthy`
      : `health_url ${config.health_url} not answering within ${bootTimeoutMs / 1000}s`);
  } else {
    const origin = new URL(config.health_url).origin;
    const errorStrings = config.error_strings || [];
    for (const route of config.smoke_routes || []) {
      const url = origin + route;
      const res = await fetchUrl(url, 15000);
      const routeFailures = [];
      if (res.error || res.status === 0) routeFailures.push(`request failed: ${res.error}`);
      else if (res.status >= 400) routeFailures.push(`status ${res.status}`);
      for (const s of errorStrings) {
        if (res.body && res.body.includes(s)) routeFailures.push(`error string on page: ${JSON.stringify(s)}`);
      }
      routes.push({ route, status: res.status, ok: routeFailures.length === 0, failures: routeFailures });
      if (routeFailures.length > 0) failures.push(`${route}: ${routeFailures.join("; ")}`);
    }
    if (exited !== null) failures.push(`server process exited with code ${exited} during smoke run`);
    if (/uncaughtException|UnhandledPromiseRejection/i.test(serverLog)) {
      failures.push("uncaught exception / unhandled rejection in server logs");
    }
  }

  if (child.pid) killTree(child.pid);
  await sleep(300);

  const result = { passed: failures.length === 0, booted, routes, failures, server_log_tail: serverLog.split(/\r?\n/).slice(-40).join("\n") };
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.passed ? 0 : 1);
}

main().catch((error) => {
  console.error(JSON.stringify({ error: error.message }));
  process.exit(1);
});
