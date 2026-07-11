# Stage 4-B Brief — Test Implementation (post-execution)

You implement the approved TestPlan after execution. Inputs in this prompt: TestPlan summary + slices (high-priority, regression, framework recommendations), `slices/execute-*-signature-changes.json` paths, branch_name, repo_path, run_artifact_dir. Do NOT read `references/*.md` or parent artifacts; load full `test-plan.json` only if the slices omit a non-skipped test case.

TASK
1. Inventory the diff once (`git diff --name-only` vs the pre-execution base; targeted `git diff -U5 -- <file>` windows; full read only when a hunk spans >50 lines) AND read the signature-changes slices. Where a target symbol's signature changed, implement against the NEW signature; note it in `coverage_notes`.
2. Implement every `action: "write"` case as a SIMPLE test of its io_spec (inputs → expected output against the module's exported contract):
   - Use the repo's existing framework and naming (reuse `file-context/` digests); if the repo has none, install one ecosystem-standard framework as a dev-dependency (Node → vitest/jest; Python → pytest; Java → JUnit).
   - When a case needs a real service interaction (e.g. API test against a database), use the stack's standard in-memory/embedded test library (e.g. mongodb-memory-server for a Mongo project — follow the project's stack, never assume a technology), installed as a dev-dependency.
   - Isolation only via the framework's standard mocking utilities. BANNED: hand-rolled fakes of dependencies, module-loader interception, any assertion on the argument shape or call convention into an upgraded dependency.
   - Record `action: "skip"` cases (sufficient existing coverage) as skipped with reason. Never modify source files.
3. Add supplementary tests for non-trivial diff hunks the TestPlan does not cover.
4. Run the full suite once; commit test files PLUS package manifest/lockfile changes with exact pathspecs (`git add -- <files>`, never `-A`/`.`).
5. Write `test-result.json` (`dependencies_added`: [{name, version, dev}], empty if none; `failure_origin` when status is partial/failed — mirror status + failure_origin into the summary), `summaries/test-result-summary.json`, manifest entry.
6. SELF-VALIDATE: `node .codex/skills/upgrade/scripts/validate-upgrade-artifact.js test-result <artifact_path> --out <run_artifact_dir>/validation-results/test-result-<attempt>.json` (report to file; stdout one summary line); fix and re-run until approved.

PATCH-AND-RECOVER: when a new test fails, diagnose before reporting. If the test is wrong (bad post-upgrade API assumption — cross-check the signature-changes slices), fix the TEST CODE ONLY and re-run just that test — max 2 patch attempts per failing test; never modify source. If the failure traces to the source change itself, set `failure_origin: "source_change"` so the orchestrator routes it to an executor patch invocation.

HARD CONSTRAINTS (validator): `status` passed|partial|failed ("failed" = test generation failed, not the upgrade); `tests_generated` non-empty, each with test_case_id, test_file, test_name, status(implemented|skipped|failed_to_implement); `supplementary_tests` array (test_file, test_name, reason; empty ok); `run_results` numeric total/passing/failing/skipped; `test_files_created` array; `dependencies_added` array of {name, version, dev} (empty ok); optional `failure_origin` generated_test|source_change|environment; `coverage_notes` non-empty; failure_summary >20 chars when failed; `artifact_coverage` confidence "sufficient".

READ DISCIPLINE: never re-read a file already read; retained output ≤100 lines (overflow → `shell-logs/`); one full test-run pass (patch re-runs scoped to the failing test); no Mem0.
CHECKPOINT: after each step update `test-result.draft.json` + `checkpoints/test-implement-progress.json`; on `resume_from_checkpoint` continue from first incomplete step.
BUDGET: soft cap 25 tool calls (installs + test runs + patches included). Final message: 2–3 sentences + artifact paths + tool-call count.
