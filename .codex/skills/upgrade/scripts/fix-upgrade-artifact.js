#!/usr/bin/env node
// Applies safe mechanical corrections to upgrade artifacts that failed
// deterministic validation, so a whole correction agent never has to be
// spawned for a one-field fix. Only content-preserving transforms are
// allowed here; anything requiring judgment is reported as unresolved.
//
// Usage: node fix-upgrade-artifact.js <agent_type> <artifact_path> [criterion_ids...]
//   If no criterion ids are given, the validator is run first and every
//   failed criterion is attempted.
// Exit codes: 0 = artifact now validates approved, 1 = unresolved failures remain, 2 = usage/IO error.
const fs = require("fs");
const { validate } = require("./validate-upgrade-artifact");

function coerceCoverage(data) {
  const coverage = data.artifact_coverage;
  if (!coverage || typeof coverage !== "object" || Array.isArray(coverage)) return false;
  let changed = false;
  if (typeof coverage.file_context_refs === "string") {
    coverage.file_context_refs = [coverage.file_context_refs];
    changed = true;
  }
  if (typeof coverage.deferred_items === "string" && coverage.deferred_items.trim() !== "" && !Number.isNaN(Number(coverage.deferred_items))) {
    coverage.deferred_items = Number(coverage.deferred_items);
    changed = true;
  }
  if (coverage.full_artifact_loaded === "true" || coverage.full_artifact_loaded === "false") {
    coverage.full_artifact_loaded = coverage.full_artifact_loaded === "true";
    changed = true;
  }
  return changed;
}

// Each fixer mutates `data` and returns true when it changed something.
const FIXERS = {
  // Passed results must have null failure_summary; preserve the text in notes.
  E8(data) {
    if (data.status !== "passed" || typeof data.failure_summary !== "string" || data.failure_summary.length === 0) return false;
    const moved = `[moved from failure_summary by fix-upgrade-artifact E8] ${data.failure_summary}`;
    data.notes = typeof data.notes === "string" && data.notes.length > 0 ? `${data.notes}\n${moved}` : moved;
    data.failure_summary = null;
    return true;
  },
  // batch_sequence given as a numeric string.
  E1(data) {
    if (typeof data.batch_sequence === "string" && data.batch_sequence !== "final" && data.batch_sequence.trim() !== "" && !Number.isNaN(Number(data.batch_sequence))) {
      data.batch_sequence = Number(data.batch_sequence);
      return true;
    }
    return false;
  },
  // total_affected_files must equal affected_files.length.
  A7(data) {
    if (!Array.isArray(data.affected_files) || !data.risk_summary || typeof data.risk_summary !== "object") return false;
    if (data.risk_summary.total_affected_files === data.affected_files.length) return false;
    data.risk_summary.total_affected_files = data.affected_files.length;
    return true;
  },
  // Invalid optional priority enum: drop the field, preserving the raw value in a note field.
  T5(data) {
    const priorities = new Set(["high", "medium", "low"]);
    if (!Array.isArray(data.test_cases)) return false;
    let changed = false;
    for (const entry of data.test_cases) {
      if (entry && typeof entry === "object" && entry.priority !== undefined && !priorities.has(entry.priority)) {
        entry.priority_raw_invalid = entry.priority;
        delete entry.priority;
        changed = true;
      }
    }
    return changed;
  },
  COVERAGE: coerceCoverage
};

function main() {
  const [, , agentType, artifactPath, ...requested] = process.argv;
  if (!agentType || !artifactPath) {
    console.error("Usage: node fix-upgrade-artifact.js <agent_type> <artifact_path> [criterion_ids...]");
    process.exit(2);
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  } catch (error) {
    console.error(JSON.stringify({ error: `Cannot read/parse artifact: ${error.message}` }));
    process.exit(2);
  }

  let codes = requested;
  if (codes.length === 0) {
    const before = validate(agentType, artifactPath);
    codes = before.criteria_results.filter((c) => !c.passed).map((c) => c.criterion_id);
  }

  const applied = [];
  const unresolved = [];
  for (const code of codes) {
    const fixer = FIXERS[code];
    if (fixer && fixer(data)) applied.push(code);
    else unresolved.push(code);
  }

  if (applied.length > 0) {
    fs.writeFileSync(artifactPath, JSON.stringify(data, null, 2) + "\n");
  }

  const after = validate(agentType, artifactPath);
  const stillFailing = after.criteria_results.filter((c) => !c.passed).map((c) => c.criterion_id);
  console.log(JSON.stringify({
    applied,
    unresolved_requested: unresolved.filter((code) => stillFailing.includes(code)),
    still_failing: stillFailing,
    decision: after.decision
  }, null, 2));
  process.exit(after.decision === "approved" ? 0 : 1);
}

main();
