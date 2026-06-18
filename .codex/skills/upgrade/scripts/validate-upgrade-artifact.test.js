#!/usr/bin/env node
const assert = require("assert");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { validate } = require("./validate-upgrade-artifact");

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "upgrade-validator-"));

function write(name, value) {
  const file = path.join(tmp, name);
  fs.writeFileSync(file, typeof value === "string" ? value : JSON.stringify(value, null, 2));
  return file;
}

function coverage(refs = ["impact_report"], slices = ["high_risk"]) {
  return {
    artifact_refs: refs,
    slices_loaded: slices,
    file_context_refs: ["file-context/src-a.js.json"],
    full_artifact_loaded: false,
    deferred_items: 0,
    confidence: "sufficient",
    reason: "Fixture loaded all required context."
  };
}

const validAnalyze = {
  affected_files: [{ file_path: "src/a.js", change_type: "modify", usage_type: "direct_usage", risk_level: "high", reason: "Uses changed API." }],
  dependency_graph: { nodes: [], edges: [] },
  risk_summary: { total_affected_files: 1, high_risk_count: 1, breaking_changes: ["API changed"], notes: "High risk path." },
  coverage_notes: "Repository scan covered all relevant fixtures.",
  artifact_coverage: coverage()
};

const validPlan = {
  ordered_changes: [{
    sequence: 1,
    file_path: "src/a.js",
    change_type: "modify",
    estimated_risk: "high",
    rationale: "Required by API migration.",
    change_description: "Replace the old API call with the new API call and preserve error handling.",
    rollback_description: "Restore the previous API call."
  }],
  rollback_steps: ["Restore src/a.js"],
  test_validation_criteria: [{ type: "test", command_or_check: "npm test", expected_outcome: "passes" }],
  plan_summary: "Updates the direct API usage and validates it with the existing test suite.",
  artifact_coverage: coverage(["impact_report"], ["high_risk", "direct_usage"])
};

const validExecute = {
  batch_sequence: 1,
  status: "passed",
  changes_applied: ["src/a.js"],
  validation_results: [{ criterion_type: "test", command_or_check: "npm test", outcome: "passed", output: "ok" }],
  failure_summary: null,
  commit_refs: ["abc123"],
  baseline_status: ["?? .claude/settings.json"],
  baseline_untracked_files: [".claude/settings.json"],
  staged_paths: ["src/a.js"],
  artifact_coverage: coverage(["change_plan"], ["batch_1", "validation_criteria", "rollback_summary"])
};

const validTestResult = {
  status: "partial",
  tests_generated: [{ test_case_id: "TC001", test_file: "test/a.test.js", test_name: "keeps behavior", status: "implemented", skip_reason: null }],
  supplementary_tests: [],
  test_files_created: ["test/a.test.js"],
  coverage_notes: "Core behavior covered.",
  run_results: { total: 1, passing: 1, failing: 0, skipped: 0 },
  failure_summary: null,
  artifact_coverage: coverage(["test_plan"], ["high_priority_tests"])
};

assert.strictEqual(validate("analyze", write("valid-analyze.json", validAnalyze)).decision, "approved");
assert.strictEqual(validate("analyze", write("invalid-json.json", "{ nope")).decision, "rejected");

const missingRequired = { ...validAnalyze };
delete missingRequired.affected_files;
assert.strictEqual(validate("analyze", write("missing-required.json", missingRequired)).decision, "rejected");

const badEnum = {
  ...validAnalyze,
  affected_files: [{ ...validAnalyze.affected_files[0], risk_level: "severe" }]
};
assert.strictEqual(validate("analyze", write("bad-enum.json", badEnum)).decision, "rejected");
assert(validate("analyze", write("bad-enum-again.json", badEnum)).rejection_reasons.some((reason) => reason.startsWith("A4:")));

const duplicateSequences = {
  ...validPlan,
  ordered_changes: [
    validPlan.ordered_changes[0],
    { ...validPlan.ordered_changes[0], file_path: "src/b.js" }
  ]
};
assert.strictEqual(validate("plan", write("duplicate-sequences.json", duplicateSequences)).decision, "rejected");
assert(validate("plan", write("duplicate-sequences-again.json", duplicateSequences)).rejection_reasons.some((reason) => reason.startsWith("P5:")));

const insufficientCoverage = {
  ...validPlan,
  artifact_coverage: { ...validPlan.artifact_coverage, confidence: "insufficient" }
};
assert.strictEqual(validate("plan", write("insufficient-coverage.json", insufficientCoverage)).decision, "rejected");

const failedExecuteNoSummary = {
  ...validExecute,
  status: "failed",
  validation_results: [{ ...validExecute.validation_results[0], outcome: "failed" }],
  failure_summary: null
};
assert.strictEqual(validate("execute", write("failed-execute-no-summary.json", failedExecuteNoSummary)).decision, "rejected");

const executeStagesUnrelated = {
  ...validExecute,
  staged_paths: ["src/a.js", "AGENTS.md"]
};
assert.strictEqual(validate("execute", write("execute-stages-unrelated.json", executeStagesUnrelated)).decision, "rejected");

const invalidTestResultStatus = { ...validTestResult, status: "done" };
assert.strictEqual(validate("test-result", write("invalid-test-result-status.json", invalidTestResultStatus)).decision, "rejected");

assert.strictEqual(validate("execute", write("valid-execute.json", validExecute)).decision, "approved");
assert.strictEqual(validate("test-result", write("valid-test-result.json", validTestResult)).decision, "approved");

console.log("validate-upgrade-artifact fixtures passed");
