# Stage 3 Brief — Batch Execution

You are the executor. Apply exactly ONE ChangePlan batch. Inputs in this prompt: `batch_<n>` slice, validation_criteria slice, rollback_summary slice, upgrade.config.json content, repo_path, branch_name, run_artifact_dir. Do NOT read `references/*.md` or schema files; load `change-plan.json` only if dependency ordering or rollback safety requires it.

PROCEDURE
1. Preflight once: `node .codex/skills/upgrade/scripts/repo-status.js --repo <repo_path> --run-dir <run_artifact_dir>`. Verify branch = branch_name; halt on staged or tracked-dirty files; record baseline_status/baseline_untracked_files from its output.
2. Apply only this batch's changes. Reuse file-context digests; targeted `rg -n -C 3` windows; full read only when rewriting a file wholesale.
3. ONE verification pass, after the final edit; nothing re-runs post-commit. Run every gate via:
   `node .codex/skills/upgrade/scripts/run-gate.js --run-dir <run_artifact_dir> --stage execute-<n> --gate <name> [--cwd <dir>] -- <cmd>`
   Gates: (a) install — real `install_cmd`, never `--dry-run`; if OneDrive/sandbox blocks it, install in a scratch copy outside OneDrive with cache `.codex/npm-cache`; (b) syntax — `node --check` per changed file; (c) harness — `node <run_artifact_dir>/harness/run.js`; (d) boot-smoke (if batch touches runtime paths) — `scripts/boot-smoke.js --config <config> --repo <repo_path>`; (e) repo `test_cmd` if defined.
   BANNED: citing self-written test/mock scripts as evidence. Only harness + config-defined commands count.
4. Stage exact pathspecs (`git -C <repo_path> add -- <files>`); verify `git diff --cached --name-only` ⊆ batch paths; commit atomically; mark patched digests stale.
5. Write `validation-results/execute-<n>.json`; every validation_results entry carries the `evidence_path` printed by run-gate. `status: "passed"` requires ALL gates exit 0 (harness excludes baseline known-failing itself).
6. SELF-VALIDATE: `node .codex/skills/upgrade/scripts/validate-upgrade-artifact.js execute <path>`; fix and re-run until approved. Common: E8 failure_summary null when passed (move text to `notes`); E11 staged_paths ⊆ changes_applied; E12 evidence_path on every entry when passed.

On gate failure: write `status: "failed"` + failure_summary (>20 chars) and stop — never roll back yourself, never continue past a failed gate, never guess on ambiguity.

DISCIPLINE: never re-read a file already read; retained output ≤100 lines (overflow → `shell-logs/`); no Mem0.
CHECKPOINT: update `checkpoints/execute-<n>-progress.json` after each step; on `resume_from_checkpoint` continue from first incomplete step, never re-apply committed changes.
BUDGET: soft cap 30 tool calls. Final message: 2–3 sentences + artifact path + tool-call count.
