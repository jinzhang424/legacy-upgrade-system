#!/usr/bin/env node
const assert = require("assert");
const { spawnSync } = require("child_process");
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
  dependency_graph: {
    nodes: [{ id: "express", version: "4.18.2", type: "external" }],
    edges: [{ from: "src/a.js", to: "express", relationship: "requires" }]
  },
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

const validTestPlan = {
  test_cases: [
    { id: "TC001", name: "keeps provider behavior", type: "regression", priority: "high", target_file: "src/a.js", what_to_verify: "Existing provider output is unchanged.", expected_behavior: "Golden values match the pre-upgrade baseline." },
    { id: "TC002", name: "module loads", type: "unit", priority: "medium", target_file: "src/a.js", what_to_verify: "Module exports still load.", expected_behavior: "require succeeds with the expected exports." }
  ],
  testing_strategy: "Characterization tests against golden baselines plus module-load checks.",
  coverage_goals: "All high-risk changed files covered by at least one case.",
  framework_recommendations: "Reuse the repo's existing test framework.",
  artifact_coverage: coverage(["impact_report", "change_plan"], ["planned_high_risk_changes", "validation_criteria"])
};

// E12 requires passed execute artifacts to reference real evidence files.
const evidenceDir = path.join(tmp, "evidence", "execute-1");
fs.mkdirSync(evidenceDir, { recursive: true });
fs.writeFileSync(path.join(evidenceDir, "test.log"), "ok\n");
fs.writeFileSync(path.join(evidenceDir, "test.json"), JSON.stringify({
  gate: "test", stage: "execute-1", command: "npm test", exit_code: 0, log_path: "test.log"
}));
const evidencePath = path.join(evidenceDir, "test.json");

const validExecute = {
  batch_sequence: 1,
  status: "passed",
  changes_applied: ["src/a.js"],
  validation_results: [{ criterion_type: "test", command_or_check: "npm test", outcome: "passed", output: "ok", evidence_path: evidencePath }],
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
  supplementary_tests: [{ test_file: "test/extra.test.js", test_name: "covers uncovered hunk", reason: "Diff hunk in src/a.js not covered by the TestPlan." }],
  test_files_created: ["test/a.test.js", "test/extra.test.js"],
  coverage_notes: "Core behavior covered.",
  run_results: { total: 2, passing: 2, failing: 0, skipped: 0 },
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

assert.strictEqual(validate("test-plan", write("valid-test-plan.json", validTestPlan)).decision, "approved");

const testPlanMissingTarget = { ...validTestPlan, test_cases: [{ ...validTestPlan.test_cases[0] }, validTestPlan.test_cases[1]] };
delete testPlanMissingTarget.test_cases[0].target_file;
const missingTargetReport = validate("test-plan", write("test-plan-missing-target.json", testPlanMissingTarget));
assert.strictEqual(missingTargetReport.decision, "rejected");
assert(missingTargetReport.rejection_reasons.some((reason) => reason.startsWith("T2:")));

const testPlanBadCaseType = { ...validTestPlan, test_cases: [{ ...validTestPlan.test_cases[0], type: "smoke" }] };
const badCaseTypeReport = validate("test-plan", write("test-plan-bad-type.json", testPlanBadCaseType));
assert.strictEqual(badCaseTypeReport.decision, "rejected");
assert(badCaseTypeReport.rejection_reasons.some((reason) => reason.startsWith("T4:")));

// T7 is minor: a plan with no regression case is flagged but not auto-rejected.
const testPlanNoRegression = { ...validTestPlan, test_cases: [validTestPlan.test_cases[1]] };
const noRegressionReport = validate("test-plan", write("test-plan-no-regression.json", testPlanNoRegression));
assert(noRegressionReport.criteria_results.some((item) => item.criterion_id === "T7" && !item.passed));

const planBadChangeType = { ...validPlan, ordered_changes: [{ ...validPlan.ordered_changes[0], change_type: "update" }] };
const badChangeTypeReport = validate("plan", write("plan-bad-change-type.json", planBadChangeType));
assert.strictEqual(badChangeTypeReport.decision, "rejected");
assert(badChangeTypeReport.rejection_reasons.some((reason) => reason.startsWith("P4:")));

const planBadCriterionType = { ...validPlan, test_validation_criteria: [{ ...validPlan.test_validation_criteria[0], type: "file_exists" }] };
assert(validate("plan", write("plan-bad-criterion-type.json", planBadCriterionType)).criteria_results.some((item) => item.criterion_id === "P7" && !item.passed));

const testResultBadRunResults = { ...validTestResult, run_results: { total: 2, passing: "2", failing: 0, skipped: 0 } };
assert(validate("test-result", write("test-result-bad-run-results.json", testResultBadRunResults)).criteria_results.some((item) => item.criterion_id === "R8" && !item.passed));

// E12: passed without any evidence_path is rejected.
const executeNoEvidence = {
  ...validExecute,
  validation_results: [{ criterion_type: "test", command_or_check: "npm test", outcome: "passed", output: "ok" }]
};
const noEvidenceReport = validate("execute", write("execute-no-evidence.json", executeNoEvidence));
assert.strictEqual(noEvidenceReport.decision, "rejected");
assert(noEvidenceReport.rejection_reasons.some((reason) => reason.startsWith("E12:")));

// E12: evidence with a nonzero exit code is rejected.
fs.writeFileSync(path.join(evidenceDir, "failing.json"), JSON.stringify({ gate: "harness", exit_code: 1, log_path: "test.log" }));
const executeFailingEvidence = {
  ...validExecute,
  validation_results: [{ ...validExecute.validation_results[0], evidence_path: path.join(evidenceDir, "failing.json") }]
};
assert.strictEqual(validate("execute", write("execute-failing-evidence.json", executeFailingEvidence)).decision, "rejected");

// E12: deleting the evidence log invalidates a previously approved artifact.
const validExecuteFile = write("valid-execute-log-check.json", validExecute);
assert.strictEqual(validate("execute", validExecuteFile).decision, "approved");
fs.unlinkSync(path.join(evidenceDir, "test.log"));
assert.strictEqual(validate("execute", validExecuteFile).decision, "rejected");
fs.writeFileSync(path.join(evidenceDir, "test.log"), "ok\n");

// Failed results do not require evidence (agents must be able to report failure).
const failedExecuteWithSummary = {
  ...validExecute,
  status: "failed",
  validation_results: [{ criterion_type: "test", command_or_check: "npm test", outcome: "failed", output: "boom" }],
  failure_summary: "npm test failed with 3 assertion errors in provider tests."
};
assert.strictEqual(validate("execute", write("failed-execute-with-summary.json", failedExecuteWithSummary)).decision, "approved");

assert.strictEqual(validate("execute", write("valid-execute.json", validExecute)).decision, "approved");
assert.strictEqual(validate("test-result", write("valid-test-result.json", validTestResult)).decision, "approved");

// CLI --out: full report goes to the file, stdout is a single compact summary line.
const validatorCli = path.join(__dirname, "validate-upgrade-artifact.js");

const cliOutPath = path.join(tmp, "reports", "analyze-1.json");
const cliOk = spawnSync(process.execPath, [validatorCli, "analyze", write("cli-valid-analyze.json", validAnalyze), "--out", cliOutPath], { encoding: "utf8" });
assert.strictEqual(cliOk.status, 0);
const okLine = JSON.parse(cliOk.stdout);
assert.strictEqual(okLine.decision, "approved");
assert.strictEqual(okLine.report_path, cliOutPath);
assert.strictEqual(okLine.failed, undefined);
assert(typeof okLine.confidence_score === "number");
const okReport = JSON.parse(fs.readFileSync(cliOutPath, "utf8"));
assert.strictEqual(okReport.decision, "approved");
assert.strictEqual(okReport.agent_type, "analyze");
assert(Array.isArray(okReport.criteria_results) && okReport.criteria_results.length > 0);

const cliBadOutPath = path.join(tmp, "reports", "analyze-2.json");
const cliBad = spawnSync(process.execPath, [validatorCli, "analyze", write("cli-bad-enum.json", badEnum), "--out", cliBadOutPath], { encoding: "utf8" });
assert.strictEqual(cliBad.status, 1);
const badLine = JSON.parse(cliBad.stdout);
assert.strictEqual(badLine.decision, "rejected");
assert(badLine.failed.some((item) => item.id === "A4" && item.severity === "critical" && item.detail.length > 0));
assert.strictEqual(JSON.parse(fs.readFileSync(cliBadOutPath, "utf8")).decision, "rejected");

// Without --out the full report still goes to stdout (backwards compatible).
const cliLegacy = spawnSync(process.execPath, [validatorCli, "analyze", write("cli-legacy-analyze.json", validAnalyze)], { encoding: "utf8" });
assert.strictEqual(cliLegacy.status, 0);
assert(Array.isArray(JSON.parse(cliLegacy.stdout).criteria_results));

// fix-upgrade-artifact --out writes the post-fix validation report.
const fixerCli = path.join(__dirname, "fix-upgrade-artifact.js");
const e8Artifact = write("cli-e8-execute.json", { ...validExecute, failure_summary: "leftover text on a passed result" });
const fixOutPath = path.join(tmp, "reports", "execute-1-attempt-1.json");
const cliFix = spawnSync(process.execPath, [fixerCli, "execute", e8Artifact, "--out", fixOutPath], { encoding: "utf8" });
assert.strictEqual(cliFix.status, 0);
const fixLine = JSON.parse(cliFix.stdout);
assert(fixLine.applied.includes("E8"));
assert.strictEqual(fixLine.decision, "approved");
assert.strictEqual(JSON.parse(fs.readFileSync(fixOutPath, "utf8")).decision, "approved");
assert.strictEqual(JSON.parse(fs.readFileSync(e8Artifact, "utf8")).failure_summary, null);

// A nonexistent artifact path yields a single critical MISSING criterion, not a parse error.
const missingReport = validate("execute", path.join(tmp, "does-not-exist.json"));
assert.strictEqual(missingReport.decision, "rejected");
assert(missingReport.rejection_reasons.some((reason) => reason.startsWith("MISSING:")));

// Fixer CLI on a nonexistent artifact: exit 1 (not 2), MISSING in still_failing,
// nothing applied, and the --out report still written — the orchestrator's
// single-gate-call flow depends on this.
const fixMissingOut = path.join(tmp, "reports", "execute-missing-attempt-1.json");
const cliFixMissing = spawnSync(process.execPath, [fixerCli, "execute", path.join(tmp, "nope.json"), "--out", fixMissingOut], { encoding: "utf8" });
assert.strictEqual(cliFixMissing.status, 1);
const fixMissingLine = JSON.parse(cliFixMissing.stdout);
assert(fixMissingLine.still_failing.includes("MISSING"));
assert.deepStrictEqual(fixMissingLine.applied, []);
assert.strictEqual(JSON.parse(fs.readFileSync(fixMissingOut, "utf8")).decision, "rejected");

// Fixer CLI on a corrupt artifact: exit 1 with PARSE in still_failing.
const corruptArtifact = write("cli-corrupt.json", "{ nope");
const cliFixCorrupt = spawnSync(process.execPath, [fixerCli, "execute", corruptArtifact], { encoding: "utf8" });
assert.strictEqual(cliFixCorrupt.status, 1);
assert(JSON.parse(cliFixCorrupt.stdout).still_failing.includes("PARSE"));

// --- Schema-consistency sweep ---
// The .schema.json files declare each artifact's contract; the validator hard-codes
// the same contract. This sweep fails when the two drift: every valid fixture must
// satisfy its schema, and every schema violation (missing required field, invalid
// enum value) must be flagged by at least one validator criterion.

const schemasDir = path.join(__dirname, "..", "schemas");
const contract = {
  analyze: ["impact-report.schema.json", validAnalyze],
  plan: ["change-plan.schema.json", validPlan],
  "test-plan": ["test-plan.schema.json", validTestPlan],
  execute: ["validation-result.schema.json", validExecute],
  "test-result": ["test-result.schema.json", validTestResult]
};

// Minimal draft-07 subset checker: type, required, properties, items, enum, oneOf.
function schemaErrors(schema, value, at = "$", errors = []) {
  if (schema.oneOf) {
    if (!schema.oneOf.some((branch) => schemaErrors(branch, value, at, []).length === 0)) {
      errors.push(`${at}: matches no oneOf branch`);
    }
    return errors;
  }
  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${at}: value not in enum`);
    return errors;
  }
  if (schema.type) {
    const types = Array.isArray(schema.type) ? schema.type : [schema.type];
    const actual = value === null ? "null" : Array.isArray(value) ? "array" : typeof value;
    if (!types.includes(actual)) {
      errors.push(`${at}: expected ${types.join("|")}, got ${actual}`);
      return errors;
    }
  }
  if (Array.isArray(value) && schema.items) {
    value.forEach((item, index) => schemaErrors(schema.items, item, `${at}[${index}]`, errors));
  } else if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const field of schema.required || []) {
      if (!(field in value)) errors.push(`${at}.${field}: missing required field`);
    }
    for (const [key, sub] of Object.entries(schema.properties || {})) {
      if (key in value) schemaErrors(sub, value[key], `${at}.${key}`, errors);
    }
  }
  return errors;
}

// One mutation per schema `required` field (delete it) and per enum/oneOf property
// (set an out-of-enum value), walking nested objects and the first array element.
function collectMutations(schema, value, keyPath = [], mutations = []) {
  if ((schema.enum || schema.oneOf) && keyPath.length > 0) {
    mutations.push({ kind: "invalidate", keyPath, desc: `${keyPath.join(".")} = out-of-enum value` });
  }
  if (value === null || typeof value !== "object") return mutations;
  if (Array.isArray(value)) {
    if (schema.items && value.length > 0) collectMutations(schema.items, value[0], [...keyPath, 0], mutations);
    return mutations;
  }
  for (const field of schema.required || []) {
    mutations.push({ kind: "delete", keyPath, field, desc: `delete ${[...keyPath, field].join(".")}` });
  }
  for (const [key, sub] of Object.entries(schema.properties || {})) {
    if (key in value) collectMutations(sub, value[key], [...keyPath, key], mutations);
  }
  return mutations;
}

function getAt(root, keyPath) {
  return keyPath.reduce((node, key) => node[key], root);
}

let mutationCount = 0;
for (const [agentType, [schemaFile, fixture]] of Object.entries(contract)) {
  const schema = JSON.parse(fs.readFileSync(path.join(schemasDir, schemaFile), "utf8"));
  const fixtureErrors = schemaErrors(schema, fixture);
  assert.deepStrictEqual(fixtureErrors, [], `${agentType} fixture violates ${schemaFile}: ${fixtureErrors.join("; ")}`);

  for (const mutation of collectMutations(schema, fixture)) {
    const mutated = JSON.parse(JSON.stringify(fixture));
    if (mutation.kind === "delete") {
      delete getAt(mutated, mutation.keyPath)[mutation.field];
    } else {
      const parent = getAt(mutated, mutation.keyPath.slice(0, -1));
      parent[mutation.keyPath[mutation.keyPath.length - 1]] = "__not_in_enum__";
    }
    const report = validate(agentType, write(`mutation-${++mutationCount}.json`, mutated));
    assert(
      report.criteria_results.some((item) => !item.passed),
      `validator missed a schema violation (${agentType}): ${mutation.desc}`
    );
  }
}

console.log(`schema-consistency sweep passed (${mutationCount} mutations across ${Object.keys(contract).length} artifact types)`);
console.log("validate-upgrade-artifact fixtures passed");
