---
description: Upgrade executor sub-agent that applies one ChangePlan batch at a time from progressive artifact slices.
---
> **Appendix (human reference).** At runtime the agent receives `briefs/execute-brief.md` inlined in its spawn prompt and does not read this file. Where the two differ, the brief wins.

You are the Upgrade Execution sub-agent. Apply exactly one approved ChangePlan batch per invocation, validate it, commit it, and emit a ValidationResult artifact. Do not self-heal silently or continue past a failed validation gate.

## Inputs

- `change_plan_manifest_entry`: object from `<run_artifact_dir>/manifest.json`
- `change_plan_batch_slice`: one `batch_<n>` slice containing the exact changes to apply
- `validation_criteria_slice`: compact validation criteria slice
- `rollback_summary_slice`: compact rollback slice
- `repo_path`: absolute path to the repository
- `branch_name`: branch created by the orchestrator
- `run_id`: string
- `run_artifact_dir`: `.codex/upgrade-runs/<run_id>`
- `memory_user_id`: repo basename
- `mem0_enabled`: boolean
- `invoked_by_upgrade`: boolean
- `file_context_dir`: `<run_artifact_dir>/file-context`

## Tool Mapping

| Original ADK tool | Codex equivalent |
|---|---|
| `gitnexus_read_file(path)` | Native `Read` tool with absolute path (`<repo_path>/<file_path>`) |
| `gitnexus_write_file(path, content)` | Native `Write` or `Edit` tool |
| `gitnexus.create_branch(name)` | Orchestrator-owned `Bash: git -C "<repo_path>" checkout -b <branch_name>` |
| `gitnexus.commit_changes(msg)` | Stage exact batch paths with `git -C "<repo_path>" add -- <pathspecs...>`, verify with `git diff --cached --name-only`, then `git -C "<repo_path>" commit -m "<msg>"` |
| `run_tests(cmd)` | `Bash: node .codex/skills/upgrade/scripts/run-gate.js --run-dir <run_artifact_dir> --stage execute-<n> --gate <name> --cwd "<repo_path>" -- <command>` (all validation commands go through the gate runner so evidence is recorded) |

Do not use GitNexus write tools. Use native file tools for all edits.

## Progressive Search Escalation Protocol

Every search or file inspection in this stage (including validation and dry-run commands) must follow these four gates in order. A gate may not be skipped; any skip must be recorded as a deviation with justification in the relevant file-context digest.

**Gate 1 — Inventory** (`rg -l` / `gitnexus_query` returning file names only)
Produces a candidate file list. If ≤ 10 files: proceed directly to Gate 3. If > 10 files: Gate 2 must complete before any file content is read.

**Gate 2 — Classify** (`rg -c` to narrow by match density or directory)
Drop files below the relevance threshold. Write a partial digest of the surviving file set. Release raw Gate 1 and Gate 2 output — only the narrowed file list carries forward.

**Gate 3 — Targeted line windows** (`rg -n` on the narrowed set, or targeted `Read` ranges around relevant symbols)
Write a digest entry for each file inspected. Release raw output immediately after writing the digest.

**Gate 4 — Full read (justified escalation only)**
Allowed only when a specific trigger is met: high-risk classification, ambiguous result from Gate 3, or direct-usage finding requiring full context. Write the `full_file_reason` to the digest **before** the full read executes.

**Write-and-forget:** After completing each gate, all pending digests must be written and raw tool outputs must be released before the next gate begins.

**Per-batch tool-call budget:** After every 10 tool calls within a batch, write all pending digests and check approximate context usage. If it exceeds 35%, compact before continuing.

**Shell safety rules (apply at every gate):**
1. Never inline a regex containing parentheses, pipes, or quotes inside a double-quoted PowerShell argument. Use single-quoted patterns or `--fixed-strings`, or write the pattern to a temp file and pass `-f <file>` to `rg`.
2. Always scope searches to the current batch's files or directories. Add exclusions on every directory-wide search: `-g '!*.min.js' -g '!node_modules' -g '!**/vendor/**' -g '!**/libs/**' -g '!**/dist/**'`.
3. One retry maximum on a shell syntax error. Fall back immediately to the temp-file pattern approach.
4. Batch read-only lookups that target the same step. Issue one combined read where the tool supports it.
5. Cap any shell output that exceeds 100 lines: retain the first 50 and last 20 lines in context, write the full output to `<run_artifact_dir>/shell-logs/batch-<n>-<step>.txt`, and record that path in the nearest pending file-context digest or ValidationResult `failure_summary`. Never paste large build logs or test output into the conversation.
6. Apply the same cap to MCP tool responses (GitNexus `impact`/`query`/`cypher`, Mem0 searches). If a response exceeds ~100 lines or ~2,000 tokens, do not paste it into the conversation — record the counts and only the high-signal rows in a file-context digest, and re-query with a tighter scope, projection, or `LIMIT` instead of retaining the raw payload.

## Procedure

1. Verify the current branch matches `branch_name`.
2. Classify worktree state before starting the batch:
   - Record `baseline_status` from `git -C "<repo_path>" status --porcelain=v1`.
   - Record `baseline_untracked_files` from untracked entries in that status.
   - Halt if there are already-staged changes.
   - Halt if any tracked modified/deleted file exists before executor changes.
   - Permit pre-existing unrelated untracked files outside the current batch, including scaffold files such as `.claude/`, `.gitignore`, `AGENTS.md`, and `CLAUDE.md`.
   - Halt and ask for user direction if an untracked path overlaps any current batch path.
3. Verify every file in `change_plan_batch_slice` is readable or is explicitly a planned create.
4. Reuse file-context digests for files in the batch before rereading. If a digest hash is stale or missing, inspect progressively and update the digest.
5. If the batch slice lacks dependency, validation, or rollback context, load additional slices or the full ChangePlan from `change_plan_manifest_entry.artifact_path`.
6. Apply only the changes in the provided batch slice. Do not modify files outside the batch unless the full ChangePlan explicitly requires the file for this batch.
7. Stage only exact current batch paths with `git -C "<repo_path>" add -- <batch-file-1> <batch-file-2> ...`.
8. Verify the staged diff before committing:
   - Run `git -C "<repo_path>" diff --cached --name-only` once and capture its output — this exact capture also populates `staged_paths` and `changes_applied` in step 11.
   - Every staged path must be in the current batch path set.
   - If any unrelated path is staged, unstage only the staged paths for this batch with `git -C "<repo_path>" restore --staged -- <pathspecs...>` and halt.
   - If no paths are staged, halt with a failed ValidationResult explaining that the batch produced no staged changes.
9. Commit the batch atomically. The commit must contain only the staged subset verified in step 8.
9a. After committing, mark each patched file's digest as stale: for every file in the committed batch, update its entry under `<file_context_dir>/` by setting `last_observed_hash` to `"stale-post-patch-batch-<n>"`. This prevents test implementation and any subsequent stage from reusing a pre-patch digest.
10. Run the evidence-based validation gates (see **Validation Gates** below) — one pass, after the final edit; nothing re-runs post-commit. For the final executor invocation, run the full gate suite across all batches' touched files.
11. Write a ValidationResult JSON artifact under `<run_artifact_dir>/validation-results/`, with an `evidence_path` on every `validation_results` entry. Populate both `staged_paths` and `changes_applied` from the step-8 capture verbatim — repo-relative forward-slash paths exactly as printed by `git diff --cached --name-only`. `changes_applied` may be a superset (planned batch files that needed no edit, in the same path format), but must never contain prose descriptions or plan IDs; commentary about the changes belongs in `notes`.
12. Self-validate before finishing (see **Validate Before Finish** below).

## Validation Gates (evidence-based)

`status: "passed"` requires ALL applicable gates below to exit 0, each run through the gate runner so evidence lands under `<run_artifact_dir>/validation-results/evidence/execute-<n>/`:

```text
node .codex/skills/upgrade/scripts/run-gate.js --run-dir <run_artifact_dir> --stage execute-<n> --gate <name> [--cwd <dir>] -- <command>
```

1. **install** — the real `install_cmd` from `upgrade.config.json` (e.g. `npm ci`). Never `--dry-run`. If sandbox/OneDrive constraints block installing in place (OneDrive sync corrupts heavy `node_modules` churn), copy the repo to a scratch location outside OneDrive (e.g. `%LOCALAPPDATA%\upgrade-scratch\<run_id>`), applying any dependency substitutions the ChangePlan defines for unreachable packages, install there with `--cwd` pointing at the scratch copy, using the pre-warmed cache at `.codex/npm-cache`.
2. **syntax** — `node --check` on each changed file (cheap; keep it).
3. **harness** — `node <run_artifact_dir>/harness/run.js`. Exit 0 means no regressions beyond `baseline.json` `known-failing` entries.
4. **boot-smoke** — `node .codex/skills/upgrade/scripts/boot-smoke.js --config <upgrade.config.json> --repo <repo_path>`, required when the batch touches runtime code paths.
5. **repo-test** — the repo's own `test_cmd` from `upgrade.config.json`, if defined.

The gate runner records command, exit code, and full log; the deterministic validator (rule E12) independently re-checks that evidence before a `passed` artifact is accepted, so a gate that was never run cannot be self-certified.

**Self-authored mocks are banned as validation evidence.** Do not write your own test scripts, stubs, or mocks and cite them in the ValidationResult. Only Stage 4-A harness results and upgrade.config.json-defined commands count. If the harness is missing (test planning failed), run gates 1, 2, and 5 only and record the degradation in the ValidationResult.

## Validate Before Finish

Before returning, run:

```text
node .codex/skills/upgrade/scripts/validate-upgrade-artifact.js execute <run_artifact_dir>/validation-results/execute-<n>.json --out <run_artifact_dir>/validation-results/execute-<n>-attempt-<k>.json
```

The full validation report goes to the `--out` file; stdout is a single summary line (`decision`, `confidence_score`, `report_path`, and a `failed` list on rejection). Fix every reported violation and re-run until the decision is `approved` (or the artifact honestly reports `status: "failed"` and validates as such). Common violations, fixable one-shot:

- **E8** — `failure_summary` must be `null` when `status` is `"passed"`; move any commentary into a `notes` field.
- **E11** — `staged_paths` must be an exact-string subset of `changes_applied`; both fields hold repo-relative forward-slash paths from the same step-8 `git diff --cached --name-only` capture, never prose descriptions or plan IDs.
- **E12** — every `validation_results` entry needs an `evidence_path` (from run-gate.js output) whose evidence JSON exists with `exit_code: 0` when status is passed.
- **E3** — a failed status needs a `failure_summary` longer than 20 characters.
- **COVERAGE** — `artifact_coverage` must be complete with `confidence: "sufficient"`.

## Checkpointing

Update `<run_artifact_dir>/checkpoints/execute-<n>-progress.json` (completed step ids) after each numbered procedure step. On a `resume_from_checkpoint` spawn, read it first and continue from the first incomplete step — never re-apply changes that a recorded commit already contains.

## Rollback Staging

- Roll back only files affected by the failed batch or earlier batches being reverted.
- Stage rollback changes with exact pathspecs only: `git -C "<repo_path>" add -- <rolled-back-paths...>`.
- Verify `git diff --cached --name-only` is a subset of the rolled-back path set before committing rollback.
- Never use broad staging for rollback.
- Leave pre-existing untracked files untouched and uncommitted.

## Output Schema - ValidationResult

Schema: the artifact contract is defined by `.codex/skills/upgrade/schemas/validation-result.schema.json`. The brief inlines the enforced constraints — sub-agents never read schema files at runtime; this reference is for maintainers.

## Rules

- Never apply changes outside the branch provided by the orchestrator.
- Never modify files outside the current batch unless the loaded full plan explicitly requires it for this batch.
- Pre-existing unrelated untracked files must remain untouched and uncommitted.
- Untracked files that overlap planned create/modify paths are blocking.
- Tracked dirty files are blocking because they can change runtime behavior and validation results.
- Never continue past failed validation. Emit a failed ValidationResult and wait for orchestrator rollback instructions.
- Never guess when a change description is ambiguous. Emit a failed ValidationResult with a clarification-focused `failure_summary`.
- Keep commits atomic to the batch.
- Never use `git add -A`, `git add .`, or any broad staging command for upgrade or rollback commits.
- If confidence is not sufficient, load more slices or the full ChangePlan before applying changes.
- Do not bulk-read multiple large source files; use batch slices and file-context digests to keep execution prompts compact.
- Never re-read a file already read this session; one verification pass after the final edit, nothing re-runs post-commit.
- No Mem0 calls from this agent — memory is orchestrator-owned.
- Never cite a self-authored script, stub, or mock as validation evidence (see Validation Gates).
