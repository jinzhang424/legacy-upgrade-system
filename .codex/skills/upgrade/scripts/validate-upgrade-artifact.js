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
  const nodeTypes = new Set(["internal", "external"]);
  criteria.push(result(
    "A5",
    "`dependency_graph` contains valid `nodes` and `edges` arrays",
    "minor",
    isObject(graph) &&
      Array.isArray(graph.nodes) &&
      Array.isArray(graph.edges) &&
      graph.nodes.every((node) => isObject(node) && hasString(node.id) && hasString(node.version) && nodeTypes.has(node.type)) &&
      graph.edges.every((edge) => isObject(edge) && hasString(edge.from) && hasString(edge.to) && hasString(edge.relationship)),
    "`dependency_graph.nodes` and `dependency_graph.edges` must be arrays; every node needs id, version, and type (internal|external); every edge needs from, to, and relationship."
  ));

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

  const matrix = data.dependency_migration_matrix;
  criteria.push(result(
    "A9",
    "`dependency_migration_matrix` names every changed dependency's usage sites with evidence, or justifies finding none",
    "critical",
    Array.isArray(matrix) && matrix.length > 0 && matrix.every((entry) =>
      isObject(entry) &&
      hasString(entry.dependency) &&
      hasString(entry.from_version) &&
      hasString(entry.to_version) &&
      Array.isArray(entry.direct_usage_sites) &&
      entry.direct_usage_sites.every((site) => isObject(site) && hasString(site.file_path) && hasString(site.api_or_symbol) && hasString(site.evidence)) &&
      (entry.direct_usage_sites.length > 0 || (typeof entry.no_usage_justification === "string" && entry.no_usage_justification.length > 20))
    ),
    "`dependency_migration_matrix` must be a non-empty array with one entry per changed dependency; each entry needs dependency, from_version, to_version, and direct_usage_sites (each site: file_path, api_or_symbol, evidence), plus either at least one usage site or a no_usage_justification > 20 chars naming the searches that found none."
  ));

  const affectedPaths = new Set(Array.isArray(affected) ? affected.map((entry) => isObject(entry) ? entry.file_path : undefined) : []);
  const matrixEntries = Array.isArray(matrix) ? matrix : [];
  criteria.push(result(
    "A10",
    "Every migration-matrix usage site also appears in `affected_files`",
    "critical",
    matrixEntries.every((entry) =>
      !isObject(entry) || !Array.isArray(entry.direct_usage_sites) ||
      entry.direct_usage_sites.every((site) => !isObject(site) || affectedPaths.has(site.file_path))
    ),
    "One or more `dependency_migration_matrix` usage sites has a file_path that is missing from `affected_files` — a named call site can never drop out of the affected list."
  ));
  criteria.push(validateArtifactCoverage(data));
  return criteria;
}

// Reads the analyzer's migration-matrix slice from the run dir that holds the
// plan artifact (slices/ is a sibling of change-plan.json, same resolution
// pattern as evidenceOk). Returns { matrix } or { error } — never throws.
function readMigrationMatrixSlice(artifactPath) {
  if (!hasString(artifactPath)) {
    return { error: "No artifact path available to locate slices/impact-report-migration-matrix.json." };
  }
  const slicePath = path.join(path.dirname(path.resolve(artifactPath)), "slices", "impact-report-migration-matrix.json");
  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(slicePath, "utf8"));
  } catch (_) {
    return { error: `Migration-matrix slice not readable at ${slicePath} — the analysis stage did not produce the matrix slice.` };
  }
  const matrix = Array.isArray(parsed)
    ? parsed
    : isObject(parsed) && Array.isArray(parsed.dependency_migration_matrix)
      ? parsed.dependency_migration_matrix
      : null;
  if (matrix === null) {
    return { error: `Migration-matrix slice at ${slicePath} is not a dependency_migration_matrix array.` };
  }
  return { matrix };
}

function validatePlan(data, artifactPath) {
  const criteria = [];
  const ordered = data.ordered_changes;
  const rollback = data.rollback_steps;
  const validation = data.test_validation_criteria;

  criteria.push(result("P1", "`ordered_changes` is present, is an array, and has at least one entry", "critical", Array.isArray(ordered) && ordered.length > 0, "`ordered_changes` must be a non-empty array."));
  criteria.push(result("P2", "`rollback_steps` is present and has at least one entry", "critical", Array.isArray(rollback) && rollback.length > 0, "`rollback_steps` must be a non-empty array."));
  criteria.push(result("P3", "`test_validation_criteria` is present and has at least one entry", "critical", Array.isArray(validation) && validation.length > 0, "`test_validation_criteria` must be a non-empty array."));

  const riskLevels = new Set(["low", "medium", "high"]);
  const changeTypes = new Set(["modify", "delete", "create"]);
  criteria.push(result(
    "P4",
    "Every entry in `ordered_changes` has required gate fields and valid enum values",
    "critical",
    Array.isArray(ordered) && ordered.every((entry) =>
      isObject(entry) &&
      hasString(entry.file_path) &&
      changeTypes.has(entry.change_type) &&
      riskLevels.has(entry.estimated_risk) &&
      hasString(entry.rationale)
    ),
    "One or more ordered changes is missing file_path, change_type (modify|delete|create), estimated_risk, or rationale."
  ));

  const sequences = Array.isArray(ordered) ? ordered.map((entry) => entry.sequence) : [];
  const sequenceValues = sequences.filter((value) => value !== undefined && value !== null);
  criteria.push(result("P5", "`sequence` values in `ordered_changes` are present and unique", "critical", Array.isArray(ordered) && sequenceValues.length === ordered.length && new Set(sequenceValues.map(String)).size === ordered.length, "`sequence` values must be present and unique."));
  criteria.push(result("P6", "Each ordered change includes specific descriptions", "minor", Array.isArray(ordered) && ordered.every((entry) => typeof entry.change_description === "string" && entry.change_description.length > 30 && hasString(entry.rollback_description)), "One or more ordered changes has an insufficient change_description or missing rollback_description."));
  const criterionTypes = new Set(["syntax", "harness", "boot-smoke", "test"]);
  criteria.push(result("P7", "Every validation criterion has required fields and a valid gate type", "minor", Array.isArray(validation) && validation.every((entry) => isObject(entry) && criterionTypes.has(entry.type) && hasString(entry.command_or_check) && hasString(entry.expected_outcome)), "One or more validation criteria is missing command_or_check, expected_outcome, or a valid type (syntax|harness|boot-smoke|test)."));
  criteria.push(result("P8", "`plan_summary` is present and non-trivial (> 20 chars)", "minor", typeof data.plan_summary === "string" && data.plan_summary.length > 20, "`plan_summary` must be a non-trivial string."));
  const pairs = Array.isArray(ordered) ? ordered.map((entry) => `${entry.file_path}\u0000${entry.change_type}`) : [];
  criteria.push(result("P9", "No two entries share the same `(file_path, change_type)` pair", "minor", new Set(pairs).size === pairs.length, "Two or more ordered changes share the same file_path and change_type pair."));

  const slice = readMigrationMatrixSlice(artifactPath);
  const coverageEntries = Array.isArray(data.migration_coverage) ? data.migration_coverage : [];
  const coveredPairs = new Set();
  for (const entry of coverageEntries) {
    if (!isObject(entry) || !Array.isArray(entry.site_mappings)) continue;
    for (const mapping of entry.site_mappings) {
      if (isObject(mapping)) coveredPairs.add(`${entry.dependency} ${mapping.file_path}`);
    }
  }
  const uncovered = [];
  for (const entry of slice.matrix || []) {
    if (!isObject(entry) || !Array.isArray(entry.direct_usage_sites)) continue;
    for (const site of entry.direct_usage_sites) {
      if (isObject(site) && !coveredPairs.has(`${entry.dependency} ${site.file_path}`)) {
        uncovered.push(`(${entry.dependency}, ${site.file_path})`);
      }
    }
  }
  criteria.push(result(
    "P10",
    "`migration_coverage` covers every (dependency, usage-site) pair in the migration-matrix slice",
    "critical",
    Array.isArray(data.migration_coverage) && slice.matrix !== undefined && uncovered.length === 0,
    slice.error || (!Array.isArray(data.migration_coverage)
      ? "`migration_coverage` must be an array with one entry per migration-matrix dependency."
      : `Uncovered migration-matrix usage sites: ${uncovered.join(", ")}.`)
  ));

  const changeBySequence = new Map();
  for (const entry of Array.isArray(ordered) ? ordered : []) {
    if (isObject(entry)) changeBySequence.set(String(entry.sequence), entry);
  }
  criteria.push(result(
    "P11",
    "Every `migration_coverage` site mapping cites matching ordered changes or a substantive no_change_reason",
    "critical",
    coverageEntries.every((entry) =>
      isObject(entry) && Array.isArray(entry.site_mappings) && entry.site_mappings.every((mapping) => {
        if (!isObject(mapping) || !hasString(mapping.file_path)) return false;
        if (Array.isArray(mapping.ordered_change_sequences) && mapping.ordered_change_sequences.length > 0) {
          return mapping.ordered_change_sequences.every((sequence) => {
            const change = changeBySequence.get(String(sequence));
            return change !== undefined && change.file_path === mapping.file_path;
          });
        }
        return typeof mapping.no_change_reason === "string" && mapping.no_change_reason.length > 20;
      })
    ),
    "Every migration_coverage site mapping must list ordered_change_sequences that exist in ordered_changes with the same file_path, or carry a no_change_reason > 20 chars."
  ));
  criteria.push(validateArtifactCoverage(data));
  return criteria;
}

function validateTestPlan(data) {
  const criteria = [];
  const cases = data.test_cases;
  const types = new Set(["unit", "integration", "regression", "e2e"]);
  const priorities = new Set(["high", "medium", "low"]);

  criteria.push(result("T1", "`test_cases` is present, is an array, and has at least one entry", "critical", Array.isArray(cases) && cases.length > 0, "`test_cases` must be a non-empty array."));
  criteria.push(result("T2", "Every test case has required fields", "critical", Array.isArray(cases) && cases.every((entry) => isObject(entry) && hasString(entry.id) && hasString(entry.name) && hasString(entry.type) && hasString(entry.target_file) && hasString(entry.what_to_verify) && hasString(entry.expected_behavior)), "One or more test cases is missing id, name, type, target_file, what_to_verify, or expected_behavior."));
  criteria.push(result("T3", "`testing_strategy` is present and non-trivial (> 20 chars)", "critical", typeof data.testing_strategy === "string" && data.testing_strategy.length > 20, "`testing_strategy` must be a non-trivial string."));
  criteria.push(result("T4", "All `type` values are valid enum members", "critical", Array.isArray(cases) && cases.every((entry) => types.has(entry.type)), "One or more test cases has an invalid type."));
  criteria.push(result("T5", "All optional `priority` values are valid enum members", "minor", Array.isArray(cases) && cases.every((entry) => entry.priority === undefined || priorities.has(entry.priority)), "One or more test cases has an invalid priority."));
  criteria.push(result("T6", "`coverage_goals` is present and non-empty", "minor", hasString(data.coverage_goals), "`coverage_goals` must be a non-empty string."));
  criteria.push(result("T7", "At least one test case is a regression test", "minor", Array.isArray(cases) && cases.some((entry) => entry.type === "regression"), "At least one regression test case is required."));
  criteria.push(result("T8", "`framework_recommendations` is present and non-empty", "minor", hasString(data.framework_recommendations), "`framework_recommendations` must be a non-empty string."));
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
  criteria.push(result("E11", "`staged_paths` is present and is a subset of `changes_applied`", "critical", Array.isArray(data.staged_paths) && Array.isArray(data.changes_applied) && data.staged_paths.every((item) => data.changes_applied.includes(item)), "`staged_paths` must be an exact-string subset of `changes_applied`; both hold repo-relative forward-slash paths as printed by `git diff --cached --name-only`, never prose descriptions or plan IDs."));
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
  criteria.push(result("R5", "Every generated test entry has required fields and valid status", "minor", Array.isArray(generated) && generated.every((entry) => isObject(entry) && hasString(entry.test_case_id) && hasString(entry.test_file) && hasString(entry.test_name) && generatedStatuses.has(entry.status)), "One or more generated test entries is missing test_case_id, test_file, test_name, or a valid status."));
  criteria.push(result("R6", "`coverage_notes` is present and non-empty", "minor", hasString(data.coverage_notes), "`coverage_notes` must be a non-empty string."));
  criteria.push(result("R7", "`supplementary_tests` is present with complete entries", "minor", Array.isArray(data.supplementary_tests) && data.supplementary_tests.every((entry) => isObject(entry) && hasString(entry.test_file) && hasString(entry.test_name) && hasString(entry.reason)), "`supplementary_tests` must be an array whose entries have test_file, test_name, and reason."));
  criteria.push(result("R8", "`run_results` reports numeric totals", "minor", isObject(data.run_results) && typeof data.run_results.total === "number" && typeof data.run_results.passing === "number" && typeof data.run_results.failing === "number" && typeof data.run_results.skipped === "number", "`run_results` must be an object with numeric total, passing, failing, and skipped."));
  criteria.push(validateArtifactCoverage(data));
  return criteria;
}

function criteriaFor(type, data, artifactPath) {
  if (type === "analyze") return validateAnalyze(data);
  if (type === "plan") return validatePlan(data, artifactPath);
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
  // A missing artifact is a distinct outcome from a corrupt one: the orchestrator
  // gate halts on MISSING (sub-agent never wrote its artifact) instead of retrying.
  if (!fs.existsSync(artifactPath)) {
    return buildReport(agentType, [
      result("MISSING", "Artifact file exists", "critical", false, `Artifact file not found: ${artifactPath}`)
    ]);
  }

  let parsed;
  try {
    parsed = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  } catch (error) {
    return buildReport(agentType, [
      result("PARSE", "Output is valid JSON", "critical", false, `Could not parse artifact JSON: ${error.message}`)
    ]);
  }

  try {
    return buildReport(agentType, criteriaFor(agentType, parsed, artifactPath));
  } catch (error) {
    return buildReport(agentType, [
      result("TYPE", "Agent type is supported", "critical", false, error.message)
    ]);
  }
}

// With --out <path>, the full report JSON is written to <path> and stdout is a
// single compact line: {decision, confidence_score, report_path[, failed]} —
// enough for gate checks and retry prompts without the report transiting context.
if (require.main === module) {
  const args = process.argv.slice(2);
  const outIndex = args.indexOf("--out");
  let outPath = null;
  if (outIndex !== -1) {
    outPath = args[outIndex + 1];
    args.splice(outIndex, 2);
  }
  const [agentType, artifactPath] = args;
  if (!agentType || !artifactPath || (outIndex !== -1 && !outPath)) {
    console.error("Usage: node validate-upgrade-artifact.js <agent_type> <artifact_path> [--out <report_path>]");
    process.exit(2);
  }

  const report = validate(agentType, artifactPath);
  if (outPath) {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");
    const summary = {
      decision: report.decision,
      confidence_score: report.confidence_score,
      report_path: outPath
    };
    if (report.decision !== "approved") {
      summary.failed = report.criteria_results
        .filter((item) => !item.passed)
        .map((item) => ({ id: item.criterion_id, severity: item.severity, detail: item.detail }));
    }
    console.log(JSON.stringify(summary));
  } else {
    console.log(JSON.stringify(report, null, 2));
  }
  process.exit(report.decision === "approved" ? 0 : 1);
}

module.exports = { validate, criteriaFor, buildReport };
