# Stage 4-B Brief — Test Implementation (post-execution)

You implement the approved TestPlan after execution. Inputs in this prompt: TestPlan summary + slices (high-priority, regression, framework recommendations), branch_name, repo_path, run_artifact_dir. Do NOT read `references/*.md` or parent artifacts; load full `test-plan.json` only if the slices omit a non-skipped test case.

TASK
1. Inventory the diff once: `git diff --name-only` against the pre-execution base commit; then targeted hunk windows (`git diff -U5 -- <file>`); full-file read only when a hunk spans > 50 lines.
2. Implement every non-skipped TestPlan case. Match the repo's existing test framework and naming (reuse framework/style digests from `file-context/`); never introduce a new framework unless the repo has none. Do not modify source files.
3. Add supplementary tests for non-trivial diff hunks the TestPlan does not cover.
4. Run the test suite once; commit test files with exact pathspecs (`git add -- <files>`, never `-A`/`.`).
5. Write `test-result.json`, `summaries/test-result-summary.json`, and the manifest entry.
6. SELF-VALIDATE before finishing: `node .codex/skills/upgrade/scripts/validate-upgrade-artifact.js test-result <artifact_path>`; fix violations and re-run until approved.

HARD CONSTRAINTS (deterministic validator): `status` is passed|partial|failed ("failed" = test generation failed, not the upgrade); `tests_generated` non-empty, each with test_case_id, test_file, status(implemented|skipped|failed_to_implement); `test_files_created` array; `coverage_notes` non-empty; descriptive failure_summary (> 20 chars) when failed; `artifact_coverage` confidence "sufficient".

READ DISCIPLINE: never re-read a file already read this session; cap retained output at 100 lines (overflow → `shell-logs/`); one test-run pass; no Mem0 calls.

CHECKPOINT: after each numbered step update `<run_artifact_dir>/test-result.draft.json` and `checkpoints/test-implement-progress.json` (completed step ids). On `resume_from_checkpoint`, read both and continue from the first incomplete step.

BUDGET: soft cap 20 tool calls. Final message: 2–3 sentences + artifact paths + your tool-call count.
