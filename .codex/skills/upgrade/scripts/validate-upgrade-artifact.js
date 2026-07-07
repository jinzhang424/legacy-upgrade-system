#!/usr/bin/env node
const fs = require("fs");
const path = require("path");

function result(id, criterion, severity, passed, detail = "") {
  return { criterion_id: id, criterion, severity, passed, detail: passed ? "" : detail };
}

function isObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function hasString(value) {
  return typeof value === "string" && value.length > 0;
}

function validateArtifactCoverage(data) {
  const coverage = data.artifact_coverage;
  return result(
    "COVERAGE",
    "`artifact_coverage` is present and sufficient",
    "critical",
    isObject(coverage) &&
      Array.isArray(coverage.artifact_refs) &&
      Array.isArray(coverage.slices_loaded) &&
      (coverage.file_context_refs === undefined || Array.isArray(coverage.file_context_refs)) &&
      typeof coverage.full_artifact_loaded === "boolean" &&
      typeof coverage.deferred_items === "number" &&
      coverage.confidence === "sufficient" &&
      hasString(coverage.reason),
    "`artifact_coverage` must include artifact_refs, slices_loaded, full_artifact_loaded, numeric deferred_items, confidence=\"sufficient\", and reason; file_context_refs must be an array when present."
  );
}

function validateAnalyze(data) {
  const criteria = [];
  const affected = data.affected_files;
  criteria.push(result("A1", "`affected_files` is present, is an array, and has at least one entry", "critical", Array.isArray(affected) && affected.length > 0, "`affected_files` must be a non-empty array."));
  criteria.push(result("A2", "`dependency_graph` is present", "critical", Object.prototype.hasOwnProperty.call(data, "dependency_graph"), "`dependency_graph` is missing."));
  criteria.push(result("A3", "`risk_summary` is present", "critical", Object.prototype.hasOwnProperty.call(data, "risk_summary"), "`risk_summary` is missing."));

  const changeTypes = new Set(["modify", "delete", "create"]);
  const usageTypes = new Set(["direct_usage", "transitive_dependency", "configuration"]);
  const riskLevels = new Set(["low", "medium", "high"]);
  criteria.push(result(
    "A4",
    "Every entry in `affected_files` has required fields and valid enum values",
    "critical",
    Array.isArray(affected) && affected.every((entry) =>
      isObject(entry) &&
      hasString(entry.file_path) &&
      changeTypes.has(entry.change_type) &&
      usageTypes.has(entry.usage_type) &&
      riskLevels.has(entry.risk_level) &&
      hasString(entry.reason)
    ),
    "One or more affected file entries is missing required fields or valid enum values."
  ));

  const graph = data.dependency_graph;
  criteria.push(result("A5", "`dependency_graph` contains both `nodes` and `edges` arrays", "minor", isObject(graph) && Array.isArray(graph.nodes) && Array.isArray(graph.edges), "`dependency_graph.nodes` and `dependency_graph.edges` must both be arrays."));

  const risk = data.risk_summary;
  criteria.push(result(
    "A6",
    "`risk_summary` contains required fields",
    "minor",
    isObject(risk) &&
      typeof risk.total_affected_files === "number" &&
      typeof risk.high_risk_count === "number" &&
      Array.isArray(risk.breaking_changes) &&
      hasString(risk.notes),
    "`risk_summary` must include numeric total_affected_files, numeric high_risk_count, breaking_changes, and notes."
  ));
  criteria.push(result("A7", "`risk_summary.total_affected_files` equals the actual length of `affected_files`", "minor", Array.isArray(affected) && isObject(risk) && risk.total_affected_files === affected.length, "`risk_summary.total_affected_files` does not match `affected_files.length`."));
  criteria.push(result("A8", "`coverage_notes` is present and contains a meaningful explanation (> 10 chars)", "minor", typeof data.coverage_notes === "string" && data.coverage_notes.length > 10, "`coverage_notes` must be a meaningful string."));
  criteria.push(validateArtifactCoverage(data));
  return criteria;
}

function validatePlan(data) {
  const criteria = [];
  const ordered = data.ordered_changes;
  const rollback = data.rollback_steps;
  const validation = data.test_validation_criteria;

  criteria.push(result("P1", "`ordered_changes` is present, is an array, and has at least one entry", "critical", Array.isArray(ordered) && ordered.length > 0, "`ordered_changes` must be a non-empty array."));
  criteria.push(result("P2", "`rollback_steps` is present and has at least one entry", "critical", Array.isArray(rollback) && rollback.length > 0, "`rollback_steps` must be a non-empty array."));
  criteria.push(result("P3", "`test_validation_criteria` is present and has at least one entry", "critical", Array.isArray(validation) && validation.length > 0, "`test_validation_criteria` must be a non-empty array."));

  const riskLevels = new Set(["low", "medium", "high"]);
  criteria.push(result(
    "P4",
    "Every entry in `ordered_changes` has required gate fields",
    "critical",
    Array.isArray(ordered) && ordered.every((entry) =>
      isObject(entry) &&
      hasString(entry.file_path) &&
      hasString(entry.change_type) &&
      riskLevels.has(entry.estimated_risk) &&
      hasString(entry.rationale)
    ),
    "One or more ordered changes is missing file_path, change_type, estimated_risk, or rationale."
  ));

  const sequences = Array.isArray(ordered) ? ordered.map((entry) => entry.sequence) : [];
  const sequenceValues = sequences.filter((value) => value !== undefined && value !== null);
  criteria.push(result("P5", "`sequence` values in `ordered_changes` are present and unique", "critical", Array.isArray(ordered) && sequenceValues.length === ordered.length && new Set(sequenceValues.map(String)).size === ordered.length, "`sequence` values must be present and unique."));
  criteria.push(result("P6", "Each ordered change includes specific descriptions", "minor", Array.isArray(ordered) && ordered.every((entry) => typeof entry.change_description === "string" && entry.change_description.length > 30 && hasString(entry.rollback_description)), "One or more ordered changes has an insufficient change_description or missing rollback_description."));
  criteria.push(result("P7", "Every validation criterion has required fields", "minor", Array.isArray(validation) && validation.every((entry) => isObject(entry) && hasString(entry.type) && hasString(entry.command_or_check) && hasString(entry.expected_outcome)), "One or more validation criteria is missing type, command_or_check, or expected_outcome."));
  criteria.push(result("P8", "`plan_summary` is present and non-trivial (> 20 chars)", "minor", typeof data.plan_summary === "string" && data.plan_summary.length > 20, "`plan_summary` must be a non-trivial string."));
  const pairs = Array.isArray(ordered) ? ordered.map((entry) => `${entry.file_path}\u0000${entry.change_type}`) : [];
  criteria.push(result("P9", "No two entries share the same `(file_path, change_type)` pair", "minor", new Set(pairs).size === pairs.length, "Two or more ordered changes share the same file_path and change_type pair."));
  criteria.push(validateArtifactCoverage(data));
  return criteria;
}

function validateTestPlan(data) {
  const criteria = [];
  const cases = data.test_cases;
  const types = new Set(["unit", "integration", "regression", "e2e"]);
  const priorities = new Set(["high", "medium", "low"]);

  criteria.push(result("T1", "`test_cases` is present, is an array, and has at least one entry", "critical", Array.isArray(cases) && cases.length > 0, "`test_cases` must be a non-empty array."));
  criteria.push(result("T2", "Every test case has required fields", "critical", Array.isArray(cases) && cases.every((entry) => isObject(entry) && hasString(entry.id) && hasString(entry.name) && hasString(entry.type) && hasString(entry.what_to_verify) && hasString(entry.expected_behavior)), "One or more test cases is missing id, name, type, what_to_verify, or expected_behavior."));
  criteria.push(result("T3", "`testing_strategy` is present and non-trivial (> 20 chars)", "critical", typeof data.testing_strategy === "string" && data.testing_strategy.length > 20, "`testing_strategy` must be a non-trivial string."));
  criteria.push(result("T4", "All `type` values are valid enum members", "critical", Array.isArray(cases) && cases.every((entry) => types.has(entry.type)), "One or more test cases has an invalid type."));
  criteria.push(result("T5", "All optional `priority` values are valid enum members", "minor", Array.isArray(cases) && cases.every((entry) => entry.priority === undefined || priorities.has(entry.priority)), "One or more test cases has an invalid priority."));
  criteria.push(result("T6", "`coverage_goals` is present and non-empty", "minor", hasString(data.coverage_goals), "`coverage_goals` must be a non-empty string."));
  criteria.push(result("T7", "At least one test case is a regression test", "minor", Array.isArray(cases) && cases.some((entry) => entry.type === "regression"), "At least one regression test case is required."));
  criteria.push(validateArtifactCoverage(data));
  return criteria;
}

// An evidence record is valid when the referenced JSON exists, was produced by
// run-gate.js (has a numeric exit_code), recorded success, and its log file
// still exists. Evidence paths are workspace-root-relative or absolute.
function evidenceOk(entry) {
  if (!hasString(entry.evidence_path)) return false;
  const evidencePath = path.resolve(entry.evidence_path);
  let evidence;
  try {
    evidence = JSON.parse(fs.readFileSync(evidencePath, "utf8"));
  } catch (_) {
    return false;
  }
  if (typeof evidence.exit_code !== "number" || evidence.exit_code !== 0) return false;
  if (evidence.log_path !== undefined) {
    const logPath = path.isAbsolute(evidence.log_path)
      ? evidence.log_path
      : path.join(path.dirname(evidencePath), evidence.log_path);
    if (!fs.existsSync(logPath)) return false;
  }
  return true;
}

function validateExecute(data) {
  const criteria = [];
  const results = data.validation_results;
  const status = data.status;
  criteria.push(result("E1", "`batch_sequence` is present and is a number or \"final\"", "critical", typeof data.batch_sequence === "number" || data.batch_sequence === "final", "`batch_sequence` must be a number or the exact string \"final\"."));
  criteria.push(result("E2", "`status` is exactly \"passed\" or \"failed\"", "critical", status === "passed" || status === "failed", "`status` must be \"passed\" or \"failed\"."));
  criteria.push(result("E3", "Failed results include a descriptive failure summary", "critical", status !== "failed" || (typeof data.failure_summary === "string" && data.failure_summary.length > 20), "`failure_summary` must be descriptive when status is failed."));
  criteria.push(result("E4", "`validation_results` entries have required fields", "minor", Array.isArray(results) && results.length > 0 && results.every((entry) => isObject(entry) && hasString(entry.criterion_type) && hasString(entry.command_or_check) && hasString(entry.outcome) && typeof entry.output === "string"), "`validation_results` must be a non-empty array with criterion_type, command_or_check, outcome, and output."));
  criteria.push(result("E5", "Validation outcomes are valid and consistent", "minor", Array.isArray(results) && results.every((entry) => entry.outcome === "passed" || entry.outcome === "failed") && (status !== "passed" || results.every((entry) => entry.outcome === "passed")), "Outcomes must be passed/failed, and passed status cannot contain failed outcomes."));
  criteria.push(result("E6", "`changes_applied` is present and is an array", "minor", Array.isArray(data.changes_applied), "`changes_applied` must be an array."));
  criteria.push(result("E7", "`commit_refs` is present and is an array", "minor", Array.isArray(data.commit_refs), "`commit_refs` must be an array."));
  criteria.push(result("E8", "Passed results have null failure_summary", "minor", status !== "passed" || data.failure_summary === null, "`failure_summary` must be null when status is passed."));
  criteria.push(result("E9", "`baseline_status` is present and is an array", "critical", Array.isArray(data.baseline_status), "`baseline_status` must record git status --porcelain=v1 lines from execution start."));
  criteria.push(result("E10", "`baseline_untracked_files` is present and is an array", "critical", Array.isArray(data.baseline_untracked_files), "`baseline_untracked_files` must record pre-existing untracked paths from execution start."));
  criteria.push(result("E11", "`staged_paths` is present and is a subset of `changes_applied`", "critical", Array.isArray(data.staged_paths) && Array.isArray(data.changes_applied) && data.staged_paths.every((item) => data.changes_applied.includes(item)), "`staged_paths` must contain only files from changes_applied/current batch."));
  criteria.push(result(
    "E12",
    "Passed results reference verifiable gate evidence",
    "critical",
    status !== "passed" || (Array.isArray(results) && results.length > 0 && results.every(evidenceOk)),
    "When status is passed, every validation_results entry must carry an evidence_path pointing to an existing run-gate.js evidence JSON with exit_code 0 and an intact log file. Self-reported outcomes without evidence are rejected."
  ));
  criteria.push(validateArtifactCoverage(data));
  return criteria;
}

function validateTestResult(data) {
  const criteria = [];
  const generated = data.tests_generated;
  const status = data.status;
  const generatedStatuses = new Set(["implemented", "skipped", "failed_to_implement"]);
  criteria.push(result("R1", "`status` is exactly \"passed\", \"partial\", or \"failed\"", "critical", status === "passed" || status === "partial" || status === "failed", "`status` must be passed, partial, or failed."));
  criteria.push(result("R2", "`tests_generated` is present and is a non-empty array", "critical", Array.isArray(generated) && generated.length > 0, "`tests_generated` must be a non-empty array."));
  criteria.push(result("R3", "Failed results include a descriptive failure summary", "critical", status !== "failed" || (typeof data.failure_summary === "string" && data.failure_summary.length > 20), "`failure_summary` must be descriptive when status is failed."));
  criteria.push(result("R4", "`test_files_created` is present and is an array", "minor", Array.isArray(data.test_files_created), "`test_files_created` must be an array."));
  criteria.push(result("R5", "Every generated test entry has required fields and valid status", "minor", Array.isArray(generated) && generated.every((entry) => isObject(entry) && hasString(entry.test_case_id) && hasString(entry.test_file) && generatedStatuses.has(entry.status)), "One or more generated test entries is missing test_case_id, test_file, or a valid status."));
  criteria.push(result("R6", "`coverage_notes` is present and non-empty", "minor", hasString(data.coverage_notes), "`coverage_notes` must be a non-empty string."));
  criteria.push(validateArtifactCoverage(data));
  return criteria;
}

function criteriaFor(type, data) {
  if (type === "analyze") return validateAnalyze(data);
  if (type === "plan") return validatePlan(data);
  if (type === "test-plan") return validateTestPlan(data);
  if (type === "execute") return validateExecute(data);
  if (type === "test-result") return validateTestResult(data);
  throw new Error(`Unsupported agent_type: ${type}`);
}

function buildReport(agentType, criteria) {
  let score = 1.0;
  let autoRejected = false;

  for (const item of criteria) {
    if (item.passed) continue;
    if (item.severity === "critical") {
      score -= 0.30;
      autoRejected = true;
    } else if (item.severity === "major") {
      score -= 0.15;
    } else {
      score -= 0.05;
    }
  }

  score = Math.max(0, Number(score.toFixed(2)));
  const failed = criteria.filter((item) => !item.passed);
  const severityOrder = { critical: 0, major: 1, minor: 2 };
  failed.sort((a, b) => severityOrder[a.severity] - severityOrder[b.severity]);

  return {
    agent_type: agentType,
    confidence_score: score,
    decision: score >= 0.7 && !autoRejected ? "approved" : "rejected",
    auto_rejected: autoRejected,
    criteria_results: criteria,
    rejection_reasons: failed.map((item) => `${item.criterion_id}: ${item.detail}`),
    recommendations: failed.map((item) => `Fix ${item.criterion_id}: ${item.criterion}`)
  };
}

function validate(agentType, artifactPath) {
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  } catch (error) {
    return buildReport(agentType, [
      result("PARSE", "Output is valid JSON", "critical", false, `Could not parse artifact JSON: ${error.message}`)
    ]);
  }

  try {
    return buildReport(agentType, criteriaFor(agentType, parsed));
  } catch (error) {
    return buildReport(agentType, [
      result("TYPE", "Agent type is supported", "critical", false, error.message)
    ]);
  }
}

if (require.main === module) {
  const [,, agentType, artifactPath] = process.argv;
  if (!agentType || !artifactPath) {
    console.error("Usage: node validate-upgrade-artifact.js <agent_type> <artifact_path>");
    process.exit(2);
  }

  const report = validate(agentType, artifactPath);
  console.log(JSON.stringify(report, null, 2));
  process.exit(report.decision === "approved" ? 0 : 1);
}

module.exports = { validate, criteriaFor, buildReport };
